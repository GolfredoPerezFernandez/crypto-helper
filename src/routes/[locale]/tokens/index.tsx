import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { useDashboardAuth } from "../layout";
import { clampLimit, queryMarketTokens } from "~/server/crypto-helper/market-queries";

export const head: DocumentHead = {
  title: "Todos los tokens | Panel",
};

export const useAllTokensLoader = routeLoader$(async () => {
  return queryMarketTokens({ category: null, limit: clampLimit(500, 500), offset: 0 });
});

export default component$(() => {
  useDashboardAuth();
  const rows = useAllTokensLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const list = rows.value as Record<string, unknown>[];

  return (
    <CategoryTokenTable
      locale={L}
      title="Todos los tokens"
      subtitle="Hasta 500 filas de todas las categorías. Busca, filtra por categoría y red, ordena y abre la ficha del token."
      rows={list}
      showCategoryFilter
      emptyHint="No hay tokens en el listado todavía. Vuelve más tarde."
    />
  );
});
