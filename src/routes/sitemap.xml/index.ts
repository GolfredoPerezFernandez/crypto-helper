import type { RequestHandler } from "@builder.io/qwik-city";

const LOCALES = ["en-us", "es-es"] as const;
const PUBLIC_PATHS = [
  "/",
  "/home/",
  "/tokens/",
  "/nfts/",
  "/top-traders/",
  "/alerts/",
  "/docs/",
  "/privacy/",
  "/terms/",
  "/bubbles/",
  "/trending-coins/",
  "/ai-coins/",
  "/meme-coins/",
  "/gaming-coins/",
  "/earlybird-coins/",
  "/most-visit-coins/",
  "/volume-coins/",
  "/whale-alert/",
] as const;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const onGet: RequestHandler = async ({ send, headers, url, cacheControl }) => {
  const origin = process.env.PUBLIC_APP_URL || process.env.ORIGIN || url.origin;
  const entries: string[] = [];
  const lastMod = new Date().toISOString();

  for (const locale of LOCALES) {
    for (const routePath of PUBLIC_PATHS) {
      const href = `${origin}/${locale}${routePath}`;
      entries.push(
        `<url><loc>${xmlEscape(href)}</loc><lastmod>${lastMod}</lastmod><changefreq>daily</changefreq></url>`,
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  cacheControl({
    public: true,
    maxAge: 60 * 60,
    staleWhileRevalidate: 60 * 60 * 24,
  });
  headers.set("Content-Type", "application/xml; charset=utf-8");
  send(200, xml);
};
