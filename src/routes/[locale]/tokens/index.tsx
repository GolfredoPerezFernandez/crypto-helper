import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { useDashboardAuth } from "../layout";
import { clampLimit, queryMarketTokens } from "~/server/crypto-helper/market-queries";
import { buildSeo, localeFromParams } from "~/utils/seo";

export const head: DocumentHead = ({ url, params }) =>
  buildSeo({
    title: "All Crypto Tokens and Market Data | Crypto Helper",
    description:
      "Browse up to 500 crypto assets with filters by category and network, sortable market metrics, and quick access to each token profile.",
    canonicalUrl: url.href,
    locale: localeFromParams(params),
  });

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
