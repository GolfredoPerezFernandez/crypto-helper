import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../layout";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { queryTrendingOrFallback } from "~/server/crypto-ghost/market-queries";

export const head: DocumentHead = {
  title: "Trending | Dashboard",
};

export const useTrendingLoader = routeLoader$(async () => queryTrendingOrFallback(300));

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const pack = useTrendingLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const { rows, usedFallback } = pack.value;
  return (
    <CategoryTokenTable
      locale={L}
      title="Trending"
      subtitle={
        usedFallback
          ? "Ranking “trending” no disponible en este plan — mostramos los mayores movimientos 7d del board de volumen (mismo dataset)."
          : "Resumen de ganadores / perdedores trending."
      }
      rows={rows as unknown as Record<string, unknown>[]}
      emptyHint={
        showSync
          ? "Sin datos de volumen aún — ejecuta la sincronización desde el resumen del panel."
          : "No hay datos de volumen todavía. Vuelve más tarde."
      }
    />
  );
});
