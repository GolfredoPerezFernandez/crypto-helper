import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

/** Earlybird traders (legacy route) → new listings board */
export const useTopTradersEarlybirdAlias = routeLoader$((ev) => {
  const L = ev.params.locale || "en-us";
  throw ev.redirect(302, `/${L}/earlybird-coins/`);
});

export default component$(() => {
  useTopTradersEarlybirdAlias();
  return <p class="text-gray-500">Redirecting…</p>;
});
