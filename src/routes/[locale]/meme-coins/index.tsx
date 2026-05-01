import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { desc, eq } from "drizzle-orm";
import { CategoryTokenTable } from "~/components/crypto-dashboard/category-token-table";
import { db } from "~/lib/turso";
import { cachedMarketTokens } from "../../../../drizzle/schema";

export const head: DocumentHead = {
  title: "Meme coins | Panel",
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
  const rows = useMemeLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";

  return (
    <CategoryTokenTable
      locale={L}
      title="Meme coins"
      subtitle="Meme coins — busca, filtra y ordena como en el resto del mercado."
      rows={rows.value as unknown as Record<string, unknown>[]}
      emptyHint="No hay meme coins en el listado todavía. Vuelve más tarde."
    />
  );
});
