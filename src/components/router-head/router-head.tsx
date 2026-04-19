import { useDocumentHead, useLocation } from "@builder.io/qwik-city";

import { component$ } from "@builder.io/qwik";
import * as pwaHead from "@qwikdev/pwa/head";

/**
 * The RouterHead component is placed inside of the document `<head>` element.
 */
export const RouterHead = component$(() => {
  const head = useDocumentHead();
  const loc = useLocation();

  return (
    <>
      <title>{head.title}</title>
      <link rel="canonical" href={loc.url.href} />
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
      {head.links.map((l) => (
        <link key={l.key} {...l} />
      ))}
      {head.styles.map((s) => {
        const { dangerouslySetInnerHTML: _ignoreStyle, ...rest } = (s.props || {}) as Record<string, any>;
        return <style key={s.key} {...rest} dangerouslySetInnerHTML={s.style} />;
      })}
      {head.scripts.map((s) => {
        const { dangerouslySetInnerHTML: _ignoreScript, ...rest } = (s.props || {}) as Record<string, any>;
        return <script key={s.key} {...rest} dangerouslySetInnerHTML={s.script} />;
      })}
    </>
  );
});
