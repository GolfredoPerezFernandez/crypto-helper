import { component$ } from "@builder.io/qwik";
import { isWalletInsightPayload } from "./wallet-insight-panel";

export function isWalletStatsPayload(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  if (isWalletInsightPayload(data)) return false;
  const x = data as Record<string, unknown>;
  if (Array.isArray(x.result)) return false;
  return (
    x.transactions != null ||
    x.token_transfers != null ||
    x.nft_transfers != null ||
    typeof x.nfts === "string" ||
    typeof x.nfts === "number" ||
    typeof x.collections === "string" ||
    typeof x.collections === "number"
  );
}

function fmtCount(v: unknown): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(/,/g, "."));
  if (!Number.isFinite(n)) return String(v);
  return Math.trunc(n).toLocaleString("es-ES");
}

/** Flat string/number or `{ total: "96" }` style from Moralis. */
function readMetric(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number") return fmtCount(v);
  if (typeof v === "object" && !Array.isArray(v)) {
    const t = (v as Record<string, unknown>).total;
    if (t != null) return fmtCount(t);
  }
  return "—";
}

export const WalletStatsPanel = component$((props: { payload: Record<string, unknown> }) => {
  const p = props.payload;

  const cards = [
    {
      title: "NFTs",
      hint: "NFTs únicos en esta wallet (red seleccionada)",
      value: readMetric(p.nfts),
      accent: "from-violet-500/10 to-transparent",
    },
    {
      title: "Colecciones",
      hint: "Contratos de colección distintos",
      value: readMetric(p.collections),
      accent: "from-fuchsia-500/10 to-transparent",
    },
    {
      title: "Transacciones",
      hint: "Total de transacciones contabilizadas",
      value: readMetric(p.transactions),
      accent: "from-[#04E6E6]/15 to-transparent",
    },
    {
      title: "Transferencias NFT",
      hint: "Movimientos de NFT (histórico agregado)",
      value: readMetric(p.nft_transfers),
      accent: "from-amber-500/10 to-transparent",
    },
    {
      title: "Transferencias de tokens",
      hint: "ERC-20 y similares (histórico agregado)",
      value: readMetric(p.token_transfers),
      accent: "from-sky-500/10 to-transparent",
    },
  ];

  return (
    <div class="space-y-4">
      <div class="rounded-xl border border-[#04E6E6]/15 bg-gradient-to-br from-[#04E6E6]/8 to-transparent px-4 py-3">
        <p class="text-xs font-medium text-[#04E6E6]/95">Resumen Wallet stats</p>
        <p class="mt-1 text-[11px] leading-relaxed text-gray-400">
          Totales de actividad en la cadena elegida. Los números son orientativos y dependen de cómo el proveedor
          agrega la wallet.
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.title}
            class={`rounded-xl border border-[#043234] bg-gradient-to-b ${c.accent} bg-[#000D0E]/80 p-4 shadow-inner shadow-black/30`}
          >
            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{c.title}</p>
            <p class="mt-2 text-2xl font-bold tabular-nums tracking-tight text-white">{c.value}</p>
            <p class="mt-2 text-[10px] leading-snug text-gray-600">{c.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
});
