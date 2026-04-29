import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useOverviewAlias = routeLoader$((ev) => {
  const L = ev.params.locale || "en-us";
  throw ev.redirect(302, `/${L}/home/`);
});

export default component$(() => {
  useOverviewAlias();
  return <p class="text-gray-500">Redirecting…</p>;
});
