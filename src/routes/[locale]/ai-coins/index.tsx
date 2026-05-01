import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { desc, eq } from "drizzle-orm";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { db } from "~/lib/turso";
import { cachedMarketTokens } from "../../../../drizzle/schema";

export const head: DocumentHead = {
  title: "IA y big data | Panel",
};

export const useAiLoader = routeLoader$(async () => {
  try {
    return await db
      .select()
      .from(cachedMarketTokens)
      .where(eq(cachedMarketTokens.category, "ai-big-data"))
      .orderBy(desc(cachedMarketTokens.updatedAt))
      .limit(300)
      .all();
  } catch (e) {
    console.error("[useAiLoader]", e);
    return [];
  }
});

export default component$(() => {
  const rows = useAiLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";

  return (
    <CategoryTokenTable
      locale={L}
      title="IA y big data"
      subtitle="Tokens de IA y big data — mismas herramientas de búsqueda y filtros."
      rows={rows.value as unknown as Record<string, unknown>[]}
      emptyHint="No hay tokens de esta categoría todavía. Vuelve más tarde."
    />
  );
});
