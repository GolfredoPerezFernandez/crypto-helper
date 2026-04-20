import type { RequestHandler } from "@builder.io/qwik-city";
import { isDev } from "@builder.io/qwik/build";

/**
 * CSP for SSR (see https://qwik.dev/docs/advanced/content-security-policy/).
 * - `event.sharedMap.set("@nonce", nonce)` lets Qwik City inject the same nonce on SSR script tags.
 * - Custom inline `<script>` tags must use `nonce={useServerData("nonce")}`.
 * - Third-party chart iframes need explicit hosts in `frame-src` (nonce only applies to your own frames).
 */
export const onRequest: RequestHandler = (event) => {
    if (isDev) return;

    const nonce = Date.now().toString(36);
    event.sharedMap.set("@nonce", nonce);

    const frameAllow =
        `'self' 'nonce-${nonce}' https://*.tradingview.com https://www.tradingview.com https://s.tradingview.com https://*.tradingview-widget.com https://dexscreener.com https://*.dexscreener.com`;

    const csp = [
        `default-src 'self' 'unsafe-inline'`,
        `font-src 'self' https: data:`,
        `img-src 'self' 'unsafe-inline' data: https: *.tile.openstreetmap.org *.arcgisonline.com`,
        `script-src 'self' 'unsafe-inline' https: 'nonce-${nonce}' 'strict-dynamic'`,
        `style-src 'self' 'unsafe-inline' https:`,
        `frame-src ${frameAllow}`,
        `object-src 'none'`,
        `base-uri 'self'`,
        `connect-src 'self' https: wss: *.tile.openstreetmap.org *.arcgisonline.com`,
    ];

    event.headers.set("Content-Security-Policy", csp.join("; "));
};
