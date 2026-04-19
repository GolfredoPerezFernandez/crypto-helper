import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useDashboardIndexRedirect = routeLoader$((ev) => {
  const loc = ev.params.locale || "en-us";
  throw ev.redirect(302, `/${loc}/dashboard/home/`);
});

export default component$(() => {
  useDashboardIndexRedirect();
  return <div class="text-gray-400">Redirecting…</div>;
});
