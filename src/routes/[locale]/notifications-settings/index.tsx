import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

/** @deprecated Use `/[locale]/alerts/` — preserves query string (e.g. ?token= for price alerts). */
export const useNotificationsSettingsRedirect = routeLoader$((ev) => {
  const L = ev.params.locale || "en-us";
  const target = new URL(`/${L}/alerts/`, ev.url.origin);
  ev.url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  throw ev.redirect(302, target.pathname + target.search);
});

export default component$(() => {
  useNotificationsSettingsRedirect();
  return (
    <p class="text-sm text-slate-500" aria-live="polite">
      Redirecting to alerts…
    </p>
  );
});
