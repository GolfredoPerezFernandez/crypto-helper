import { routeLoader$ } from "@builder.io/qwik-city";
import { verifyAuth } from "~/utils/auth";
import { getUserProAccess } from "~/server/crypto-helper/user-access";

/** Redirects to login or home with ?pro=required if the user lacks Pro (subscriber or admin). */
export const useRequirePro = routeLoader$(async (ev) => {
  const L = ev.params.locale || "en-us";
  if (!(await verifyAuth(ev))) {
    const next = encodeURIComponent(ev.url.pathname + ev.url.search);
    throw ev.redirect(302, `/${L}/login/?next=${next}&session=required`);
  }
  const { hasPro } = await getUserProAccess(ev);
  if (!hasPro) {
    throw ev.redirect(302, `/${L}/home/?pro=required`);
  }
  return { ok: true as const };
});
