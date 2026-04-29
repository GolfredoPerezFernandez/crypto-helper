import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { desc, eq } from "drizzle-orm";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { db } from "~/lib/turso";
import { cachedMarketTokens } from "../../../../drizzle/schema";
import { useDashboardAuth } from "../layout";

export const head: DocumentHead = {
  title: "Gaming | Dashboard",
};

export const useGamingLoader = routeLoader$(async () => {
  try {
    return await db
      .select()
      .from(cachedMarketTokens)
      .where(eq(cachedMarketTokens.category, "gaming"))
      .orderBy(desc(cachedMarketTokens.updatedAt))
      .limit(300)
      .all();
  } catch (e) {
    console.error("[useGamingLoader]", e);
    return [];
  }
});

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const rows = useGamingLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";

  return (
    <CategoryTokenTable
      locale={L}
      title="Gaming"
      subtitle="Tokens gaming — misma caché que el resto del panel."
      rows={rows.value as unknown as Record<string, unknown>[]}
      emptyHint={
        showSync
          ? "No rows yet — run a full market sync from the dashboard home."
          : "No hay datos en caché todavía."
      }
    />
  );
});
