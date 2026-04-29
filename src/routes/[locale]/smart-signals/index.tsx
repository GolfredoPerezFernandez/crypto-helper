import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { SmartSignalFeed } from "~/components/crypto-dashboard/smart-signal-feed";
import { querySmartSignalsWithAddresses } from "~/server/crypto-ghost/market-queries";
import { getUserProAccess } from "~/server/crypto-ghost/user-access";
import { verifyAuth } from "~/utils/auth";

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

export const useSmartLoader = routeLoader$(async () => querySmartSignalsWithAddresses(20));

export default component$(() => {
  useRequirePro();
  const loaded = useSmartLoader();
  const initial = (loaded.value ?? []) as Record<string, unknown>[];

  return (
    <SmartSignalFeed
      title="Smart alerts"
      subtitle={<>Alertas USDT en mainnet. Resumenes guardados en el servidor.</>}
      initialItems={initial}
      maxItems={30}
    />
  );
});
