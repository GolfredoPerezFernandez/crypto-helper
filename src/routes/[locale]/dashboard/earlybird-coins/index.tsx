import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { desc, eq } from "drizzle-orm";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { db } from "~/lib/turso";
import { cachedMarketTokens } from "../../../../../drizzle/schema";

export const head: DocumentHead = {
  title: "New listings | Dashboard",
};

export const useEarlybirdLoader = routeLoader$(async () => {
  try {
    return await db
      .select()
      .from(cachedMarketTokens)
      .where(eq(cachedMarketTokens.category, "earlybird"))
      .orderBy(desc(cachedMarketTokens.updatedAt))
      .limit(300)
      .all();
  } catch (e) {
    console.error("[useEarlybirdLoader]", e);
    return [];
  }
});

export default component$(() => {
  const rows = useEarlybirdLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  return (
    <CategoryTokenTable
      locale={L}
      title="New listings"
      subtitle="Listados recientes (nuevas altcoins)."
      rows={rows.value as unknown as Record<string, unknown>[]}
    />
  );
});
