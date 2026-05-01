import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

/** @deprecated Use `/[locale]/alerts/?feed=whales`. */
export const useWhalesSignalsRedirect = routeLoader$((ev) => {
  const L = ev.params.locale || "en-us";
  throw ev.redirect(302, `/${L}/alerts/?feed=whales`);
});

export default component$(() => {
  useWhalesSignalsRedirect();
  return (
    <p class="text-sm text-slate-500" aria-live="polite">
      Redirecting…
    </p>
  );
});
