import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { desc, eq } from "drizzle-orm";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { db } from "~/lib/turso";
import { cachedMarketTokens } from "../../../../drizzle/schema";
import { useDashboardAuth } from "../layout";

export const head: DocumentHead = {
  title: "Meme | Dashboard",
};

export const useMemeLoader = routeLoader$(async () => {
  try {
    return await db
      .select()
      .from(cachedMarketTokens)
      .where(eq(cachedMarketTokens.category, "memes"))
      .orderBy(desc(cachedMarketTokens.updatedAt))
      .limit(300)
      .all();
  } catch (e) {
    console.error("[useMemeLoader]", e);
    return [];
  }
});

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const rows = useMemeLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";

  return (
    <CategoryTokenTable
      locale={L}
      title="Meme coins"
      subtitle="Vertical meme — filtra y ordena como el resto de tablas de mercado."
      rows={rows.value as unknown as Record<string, unknown>[]}
      emptyHint={
        showSync
          ? "Aún no hay filas — ejecuta la sincronización desde el resumen del panel."
          : "No hay datos en caché todavía."
      }
    />
  );
});
