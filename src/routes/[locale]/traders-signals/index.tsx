import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

/** @deprecated Use `/[locale]/alerts/?feed=traders`. */
export const useTradersSignalsRedirect = routeLoader$((ev) => {
  const L = ev.params.locale || "en-us";
  throw ev.redirect(302, `/${L}/alerts/?feed=traders`);
});

export default component$(() => {
  useTradersSignalsRedirect();
  return (
    <p class="text-sm text-slate-500" aria-live="polite">
      Redirecting…
    </p>
  );
});
