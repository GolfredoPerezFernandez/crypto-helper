import { component$ } from "@builder.io/qwik";

export const MarketRegimeBadge = component$((props: { score: number }) => {
  const score = Number.isFinite(props.score) ? props.score : 0;
  const regime = score >= 1.8 ? "Bullish" : score <= -1.8 ? "Bearish" : "Neutral";
  const cls =
    regime === "Bullish"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : regime === "Bearish"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
        : "border-slate-600 bg-slate-700/20 text-slate-300";
  return <span class={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{regime}</span>;
});

