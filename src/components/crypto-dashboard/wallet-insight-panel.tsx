import { component$ } from "@builder.io/qwik";
import { TxHashLink } from "./evm-dash-links";

export function isWalletInsightPayload(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const x = data as Record<string, unknown>;
  if (typeof x.address !== "string") return false;
  if (Array.isArray(x.result)) return false;
  return (
    x.walletAgeDays != null ||
    x.firstActivityAt != null ||
    x.transactionsInvolved != null ||
    x.swapVolumeUsd != null ||
    x.activeDays != null
  );
}

function hexToMoralisChainSlug(hex: unknown): string {
  const s = String(hex ?? "").toLowerCase();
  if (s === "0x2105") return "base";
  if (s === "0x1") return "eth";
  return s || "base";
}

function chainDisplayName(hex: unknown): string {
  const s = String(hex ?? "").toLowerCase();
  if (s === "0x2105") return "Base";
  if (s === "0x1") return "Ethereum";
  return s || "—";
}

function fmtIsoShort(iso: unknown): string {
  if (typeof iso !== "string") return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.length > 22 ? `${iso.slice(0, 19)}…` : iso;
    return d.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function fmtInsightUsd(v: unknown, opts?: { signed?: boolean }): string {
  if (v == null) return "—";
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string"
        ? Number(String(v).replace(/,/g, ""))
        : NaN;
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const body = abs.toLocaleString("es-ES", { maximumFractionDigits: 2 });
  if (opts?.signed && n < 0) return `−$${body}`;
  if (opts?.signed && n > 0) return `+$${body}`;
  return `$${body}`;
}

function xferTriplet(title: string, raw: unknown) {
  const o = raw as { sent?: unknown; received?: unknown; total?: unknown } | null;
  if (!o || typeof o !== "object") {
    return (
      <div class="rounded-xl border border-dashed border-[#043234]/50 bg-[#000D0E]/30 p-3 text-center text-[11px] text-gray-600">
        {title}: sin datos
      </div>
    );
  }
  return (
    <div class="rounded-xl border border-[#043234] bg-[#000D0E]/50 p-3">
      <p class="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <div class="grid grid-cols-3 gap-2 text-center text-[11px]">
        <div>
          <p class="text-[9px] text-gray-600">Enviadas</p>
          <p class="font-semibold tabular-nums text-rose-200/90">{String(o.sent ?? "—")}</p>
        </div>
        <div>
          <p class="text-[9px] text-gray-600">Recibidas</p>
          <p class="font-semibold tabular-nums text-emerald-200/90">{String(o.received ?? "—")}</p>
        </div>
        <div>
          <p class="text-[9px] text-gray-600">Total</p>
          <p class="font-semibold tabular-nums text-white">{String(o.total ?? "—")}</p>
        </div>
      </div>
    </div>
  );
}

const MILESTONE_FIELDS = [
  ["firstActivityAt", "Primera actividad"],
  ["lastActivityAt", "Última actividad"],
  ["firstInitiatedAt", "Primera tx iniciada"],
  ["lastInitiatedAt", "Última tx iniciada"],
] as const;

export const WalletInsightPanel = component$((props: { payload: Record<string, unknown>; locale: string }) => {
  const p = props.payload;
  const mostActive = chainDisplayName(p.mostActiveChain);
  const cp = p.uniqueCounterparties as Record<string, unknown> | undefined;

  return (
    <div class="space-y-5">
      <div class="rounded-xl border border-[#04E6E6]/20 bg-gradient-to-br from-[#04E6E6]/5 to-transparent px-4 py-3">
        <p class="text-xs font-medium text-[#04E6E6]/95">Resumen Wallet Insight</p>
        <p class="mt-1 text-[11px] leading-relaxed text-gray-400">
          Métricas agregadas en vivo. Cadena más activa:{" "}
          <span class="font-mono text-gray-300">{String(p.mostActiveChain ?? "—")}</span>
          {mostActive !== "—" ? (
            <span class="text-gray-500">
              {" "}
              ({mostActive})
            </span>
          ) : null}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {([
          ["Edad (días)", p.walletAgeDays],
          ["Días activos", p.activeDays],
          ["Cadenas activas", p.activeChains],
          ["Tx iniciadas", p.transactionsInitiated],
          ["Tx involucradas", p.transactionsInvolved],
          ["Tokens únicos", p.uniqueTokensInteracted],
          ["Contratos creados", p.contractsCreated],
        ] as Array<[string, unknown]>).map(([label, val]) => (
          <div
            key={String(label)}
            class="rounded-lg border border-[#043234] bg-[#000D0E]/70 px-2.5 py-2 shadow-inner shadow-black/20"
          >
            <p class="text-[9px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
            <p class="text-sm font-semibold tabular-nums text-white">{val != null ? String(val) : "—"}</p>
          </div>
        ))}
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-xl border border-[#043234] bg-[#000D0E]/40 p-3">
          <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Volumen swaps (USD)</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-[#04E6E6]">{fmtInsightUsd(p.swapVolumeUsd)}</p>
        </div>
        <div class="rounded-xl border border-[#043234] bg-[#000D0E]/40 p-3">
          <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Gas total / medio (USD)</p>
          <p class="mt-1 text-sm tabular-nums text-slate-200">
            <span class="font-semibold text-white">{fmtInsightUsd(p.totalGasSpentUsd)}</span>
            <span class="text-gray-600"> · </span>
            <span>{fmtInsightUsd(p.avgGasPerTransactionUsd)}</span>
          </p>
        </div>
        <div class="rounded-xl border border-[#043234] bg-[#000D0E]/40 p-3 sm:col-span-2 lg:col-span-1">
          <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Flujo nativo (USD)</p>
          <div class="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <p class="text-[9px] text-gray-600">Enviado</p>
              <p class="font-medium tabular-nums text-rose-200/90">{fmtInsightUsd(p.nativeVolumeSentUsd)}</p>
            </div>
            <div>
              <p class="text-[9px] text-gray-600">Recibido</p>
              <p class="font-medium tabular-nums text-emerald-200/90">{fmtInsightUsd(p.nativeVolumeReceivedUsd)}</p>
            </div>
            <div>
              <p class="text-[9px] text-gray-600">Neto</p>
              <p
                class={`font-semibold tabular-nums ${
                  Number(p.nativeNetFlowUsd) < 0 ? "text-rose-300" : "text-emerald-300"
                }`}
              >
                {fmtInsightUsd(p.nativeNetFlowUsd, { signed: true })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div class="rounded-xl border border-[#043234] bg-[#000D0E]/30 p-3">
          <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">Mayor transfer. nativo in</p>
          <p class="text-lg font-semibold tabular-nums text-emerald-200/95">{fmtInsightUsd(p.largestNativeTransferInUsd)}</p>
        </div>
        <div class="rounded-xl border border-[#043234] bg-[#000D0E]/30 p-3">
          <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">Mayor transfer. nativo out</p>
          <p class="text-lg font-semibold tabular-nums text-rose-200/95">{fmtInsightUsd(p.largestNativeTransferOutUsd)}</p>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        {xferTriplet("Transferencias nativas", p.nativeTransfers)}
        {xferTriplet("ERC-20", p.erc20Transfers)}
        {xferTriplet("NFT", p.nftTransfers)}
      </div>

      {cp && typeof cp === "object" ? (
        <div class="rounded-xl border border-[#043234] bg-[#000D0E]/40 px-4 py-3">
          <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">Contrapartes únicas</p>
          <div class="flex flex-wrap gap-6 text-sm">
            <span class="text-gray-400">
              Enviado a <strong class="text-white tabular-nums">{String(cp.sentTo ?? "—")}</strong> direcciones
            </span>
            <span class="text-gray-400">
              Recibido de <strong class="text-white tabular-nums">{String(cp.receivedFrom ?? "—")}</strong> direcciones
            </span>
          </div>
        </div>
      ) : null}

      <div>
        <p class="mb-3 text-[10px] font-medium uppercase tracking-wide text-gray-500">Hitos on-chain</p>
        <div class="grid gap-3 sm:grid-cols-2">
          {MILESTONE_FIELDS.map(([field, title]) => {
            const raw = p[field];
            const item = raw as Record<string, unknown> | null;
            if (!item || typeof item !== "object") {
              return (
                <div key={field} class="rounded-xl border border-[#043234]/60 bg-[#000D0E]/40 p-3">
                  <p class="text-[10px] text-gray-500">{title}</p>
                  <p class="text-sm text-gray-600">—</p>
                </div>
              );
            }
            const chainSlug = hexToMoralisChainSlug(item.chain);
            const dir = String(item.direction ?? "");
            const typ = String(item.type ?? "—").replace(/-/g, " ");
            const hash = item.transactionHash ?? item.transaction_hash;
            return (
              <div
                key={field}
                class="rounded-xl border border-[#043234] bg-[#000D0E]/60 p-3 shadow-sm shadow-black/30"
              >
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{title}</p>
                  <span
                    class={`rounded-md px-2 py-0.5 text-[9px] font-semibold ${
                      dir === "in"
                        ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                        : dir === "out"
                          ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
                          : "bg-slate-600/30 text-slate-300"
                    }`}
                  >
                    {dir === "in" ? "Entrada" : dir === "out" ? "Salida" : dir || "—"}
                  </span>
                  <span class="rounded-md bg-[#043234]/80 px-2 py-0.5 font-mono text-[9px] text-[#04E6E6]/90">
                    {chainDisplayName(item.chain)}
                  </span>
                </div>
                <p class="text-[11px] capitalize text-gray-300">{typ}</p>
                <p class="mt-1 text-[11px] tabular-nums text-gray-500">
                  {fmtIsoShort(item.blockTimestamp ?? item.block_timestamp)}
                  <span class="text-gray-600">
                    {" "}
                    · bloque {String(item.blockNumber ?? "—")}
                  </span>
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <span class="text-[10px] text-gray-600">Tx:</span>
                  <TxHashLink locale={props.locale} moralisChain={chainSlug} hash={hash} mode="hash12" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
