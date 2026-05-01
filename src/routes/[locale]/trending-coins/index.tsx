import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../layout";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { queryTrendingOrFallback } from "~/server/crypto-helper/market-queries";

export const head: DocumentHead = {
  title: "Trending | Dashboard",
};

export const useTrendingLoader = routeLoader$(async () => queryTrendingOrFallback(300));

export default component$(() => {
  useDashboardAuth();
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
          ? "Mostramos los mayores movimientos en 7d del listado de volumen (mismo universo de tokens)."
          : "Tokens con mayor movimiento reciente."
      }
      rows={rows as unknown as Record<string, unknown>[]}
      emptyHint="No hay datos en esta vista todavía. Vuelve más tarde."
    />
  );
});
