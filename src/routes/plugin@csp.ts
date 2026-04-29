import type { RequestHandler } from "@builder.io/qwik-city";
import { isDev } from "@builder.io/qwik";
import { randomBytes } from "node:crypto";

/**
 * CSP for SSR (see https://qwik.dev/docs/advanced/content-security-policy/).
 * - `event.sharedMap.set("@nonce", nonce)` lets Qwik City inject the same nonce on SSR script tags.
 * - Custom inline `<script>` tags must use `nonce={useServerData("nonce")}`.
 * - Third-party chart iframes need explicit hosts in `frame-src` (nonce only applies to your own frames).
 */
export const onRequest: RequestHandler = (event) => {
  if (isDev) return;

  // CSP nonce must be unpredictable per request.
  const nonce = randomBytes(16).toString("base64");
  // Qwik internal key for SSR scripts + optional key for custom consumers.
  event.sharedMap.set("@nonce", nonce);
  event.sharedMap.set("nonce", nonce);

  const frameAllow = [
    "'self'",
    "https://*.tradingview.com",
    "https://www.tradingview.com",
    "https://s.tradingview.com",
    "https://*.tradingview-widget.com",
    "https://dexscreener.com",
    "https://*.dexscreener.com",
  ].join(" ");

  const csp = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'self'`,
    `form-action 'self'`,
    `font-src 'self' https: data:`,
    `img-src 'self' data: https: *.tile.openstreetmap.org *.arcgisonline.com`,
    `connect-src 'self' https: wss: *.tile.openstreetmap.org *.arcgisonline.com`,
    // Nonce + strict-dynamic for script execution.
    `script-src 'self' https: 'nonce-${nonce}' 'strict-dynamic'`,
    // Qwik/Tailwind and 3rd-party styles may require inline styles.
    `style-src 'self' 'unsafe-inline' https:`,
    `frame-src ${frameAllow}`,
    // Avoid inline event handlers as an extra hardening layer.
    `script-src-attr 'none'`,
  ];

  event.headers.set("Content-Security-Policy", csp.join("; "));
};
