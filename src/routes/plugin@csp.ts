import type { RequestHandler } from "@builder.io/qwik-city";
import { isDev } from "@builder.io/qwik/build";

export const onRequest: RequestHandler = event => {
    if (isDev) return; // Will not return CSP headers in dev mode
    const nonce = Date.now().toString(36); // Your custom nonce logic here
    event.sharedMap.set("@nonce", nonce);
    const csp = [
        `default-src 'self' 'unsafe-inline'`,
        `font-src 'self' https: data:`,
        `img-src 'self' 'unsafe-inline' data: https: *.tile.openstreetmap.org *.arcgisonline.com`,
        `script-src 'self' 'unsafe-inline' https: 'nonce-${nonce}' 'strict-dynamic'`,
        `style-src 'self' 'unsafe-inline' https:`,
        `frame-src 'self' 'nonce-${nonce}'`,
        `object-src 'none'`,
        `base-uri 'self'`,
        `connect-src 'self' https: wss: *.tile.openstreetmap.org *.arcgisonline.com`, // Allow connections to external APIs and websockets
    ];

    event.headers.set("Content-Security-Policy", csp.join("; "));
};
