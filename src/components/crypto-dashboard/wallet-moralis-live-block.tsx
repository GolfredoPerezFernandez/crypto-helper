import { component$ } from "@builder.io/qwik";
import { EvmAddrLinks, TxHashLink } from "./evm-dash-links";
import { isWalletInsightPayload, WalletInsightPanel } from "./wallet-insight-panel";
import { isWalletStatsPayload, WalletStatsPanel } from "./wallet-stats-panel";
import type { MoralisWalletLiveKind } from "./moralis-wallet-live-api";
import {
  fmtMoralisTs,
  fmtSwapLeg,
  fmtUsd,
  isMoralisPaginatedTxList,
  moralisResultArray,
  moralisShallowEntries,
} from "./moralis-wallet-live-helpers";

export const WalletMoralisLiveBlock = component$(
  (props: { kind: MoralisWalletLiveKind; chain: "base" | "eth"; locale: string; payload: unknown }) => {
    const L = props.locale;
    const ch = props.chain;
    const whPayload = props.payload;
    const whKind = props.kind;

    return (
      <div class="space-y-3">
        {whKind === "swaps" ? (
          moralisResultArray(whPayload).length > 0 ? (
            <div class="overflow-x-auto rounded-lg border border-[#043234] bg-[#000D0E]/40">
              <table class="w-full min-w-[820px] border-collapse text-left text-[11px] text-slate-200">
                <thead>
                  <tr class="border-b border-[#043234] bg-black/20 text-[10px] uppercase tracking-wide text-gray-500">
                    <th class="px-2 py-2 font-medium">Fecha</th>
                    <th class="px-2 py-2 font-medium">Tipo</th>
                    <th class="px-2 py-2 font-medium">Wallet</th>
                    <th class="px-2 py-2 font-medium">Par</th>
                    <th class="px-2 py-2 font-medium">Comprado</th>
                    <th class="px-2 py-2 font-medium">Vendido</th>
                    <th class="px-2 py-2 font-medium text-right">Valor</th>
                    <th class="px-2 py-2 font-medium">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {moralisResultArray(whPayload).map((row, i) => {
                    const hash = row.transactionHash ?? row.transaction_hash;
                    const type = [String(row.transactionType ?? ""), String(row.subCategory ?? "")]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <tr
                        key={`swap-${i}-${String(hash)}`}
                        class="border-b border-[#043234]/60 hover:bg-[#04E6E6]/5"
                      >
                        <td class="whitespace-nowrap px-2 py-1.5 text-gray-400">
                          {fmtMoralisTs(row.blockTimestamp ?? row.block_timestamp)}
                        </td>
                        <td class="px-2 py-1.5 capitalize text-[#04E6E6]/90">{type || "—"}</td>
                        <td class="min-w-[120px] px-2 py-1.5 align-top">
                          <EvmAddrLinks locale={L} moralisChain={ch} address={row.walletAddress ?? row.wallet_address} />
                        </td>
                        <td class="max-w-[140px] truncate px-2 py-1.5" title={String(row.pairLabel ?? "")}>
                          {String(row.pairLabel ?? "—")}
                        </td>
                        <td class="max-w-[180px] truncate px-2 py-1.5 text-emerald-400/95" title={fmtSwapLeg(row.bought)}>
                          {fmtSwapLeg(row.bought)}
                        </td>
                        <td class="max-w-[180px] truncate px-2 py-1.5 text-rose-300/90" title={fmtSwapLeg(row.sold)}>
                          {fmtSwapLeg(row.sold)}
                        </td>
                        <td class="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-300">
                          {fmtUsd(row.totalValueUsd ?? row.total_value_usd)}
                        </td>
                        <td class="whitespace-nowrap px-2 py-1.5">
                          <TxHashLink locale={L} moralisChain={ch} hash={hash} mode="hash10" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p class="text-sm text-gray-500">Sin swaps en esta página (resultado vacío).</p>
          )
        ) : null}

        {whKind === "erc20" && moralisResultArray(whPayload).length > 0 ? (
          <div class="overflow-x-auto rounded-lg border border-[#043234] bg-[#000D0E]/40">
            <table class="w-full min-w-[640px] border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr class="border-b border-[#043234] bg-black/20 text-[10px] uppercase tracking-wide text-gray-500">
                  <th class="px-2 py-2 font-medium">Fecha</th>
                  <th class="px-2 py-2 font-medium">Token</th>
                  <th class="px-2 py-2 font-medium">Cantidad</th>
                  <th class="px-2 py-2 font-medium">Desde</th>
                  <th class="px-2 py-2 font-medium">Hacia</th>
                  <th class="px-2 py-2 font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {moralisResultArray(whPayload).map((row, i) => {
                  const hash = row.transaction_hash ?? row.transactionHash;
                  const sym = String(row.token_symbol ?? row.symbol ?? "—");
                  const amt = String(
                    row.value_formatted ?? row.value_with_decimals ?? row.value_decimal ?? row.value ?? "—",
                  );
                  return (
                    <tr key={`erc20-${i}`} class="border-b border-[#043234]/60 hover:bg-[#04E6E6]/5">
                      <td class="whitespace-nowrap px-2 py-1.5 text-gray-400">
                        {fmtMoralisTs(row.block_timestamp ?? row.blockTimestamp)}
                      </td>
                      <td class="px-2 py-1.5">{sym}</td>
                      <td class="max-w-[120px] truncate px-2 py-1.5 font-mono text-[10px]" title={amt}>
                        {amt}
                      </td>
                      <td class="min-w-[130px] px-2 py-1.5 align-top">
                        <EvmAddrLinks
                          locale={L}
                          moralisChain={ch}
                          address={row.from_address ?? row.from_address_checksummed}
                        />
                      </td>
                      <td class="min-w-[130px] px-2 py-1.5 align-top">
                        <EvmAddrLinks
                          locale={L}
                          moralisChain={ch}
                          address={row.to_address ?? row.to_address_checksummed}
                        />
                      </td>
                      <td class="px-2 py-1.5">
                        <TxHashLink locale={L} moralisChain={ch} hash={hash} mode="ver" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {whKind === "nftTrades" && moralisResultArray(whPayload).length > 0 ? (
          <div class="overflow-x-auto rounded-lg border border-[#043234] bg-[#000D0E]/40">
            <table class="w-full min-w-[720px] border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr class="border-b border-[#043234] bg-black/20 text-[10px] uppercase tracking-wide text-gray-500">
                  <th class="px-2 py-2 font-medium">Fecha</th>
                  <th class="px-2 py-2 font-medium">NFT</th>
                  <th class="px-2 py-2 font-medium">Comprador</th>
                  <th class="px-2 py-2 font-medium">Vendedor</th>
                  <th class="px-2 py-2 font-medium">Precio</th>
                  <th class="px-2 py-2 font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {moralisResultArray(whPayload).map((row, i) => {
                  const hash = row.transaction_hash ?? row.transactionHash ?? row.hash;
                  const name = String(
                    row.token_name ?? row.name ?? row.nft_name ?? row.collection_name ?? row.token_id ?? "—",
                  ).slice(0, 48);
                  const price = String(
                    row.total_price_formatted ??
                      row.price_formatted ??
                      row.token_amount ??
                      row.total_price ??
                      "—",
                  );
                  const buyer =
                    row.buyer_address ?? row.buyer ?? (row.last_sale as Record<string, unknown> | undefined)?.buyer_address;
                  const seller =
                    row.seller_address ?? row.seller ?? (row.last_sale as Record<string, unknown> | undefined)?.seller_address;
                  return (
                    <tr key={`nftt-${i}`} class="border-b border-[#043234]/60 hover:bg-[#04E6E6]/5">
                      <td class="whitespace-nowrap px-2 py-1.5 text-gray-400">
                        {fmtMoralisTs(row.block_timestamp ?? row.blockTimestamp ?? row.timestamp)}
                      </td>
                      <td class="max-w-[220px] truncate px-2 py-1.5" title={name}>
                        {name}
                      </td>
                      <td class="min-w-[120px] px-2 py-1.5 align-top">
                        <EvmAddrLinks locale={L} moralisChain={ch} address={buyer} />
                      </td>
                      <td class="min-w-[120px] px-2 py-1.5 align-top">
                        <EvmAddrLinks locale={L} moralisChain={ch} address={seller} />
                      </td>
                      <td class="px-2 py-1.5 font-mono text-[10px]">{price}</td>
                      <td class="px-2 py-1.5">
                        <TxHashLink locale={L} moralisChain={ch} hash={hash} mode="ver" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {(whKind === "insight" || whKind === "stats") &&
        !(whKind === "insight" && isMoralisPaginatedTxList(whPayload)) &&
        isWalletInsightPayload(whPayload) ? (
          <WalletInsightPanel payload={whPayload} locale={L} />
        ) : null}

        {(whKind === "insight" || whKind === "stats") &&
        !(whKind === "insight" && isMoralisPaginatedTxList(whPayload)) &&
        !isWalletInsightPayload(whPayload) &&
        isWalletStatsPayload(whPayload) ? (
          <WalletStatsPanel payload={whPayload} />
        ) : null}

        {(whKind === "insight" || whKind === "stats") &&
        !(whKind === "insight" && isMoralisPaginatedTxList(whPayload)) &&
        !isWalletInsightPayload(whPayload) &&
        !isWalletStatsPayload(whPayload) &&
        moralisShallowEntries(whPayload).length > 0 ? (
          <dl class="grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg border border-[#043234] bg-[#000D0E]/40 p-3 sm:grid-cols-2 text-[11px]">
            {moralisShallowEntries(whPayload).map(([k, val]) => (
              <div key={k} class="flex flex-wrap gap-2 border-b border-[#043234]/40 py-1 sm:border-0">
                <dt class="shrink-0 font-medium text-gray-500">{k}</dt>
                <dd class="min-w-0 break-all text-slate-300">{val}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {whKind === "activeChains" &&
        moralisResultArray((whPayload as Record<string, unknown>)?.active_chains ?? whPayload).length > 0 ? (
          <div class="overflow-x-auto rounded-lg border border-[#043234] bg-[#000D0E]/40">
            <table class="w-full border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr class="border-b border-[#043234] bg-black/20 text-[10px] uppercase tracking-wide text-gray-500">
                  <th class="px-2 py-2 font-medium">Cadena</th>
                  <th class="px-2 py-2 font-medium">Chain ID</th>
                  <th class="px-2 py-2 font-medium">Primera tx</th>
                  <th class="px-2 py-2 font-medium">Última tx</th>
                </tr>
              </thead>
              <tbody>
                {moralisResultArray((whPayload as Record<string, unknown>)?.active_chains ?? whPayload).map(
                  (row, i) => {
                    const ft = row.first_transaction as Record<string, unknown> | undefined;
                    const lt = row.last_transaction as Record<string, unknown> | undefined;
                    return (
                      <tr key={`ch-${i}`} class="border-b border-[#043234]/60">
                        <td class="px-2 py-1.5">{String(row.chain ?? "—")}</td>
                        <td class="px-2 py-1.5 font-mono text-[10px]">{String(row.chain_id ?? "—")}</td>
                        <td class="px-2 py-1.5 text-gray-400">{fmtMoralisTs(ft?.block_timestamp)}</td>
                        <td class="px-2 py-1.5 text-gray-400">{fmtMoralisTs(lt?.block_timestamp)}</td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {(whKind === "history" ||
          whKind === "verbose" ||
          whKind === "nativeRaw" ||
          (whKind === "insight" && isMoralisPaginatedTxList(whPayload))) &&
        moralisResultArray(whPayload).length > 0 ? (
          <div class="overflow-x-auto rounded-lg border border-[#043234] bg-[#000D0E]/40">
            {whKind === "insight" && isMoralisPaginatedTxList(whPayload) ? (
              <p class="border-b border-[#043234]/80 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100/95">
                Este insight devolvió un listado paginado de transacciones (como el historial), no solo métricas
                sueltas. Tabla abajo; el JSON crudo puede incluir más páginas.
              </p>
            ) : null}
            <table class="w-full min-w-[640px] border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr class="border-b border-[#043234] bg-black/20 text-[10px] uppercase tracking-wide text-gray-500">
                  <th class="px-2 py-2 font-medium">Fecha / bloque</th>
                  <th class="px-2 py-2 font-medium">Hash</th>
                  <th class="px-2 py-2 font-medium">Desde</th>
                  <th class="px-2 py-2 font-medium">Hacia</th>
                  <th class="px-2 py-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {moralisResultArray(whPayload).map((row, i) => {
                  const hash = row.hash ?? row.transaction_hash ?? row.transactionHash;
                  const val = String(row.value ?? row.transaction_fee ?? "—");
                  const block = String(row.block_number ?? row.blockNumber ?? "—");
                  return (
                    <tr key={`tx-${i}`} class="border-b border-[#043234]/60 hover:bg-[#04E6E6]/5">
                      <td class="whitespace-nowrap px-2 py-1.5 text-gray-400">
                        {fmtMoralisTs(row.block_timestamp ?? row.blockTimestamp)}
                        <span class="block text-[10px] text-gray-600">#{block}</span>
                      </td>
                      <td class="px-2 py-1.5">
                        <TxHashLink locale={L} moralisChain={ch} hash={hash} mode="hash12" />
                      </td>
                      <td class="min-w-[130px] px-2 py-1.5 align-top">
                        <EvmAddrLinks locale={L} moralisChain={ch} address={row.from_address ?? row.from} />
                      </td>
                      <td class="min-w-[130px] px-2 py-1.5 align-top">
                        <EvmAddrLinks locale={L} moralisChain={ch} address={row.to_address ?? row.to} />
                      </td>
                      <td class="px-2 py-1.5 text-right font-mono text-[10px] text-slate-400">{val}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  },
);
