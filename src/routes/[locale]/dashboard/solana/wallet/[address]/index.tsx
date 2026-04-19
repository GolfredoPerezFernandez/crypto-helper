import { component$, useComputed$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LuExternalLink } from "@qwikest/icons/lucide";
// @ts-ignore qwik-speak types
import { inlineTranslate } from "qwik-speak";
import {
  fetchMoralisSolanaPortfolio,
  fetchMoralisSolanaSwaps,
  type MoralisSolanaNetwork,
} from "~/server/crypto-ghost/moralis-api";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";
import { formatUsdBalance } from "~/utils/format-market";
import {
  moralisLooseRows,
  solanaNativeBalanceLabel,
  solanaPortfolioNfts,
  solanaPortfolioTokens,
  solanaSwapRowPreview,
  solanaTokenRowPreview,
} from "~/utils/solana-moralis-view";

export const head: DocumentHead = {
  title: "Solana wallet | Dashboard",
};

export const useSolanaWalletLiveLoader = routeLoader$(async (ev) => {
  const raw = ev.params.address?.trim() || "";
  if (!isSolanaWalletAddress(raw)) {
    throw ev.error(400, { message: "Dirección Solana no válida" });
  }
  const netParam = ev.url.searchParams.get("network")?.trim().toLowerCase();
  const network: MoralisSolanaNetwork = netParam === "devnet" ? "devnet" : "mainnet";

  const [portfolio, swaps] = await Promise.all([
    fetchMoralisSolanaPortfolio(raw, network, {
      nftMetadata: true,
      mediaItems: false,
      excludeSpam: true,
    }),
    fetchMoralisSolanaSwaps(raw, network, { limit: 40, order: "DESC" }),
  ]);

  return { address: raw, network, portfolio, swaps };
});

