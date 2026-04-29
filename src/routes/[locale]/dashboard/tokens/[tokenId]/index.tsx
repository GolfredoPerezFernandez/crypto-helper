import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

/** Legacy /dashboard/tokens/:id → canonical /token/:id */
export const useTokensIdAlias = routeLoader$((ev) => {
  const L = ev.params.locale || "en-us";
  const id = ev.params.tokenId;
  if (!id) throw ev.error(404, { message: "Missing token id" });
  throw ev.redirect(302, `/${L}/token/${encodeURIComponent(id)}/`);
});

export default component$(() => {
  useTokensIdAlias();
  return <p class="text-gray-500">Redirecting…</p>;
});
