import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { useDashboardAuth } from "../layout";
import { clampLimit, queryMarketTokens } from "~/server/crypto-ghost/market-queries";

export const head: DocumentHead = {
  title: "All tokens | Dashboard",
};

export const useAllTokensLoader = routeLoader$(async () => {
  return queryMarketTokens({ category: null, limit: clampLimit(500, 500), offset: 0 });
});

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const rows = useAllTokensLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const list = rows.value as Record<string, unknown>[];

  return (
    <CategoryTokenTable
      locale={L}
      title="All tokens"
      subtitle="Up to 500 rows across every board (memes, volume, AI, gaming, …). Search, filter by board and network, sort, then open the full token page."
      rows={list}
      showCategoryFilter
      emptyHint={
        showSync
          ? "Aún no hay tokens — ejecuta la sincronización desde el resumen del panel."
          : "No hay tokens en la base todavía. Vuelve más tarde."
      }
    />
  );
});
