import { component$ } from "@builder.io/qwik";

function normalizePercent(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(String(value).replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
}

export const MarketChangePill = component$((props: { value: unknown; label?: string }) => {
  const p = normalizePercent(props.value);
  const cap = p == null ? null : Math.max(-20, Math.min(20, p));
  const intensity = cap == null ? 0 : Math.abs(cap) / 20;
  const widthPct = cap == null ? 0 : Math.max(6, Math.round(intensity * 100));
  const positive = (p ?? 0) >= 0;
  const txt =
    p == null
      ? "—"
      : `${p > 0 ? "+" : ""}${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;

  return (
    <div class="min-w-[92px]">
      <div
        class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
          p == null
            ? "border-slate-700 text-slate-400"
            : positive
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
        }`}
      >
        {props.label ? `${props.label} ` : ""}
        {txt}
      </div>
      <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#043234]/70">
        {p != null ? (
          <div
            class={`h-full rounded-full ${positive ? "bg-emerald-400/90" : "bg-rose-400/90"}`}
            style={{ width: `${widthPct}%` }}
          />
        ) : null}
      </div>
    </div>
  );
});

