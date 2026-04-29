import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../../layout";
import { desc, eq } from "drizzle-orm";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { db } from "~/lib/turso";
import { cachedMarketTokens } from "../../../../../drizzle/schema";

export const head: DocumentHead = {
  title: "Top volume | Dashboard",
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
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const rows = useVolumeLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  return (
    <CategoryTokenTable
      locale={L}
      title="Top volume"
      subtitle={
        showSync
          ? "Listados por volumen 24h. Actualizado en el sync diario."
          : "Listados por volumen 24h."
      }
      rows={rows.value as unknown as Record<string, unknown>[]}
    />
  );
});