export default component$(() => {
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const solBase = `/${L}/dashboard/solana`;
  const d = useSolanaWalletLiveLoader();
  const v = d.value;

  const pData = v.portfolio.ok ? v.portfolio.data : null;
  const native = solanaNativeBalanceLabel(pData);
  const tokRows = solanaPortfolioTokens(pData).map(solanaTokenRowPreview);
  const nftRows = solanaPortfolioNfts(pData);
  const swapSource = v.swaps.ok ? v.swaps.data : null;
  const swapRows = moralisLooseRows(swapSource).map((r) => solanaSwapRowPreview(r));

  const solscanAccount = `https://solscan.io/account/${encodeURIComponent(v.address)}`;

  return (
    <div class="max-w-6xl space-y-6">
      <Link href={`${solBase}/wallet/`} class="text-sm text-[#04E6E6] hover:underline inline-block">
        {backWalletList.value}
      </Link>

      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[#04E6E6]">Wallet Solana</h1>
          <p class="text-xs font-mono text-gray-400 break-all mt-2">{v.address}</p>
          <p class="text-xs text-gray-500 mt-1">
            Red: <span class="text-gray-300">{v.network}</span> · datos en vivo al cargar la página
          </p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <a
            href={solscanAccount}
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1 rounded-lg border border-[#043234] px-3 py-2 text-[#04E6E6] hover:bg-[#043234]/40"
          >
            <LuExternalLink class="h-3.5 w-3.5" />
            Solscan
          </a>
        </div>
      </div>

      <nav class="flex flex-wrap gap-2 text-xs text-slate-400">
        <a class="hover:text-[#04E6E6]" href="#native-balance">
          Saldo nativo
        </a>
        <span class="text-slate-700">·</span>
        <a class="hover:text-[#04E6E6]" href="#portfolio">
          Portfolio
        </a>
        <span class="text-slate-700">·</span>
        <a class="hover:text-[#04E6E6]" href="#token-balances">
          Tokens
        </a>
        <span class="text-slate-700">·</span>
        <a class="hover:text-[#04E6E6]" href="#nft-balances">
          NFTs
        </a>
        <span class="text-slate-700">·</span>
        <a class="hover:text-[#04E6E6]" href="#swaps">
          Swaps
        </a>
      </nav>

      {!v.portfolio.ok ? (
        <p class="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
          Portfolio: {v.portfolio.error}
        </p>
      ) : null}

      <section id="native-balance" class="scroll-mt-24 rounded-xl border border-[#043234] bg-[#001a1c] p-4">
        <h2 class="text-sm font-semibold text-gray-300 mb-2">Saldo nativo</h2>
        {v.portfolio.ok && native ? (
          <p class="text-lg font-mono text-white tabular-nums">{native}</p>
        ) : v.portfolio.ok ? (
          <p class="text-sm text-slate-500">
            No se detectó un campo típico de SOL; revisa el bloque de depuración abajo si necesitas el payload completo.
          </p>
        ) : null}
      </section>

      <section id="portfolio" class="scroll-mt-24 rounded-xl border border-[#043234] bg-[#001a1c] p-4">
        <h2 class="text-sm font-semibold text-gray-300 mb-2">Portfolio (resumen)</h2>
        {v.portfolio.ok && pData && typeof pData === "object" ? (
          <div class="text-xs text-slate-400 space-y-1">
            <p>
              Tokens detectados: <span class="text-white">{tokRows.length}</span> · NFTs detectados:{" "}
              <span class="text-white">{nftRows.length}</span>
            </p>
          </div>
        ) : null}
        {v.portfolio.ok && pData ? (
          <details class="mt-3">
            <summary class="text-xs text-[#04E6E6] cursor-pointer">Raw JSON (acortado)</summary>
            <pre class="mt-2 text-[10px] text-slate-500 overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(pData, null, 2).slice(0, 6000)}
              {JSON.stringify(pData, null, 2).length > 6000 ? "\n…" : ""}
            </pre>
          </details>
        ) : null}
      </section>

      <section id="token-balances" class="scroll-mt-24 rounded-xl border border-[#043234] bg-[#001a1c] p-4">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">SPL / tokens</h2>
        {v.portfolio.ok && tokRows.length === 0 ? (
          <p class="text-sm text-slate-500">Sin filas parseadas; el formato puede variar — revisa el detalle técnico abajo.</p>
        ) : null}
        {tokRows.length > 0 ? (
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="text-slate-500 border-b border-[#043234]">
                  <th class="py-2 pr-2">Símbolo</th>
                  <th class="py-2 pr-2">Nombre</th>
                  <th class="py-2 pr-2">Balance</th>
                  <th class="py-2 pr-2">USD</th>
                  <th class="py-2">Mint</th>
                </tr>
              </thead>
              <tbody>
                {tokRows.map((t, i) => (
                  <tr key={`${t.mint}-${i}`} class="border-b border-[#043234]/60 text-slate-300">
                    <td class="py-2 pr-2 font-mono text-[#04E6E6]/90">{t.symbol || "—"}</td>
                    <td class="py-2 pr-2 max-w-[140px] truncate">{t.name || "—"}</td>
                    <td class="py-2 pr-2 font-mono tabular-nums">{t.balance || "—"}</td>
                    <td class="py-2 pr-2 tabular-nums">
                      {t.usd ? `$${formatUsdBalance(t.usd)}` : "—"}
                    </td>
                    <td class="py-2 font-mono text-[10px] break-all max-w-[200px]">
                      {t.mint ? (
                        <Link
                          class="text-[#04E6E6] hover:underline"
                          href={`${solBase}/token/${encodeURIComponent(t.mint)}/?network=${v.network}`}
                        >
                          {t.mint.slice(0, 8)}…
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section id="nft-balances" class="scroll-mt-24 rounded-xl border border-[#043234] bg-[#001a1c] p-4">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">NFTs</h2>
        {v.portfolio.ok && nftRows.length === 0 ? (
          <p class="text-sm text-slate-500">Sin NFTs en el array parseado o cartera vacía.</p>
        ) : null}
        {nftRows.length > 0 ? (
          <ul class="space-y-2 text-xs text-slate-400">
            {nftRows.slice(0, 40).map((n, i) => (
              <li key={i} class="font-mono break-all border-b border-[#043234]/40 pb-2">
                {JSON.stringify(n).slice(0, 280)}
                {JSON.stringify(n).length > 280 ? "…" : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="swaps" class="scroll-mt-24 rounded-xl border border-[#043234] bg-[#001a1c] p-4">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">Swaps recientes</h2>
        {!v.swaps.ok ? (
          <p class="text-sm text-rose-300">{v.swaps.error}</p>
        ) : swapRows.length === 0 ? (
          <p class="text-sm text-slate-500">Sin swaps en la respuesta parseada.</p>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="text-slate-500 border-b border-[#043234]">
                  <th class="py-2 pr-2">Tipo</th>
                  <th class="py-2 pr-2">Fecha</th>
                  <th class="py-2">Firma</th>
                </tr>
              </thead>
              <tbody>
                {swapRows.map((s, i) => (
                  <tr key={`${s.sig}-${i}`} class="border-b border-[#043234]/60 text-slate-300">
                    <td class="py-2 pr-2">{s.kind || "—"}</td>
                    <td class="py-2 pr-2 font-mono">{s.when || "—"}</td>
                    <td class="py-2 font-mono text-[10px]">
                      {s.sig ? (
                        <a
                          class="text-[#04E6E6] hover:underline"
                          href={`https://solscan.io/tx/${encodeURIComponent(s.sig)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.sig.slice(0, 12)}…
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p class="text-xs text-slate-600 pb-8">
        Otra red: añade <span class="font-mono">?network=devnet</span> a la URL de esta página.
      </p>
    </div>
  );
});
