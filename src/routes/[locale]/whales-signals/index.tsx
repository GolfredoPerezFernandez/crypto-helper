import { component$ } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LiveDexSignalFeed } from "~/components/crypto-dashboard/live-dex-signal-feed";
import { queryWhaleSignals } from "~/server/crypto-ghost/market-queries";
import { useRequirePro } from "../use-require-pro";

export const useWhalesLoader = routeLoader$(async () => queryWhaleSignals(100));

export default component$(() => {
  useRequirePro();
  const loaded = useWhalesLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const initial = (loaded.value ?? []) as Record<string, unknown>[];

  return (
    <LiveDexSignalFeed
      title="Whale signals"
      subtitle="Alertas de ballenas en tiempo casi real."
      locale={L}
      initialItems={initial}
      streamPath="/api/stream/whales"
      eventName="new-message"
    />
  );
});
