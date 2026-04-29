import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

/** Legacy path → canonical top-traders-swaps */
export const useWalletsSwapsAlias = routeLoader$((ev) => {
  const L = ev.params.locale || "en-us";
  throw ev.redirect(302, `/${L}/top-traders-swaps/`);
});

export default component$(() => {
  useWalletsSwapsAlias();
  return <p class="text-gray-500">Redirecting…</p>;
});
