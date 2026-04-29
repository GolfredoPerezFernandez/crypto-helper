import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../../layout";
import { fetchMoralisTransaction } from "~/server/crypto-ghost/moralis-api";
import { evmTxExplorerUrl } from "~/components/crypto-dashboard/evm-dash-links";

export const useTxPageLoader = routeLoader$(async (ev) => {
  const raw = ev.params.hash?.trim() ?? "";
  const h = raw.toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(h)) {
    throw ev.error(400, { message: "Hash de transacción inválido" });
  }
  const chain = (ev.url.searchParams.get("chain")?.trim().toLowerCase() || "base").toLowerCase();
  const moralisChain = chain === "eth" || chain === "ethereum" || chain === "0x1" ? "eth" : "base";
  const tx = await fetchMoralisTransaction(h, moralisChain);
  return { hash: h, chain: moralisChain, tx };
});

export default component$(() => {
  useDashboardAuth();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const v = useTxPageLoader().value;
  const ok = v.tx.ok;
  const data = v.tx.ok ? v.tx.data : null;

  const explorerTx = evmTxExplorerUrl(v.chain, v.hash);

  return (
    <div class="mx-auto max-w-4xl space-y-6">
      <nav class="text-sm">
        <Link href={`/${L}/home/`} class="text-[#04E6E6] hover:underline">
          ← Dashboard
        </Link>
      </nav>
      <header>
        <h1 class="text-2xl font-bold text-white">Transacción</h1>
        <p class="mt-2 font-mono text-xs text-slate-500 break-all">{v.hash}</p>
        <p class="mt-1 text-sm text-slate-400">
          Red: <span class="font-mono text-slate-300">{v.chain}</span>
          {" · "}
          <a href={explorerTx} target="_blank" rel="noreferrer" class="text-[10px] text-slate-500 hover:text-slate-300">
            Ver también en explorador ↗
          </a>
        </p>
      </header>

      {!ok ? (
        <div class="rounded-lg border border-amber-900/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {!v.tx.ok ? String(v.tx.error) : "Error"}
        </div>
      ) : (
        <section class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle de la transacción</h2>
          <pre class="mt-3 max-h-[min(560px,65vh)] overflow-auto rounded-lg bg-[#000D0E] p-3 text-[11px] leading-relaxed text-slate-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
});
