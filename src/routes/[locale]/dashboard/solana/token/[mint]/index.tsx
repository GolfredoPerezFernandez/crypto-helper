import { component$, useComputed$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LuExternalLink } from "@qwikest/icons/lucide";
// @ts-ignore qwik-speak types
import { inlineTranslate } from "qwik-speak";
import {
  fetchMoralisSolanaTokenMetadata,
  fetchMoralisSolanaTokenPairs,
  fetchMoralisTokenScore,
  type MoralisSolanaNetwork,
} from "~/server/crypto-ghost/moralis-api";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";
import { formatUsdBalance } from "~/utils/format-market";
import { moralisLooseRows } from "~/utils/solana-moralis-view";

export const head: DocumentHead = {
  title: "Solana token | Dashboard",
};

export const useSolanaTokenLiveLoader = routeLoader$(async (ev) => {
  const raw = ev.params.mint?.trim() || "";
  if (!isSolanaWalletAddress(raw)) {
    throw ev.error(400, { message: "Mint SPL no válido" });
  }
  const netParam = ev.url.searchParams.get("network")?.trim().toLowerCase();
  const network: MoralisSolanaNetwork = netParam === "devnet" ? "devnet" : "mainnet";

  const [metadata, pairs, score] = await Promise.all([
    fetchMoralisSolanaTokenMetadata(raw, network),
    fetchMoralisSolanaTokenPairs(raw, network, { limit: 25 }),
    fetchMoralisTokenScore(raw, "solana"),
  ]);

  return { mint: raw, network, metadata, pairs, score };
});

function firstStr(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

export default component$(() => {
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const solBase = `/${L}/dashboard/solana`;
  const d = useSolanaTokenLiveLoader();
  const v = d.value;

  const meta = v.metadata.ok && v.metadata.data && typeof v.metadata.data === "object" ? (v.metadata.data as Record<string, unknown>) : null;
  const name = meta ? firstStr(meta, ["name", "tokenName"]) : "";
  const symbol = meta ? firstStr(meta, ["symbol", "tokenSymbol"]) : "";
  const supply = meta ? firstStr(meta, ["supply", "totalSupply", "circulatingSupply"]) : "";

  const pairRows = v.pairs.ok ? moralisLooseRows(v.pairs.data) : [];
  const dexUrl = `https://dexscreener.com/solana/${encodeURIComponent(v.mint)}`;
  const solscanToken = `https://solscan.io/token/${encodeURIComponent(v.mint)}`;

  const backTokenList = useComputed$(() =>
    inlineTranslate()("dashboard.solanaBackTokenList@@← Back to Solana tokens"),
  );

  return (
    <div class="max-w-6xl space-y-6">
      <Link href={`${solBase}/token/`} class="text-sm text-[#04E6E6] hover:underline inline-block">
        {backTokenList.value}
      </Link>

      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[#04E6E6]">
            {symbol || "Token"}{" "}
            {name ? <span class="text-base font-normal text-slate-400">· {name}</span> : null}
          </h1>
          <p class="text-xs font-mono text-gray-400 break-all mt-2">{v.mint}</p>
          <p class="text-xs text-gray-500 mt-1">Red: {v.network}</p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <a
            href={solscanToken}
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1 rounded-lg border border-[#043234] px-3 py-2 text-[#04E6E6] hover:bg-[#043234]/40"
          >
            <LuExternalLink class="h-3.5 w-3.5" />
            Solscan
          </a>
          <a
            href={dexUrl}
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1 rounded-lg border border-[#043234] px-3 py-2 text-slate-400 hover:text-[#04E6E6]"
          >
            Dexscreener
          </a>
        </div>
      </div>

      {!v.metadata.ok ? (
        <p class="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
          Metadata: {v.metadata.error}
        </p>
      ) : (
        <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 space-y-2">
          <h2 class="text-sm font-semibold text-gray-300">Metadatos</h2>
          {supply ? (
            <p class="text-sm text-slate-300">
              Supply (raw): <span class="font-mono text-xs">{supply}</span>
            </p>
          ) : null}
          <details>
            <summary class="text-xs text-[#04E6E6] cursor-pointer">JSON completo</summary>
            <pre class="mt-2 text-[10px] text-slate-500 overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(v.metadata.data, null, 2)}
            </pre>
          </details>
        </section>
      )}

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4">
        <h2 class="text-sm font-semibold text-gray-300 mb-2">Token score (Pro+)</h2>
        {!v.score.ok ? (
          <p class="text-sm text-amber-200/90">{v.score.error}</p>
        ) : (
          <pre class="text-[10px] text-slate-400 overflow-x-auto max-h-48">
            {JSON.stringify(v.score.data, null, 2).slice(0, 4000)}
          </pre>
        )}
      </section>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">Pares (muestra)</h2>
        {!v.pairs.ok ? (
          <p class="text-sm text-rose-300">{v.pairs.error}</p>
        ) : pairRows.length === 0 ? (
          <p class="text-sm text-slate-500">Sin pares en la respuesta.</p>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="text-slate-500 border-b border-[#043234]">
                  <th class="py-2 pr-2">Par</th>
                  <th class="py-2 pr-2">DEX</th>
                  <th class="py-2 pr-2">Liquidez USD</th>
                  <th class="py-2">Precio USD</th>
                </tr>
              </thead>
              <tbody>
                {pairRows.map((row, i) => {
                  const label = firstStr(row, ["pairLabel", "label", "name"]);
                  const ex = firstStr(row, ["exchangeName", "dex", "exchange"]);
                  const liq = row.liquidityUsd ?? row.liquidity_usd;
                  const px = row.usdPrice ?? row.usd_price;
                  const pairAddr = firstStr(row, ["pairAddress", "pair_address", "address"]);
                  const liqN = typeof liq === "number" ? liq : Number(liq);
                  const pxN = typeof px === "number" ? px : Number(px);
                  return (
                    <tr key={`${pairAddr}-${i}`} class="border-b border-[#043234]/60 text-slate-300">
                      <td class="py-2 pr-2 max-w-[160px] truncate">{label || pairAddr?.slice(0, 12) || "—"}</td>
                      <td class="py-2 pr-2">{ex || "—"}</td>
                      <td class="py-2 pr-2 tabular-nums">
                        {Number.isFinite(liqN) ? `$${formatUsdBalance(liqN)}` : "—"}
                      </td>
                      <td class="py-2 tabular-nums">
                        {Number.isFinite(pxN) ? `$${formatUsdBalance(pxN)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p class="text-xs text-slate-600 pb-8">
        Gráficos: abre Dexscreener o el visor del par para velas.{" "}
        <span class="font-mono">?network=devnet</span> en la URL para devnet.
      </p>
    </div>
  );
});
