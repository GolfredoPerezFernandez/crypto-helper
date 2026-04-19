import { component$ } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LiveDexSignalFeed } from "~/components/crypto-dashboard/live-dex-signal-feed";
import { queryTraderSignals } from "~/server/crypto-ghost/market-queries";
import { useRequirePro } from "../use-require-pro";

export const useTradersLoader = routeLoader$(async () => queryTraderSignals(100));

export default component$(() => {
  useRequirePro();
  const loaded = useTradersLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const initial = (loaded.value ?? []) as Record<string, unknown>[];

  return (
    <LiveDexSignalFeed
      title="Trader signals"
      subtitle="Señales de traders y smart money en tiempo casi real."
      locale={L}
      initialItems={initial}
      streamPath="/api/stream/traders"
      eventName="new-message"
    />
  );
});
