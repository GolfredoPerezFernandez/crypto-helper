import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../layout";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { queryMostVisitedOrFallback } from "~/server/crypto-ghost/market-queries";

export const head: DocumentHead = {
  title: "Most visited | Dashboard",
};

export const useMostVisitLoader = routeLoader$(async () => queryMostVisitedOrFallback(300));

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const pack = useMostVisitLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const { rows, usedFallback } = pack.value;
  return (
    <CategoryTokenTable
      locale={L}
      title="Most visited"
      subtitle={
        usedFallback
          ? "El ranking “más visitados” no está disponible en este plan — mostramos los tokens con mayor volumen 24h del board (aproximación de popularidad)."
          : "Ranking de tokens más visitados (datos en caché)."
      }
      rows={rows as unknown as Record<string, unknown>[]}
      emptyHint={
        showSync
          ? "No volume data yet — run a full market sync from the dashboard home."
          : "No hay datos de volumen todavía. Vuelve más tarde."
      }
    />
  );
});
