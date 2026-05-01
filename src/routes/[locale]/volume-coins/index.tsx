import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { desc, eq } from "drizzle-orm";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { db } from "~/lib/turso";
import { cachedMarketTokens } from "../../../../drizzle/schema";

export const head: DocumentHead = {
  title: "Mayor volumen | Panel",
};

export const useVolumeLoader = routeLoader$(async () => {
  try {
    return await db
      .select()
      .from(cachedMarketTokens)
      .where(eq(cachedMarketTokens.category, "volume"))
      .orderBy(desc(cachedMarketTokens.updatedAt))
      .limit(300)
      .all();
  } catch (e) {
    console.error("[useVolumeLoader]", e);
    return [];
  }
});

export default component$(() => {
  const rows = useVolumeLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  return (
    <CategoryTokenTable
      locale={L}
      title="Mayor volumen"
      subtitle="Tokens ordenados por volumen en 24 horas."
      rows={rows.value as unknown as Record<string, unknown>[]}
    />
  );
});
