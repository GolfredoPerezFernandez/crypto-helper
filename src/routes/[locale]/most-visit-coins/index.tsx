import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { queryMostVisitedOrFallback } from "~/server/crypto-helper/market-queries";

export const head: DocumentHead = {
  title: "Más visitados | Panel",
};

export const useMostVisitLoader = routeLoader$(async () => queryMostVisitedOrFallback(300));

export default component$(() => {
  const pack = useMostVisitLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const { rows, usedFallback } = pack.value;
  return (
    <CategoryTokenTable
      locale={L}
      title="Más visitados"
      subtitle={
        usedFallback
          ? "Mostramos los tokens con mayor volumen en 24 h como referencia de actividad."
          : "Ranking de tokens más visitados."
      }
      rows={rows as unknown as Record<string, unknown>[]}
      emptyHint="No hay datos para mostrar todavía. Vuelve más tarde."
    />
  );
});
