import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../../layout";
import { SmartSignalFeed } from "~/components/crypto-dashboard/smart-signal-feed";
import { querySmartSignalsWithAddresses } from "~/server/crypto-ghost/market-queries";
import { useRequirePro } from "../use-require-pro";

export const useSmartLoader = routeLoader$(async () => querySmartSignalsWithAddresses(20));

export default component$(() => {
  useRequirePro();
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const loaded = useSmartLoader();
  const initial = (loaded.value ?? []) as Record<string, unknown>[];

  return (
    <SmartSignalFeed
      title="Smart alerts"
      subtitle={
        showSync ? (
          <>Watcher de USDT en Ethereum mainnet. Resúmenes guardados en el servidor.</>
        ) : (
          <>Alertas USDT en mainnet. Resúmenes guardados en el servidor.</>
        )
      }
      initialItems={initial}
      maxItems={30}
    />
  );
});
