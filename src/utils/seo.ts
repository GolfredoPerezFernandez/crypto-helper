import type { DocumentHeadValue } from "@builder.io/qwik-city";

type BuildSeoInput = {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string;
  type?: "website" | "article";
  locale?: string;
  noindex?: boolean;
};

function normalizeLocale(locale: string | undefined): string {
  const raw = String(locale || "en-us").trim().toLowerCase();
  if (!raw) return "en-us";
  return raw;
}

function toOgLocale(locale: string): string {
  const normalized = normalizeLocale(locale);
  if (normalized === "es-es") return "es_ES";
  if (normalized === "en-us") return "en_US";
  return normalized.replace("-", "_");
}

export function localeFromParams(params: Record<string, string | undefined>): string {
  return normalizeLocale(params.locale);
}

export function buildSeo(input: BuildSeoInput): DocumentHeadValue {
  const {
    title,
    description,
    canonicalUrl,
    imageUrl = "/favicon.svg",
    type = "website",
    locale = "en-us",
    noindex = false,
  } = input;

  const ogLocale = toOgLocale(locale);
  const robots = noindex ? "noindex,nofollow,noarchive" : "index,follow,max-image-preview:large";

  return {
    title,
    meta: [
      { name: "description", content: description },
      { name: "robots", content: robots },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: canonicalUrl },
      { property: "og:locale", content: ogLocale },
      { property: "og:image", content: imageUrl },
      { property: "og:site_name", content: "Crypto Helper" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
    ],
    links: [{ rel: "canonical", href: canonicalUrl }],
  };
}
