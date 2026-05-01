import { useDocumentHead, useLocation } from "@builder.io/qwik-city";

import { component$ } from "@builder.io/qwik";
import * as pwaHead from "@qwikdev/pwa/head";

/**
 * The RouterHead component is placed inside of the document `<head>` element.
 */
export const RouterHead = component$(() => {
  const head = useDocumentHead();
  const loc = useLocation();
  const canonicalLink = head.links.find((l) => l.rel === "canonical");
  const canonicalHref = canonicalLink?.href || loc.url.href;

  return (
    <>
      <title>{head.title}</title>
      <link rel="canonical" href={canonicalHref} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {head.meta.map((m) => (
        <meta key={m.key} {...m} />
      ))}
      {pwaHead.meta.map((m) => (
        <meta key={m.key} {...m} />
      ))}
      {pwaHead.links.map((l) => (
        <link key={l.key} {...l} />
      ))}
      {head.links.filter((l) => l.rel !== "canonical").map((l) => (
        <link key={l.key} {...l} />
      ))}
      {head.styles.map((s) => (
        <style key={s.key} dangerouslySetInnerHTML={s.style} />
      ))}
      {head.scripts.map((s) => (
        <script key={s.key} dangerouslySetInnerHTML={s.script} />
      ))}
    </>
  );
});
