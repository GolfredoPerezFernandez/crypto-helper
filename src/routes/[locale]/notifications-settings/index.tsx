import { component$ } from "@builder.io/qwik";
import { LiveSignalsPushSettings } from "~/components/push/live-signals-push-settings";
import { PriceAlertsSettings } from "~/components/push/price-alerts-settings";
import { useDashboardAuth } from "../layout";

export default component$(() => {
  const dash = useDashboardAuth();
  const hasPro = dash.value.hasPro;

  return (
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-bold text-white">Notifications</h1>
        <p class="mt-2 text-sm text-slate-400">
          Web Push (PWA) works on Android, Windows, desktop Chrome/Edge, and iOS 16.4+ after Add to Home Screen.
          Enable push on this device, then choose which alerts you want. Live signals use the same pipeline as the
          dashboard; Pro can add USD price rules checked after each market sync.
        </p>
      </div>
      <LiveSignalsPushSettings />
      {hasPro ? (
        <section class="space-y-3">
          <h2 class="text-lg font-semibold text-white">Price alerts (Pro)</h2>
          <PriceAlertsSettings />
        </section>
      ) : (
        <p class="text-sm text-slate-500 max-w-lg">
          <span class="text-slate-400">Pro:</span> subscribe to set USD thresholds per token and get push when the
          cached price crosses them (evaluated after CMC sync).
        </p>
      )}
    </div>
  );
});
