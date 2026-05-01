import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { WalletChartSlice } from "~/server/crypto-helper/wallet-snapshot";

/** Animated doughnut (Chart.js). Client-only after hydration. */
export const WalletDonutChart = component$((props: { slices: WalletChartSlice[]; ariaLabel: string }) => {
  const canvasRef = useSignal<HTMLCanvasElement>();

  useVisibleTask$(async ({ track, cleanup }) => {
    track(() => props.slices.map((s) => `${s.label}:${s.value}:${s.color}`).join("|"));
    const canvas = canvasRef.value;
    const slices = props.slices.filter((s) => s.value > 0);
    if (!canvas || slices.length === 0) return;

    const { default: Chart } = await import("chart.js/auto");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: slices.map((s) => s.label),
        datasets: [
          {
            data: slices.map((s) => s.value),
            backgroundColor: slices.map((s) => s.color),
            borderWidth: 0,
            hoverOffset: 12,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1100,
          easing: "easeOutQuart",
        },
        cutout: "66%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = Number(ctx.parsed);
                const dataArr = (ctx.dataset.data as number[]) ?? [];
                const total = dataArr.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0";
                return ` ${ctx.label}: $${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${pct}%)`;
              },
            },
          },
        },
      },
    });
    cleanup(() => chart.destroy());
  });

  const hasData = props.slices.some((s) => s.value > 0);

  return (
    <div class="relative mx-auto h-[200px] w-[200px] shrink-0 sm:h-[220px] sm:w-[220px]">
      {hasData ? (
        <canvas ref={canvasRef} class="!h-full !w-full" aria-label={props.ariaLabel} />
      ) : (
        <div class="flex h-full w-full items-center justify-center rounded-full border border-dashed border-[#043234]/80 bg-[#000D0E]/40 text-center text-xs text-slate-500">
          Sin datos
        </div>
      )}
    </div>
  );
});

/** Smooth area line for wallet activity buckets (e.g. Base tx counts per day). */
export const WalletActivityLineChart = component$((props: { labels: string[]; values: number[] }) => {
  const canvasRef = useSignal<HTMLCanvasElement>();

  useVisibleTask$(async ({ track, cleanup }) => {
    track(() => props.labels.join("\0") + props.values.join(","));
    const canvas = canvasRef.value;
    if (!canvas || props.values.length === 0) return;

    const { default: Chart } = await import("chart.js/auto");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
    grad.addColorStop(0, "rgba(4, 230, 230, 0.38)");
    grad.addColorStop(0.45, "rgba(16, 185, 129, 0.14)");
    grad.addColorStop(1, "rgba(4, 230, 230, 0)");

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: props.labels,
        datasets: [
          {
            data: props.values,
            borderColor: "#04E6E6",
            backgroundColor: grad,
            borderWidth: 2,
            fill: true,
            tension: 0.42,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: "#5eead4",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: "easeOutQuart" },
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(0, 26, 28, 0.94)",
            titleColor: "#e2e8f0",
            bodyColor: "#5eead4",
            borderColor: "rgba(4, 230, 230, 0.35)",
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0 },
            grid: { display: false },
          },
          y: {
            ticks: { color: "#64748b", font: { size: 10 }, precision: 0 },
            grid: { color: "rgba(148, 163, 184, 0.12)" },
            beginAtZero: true,
          },
        },
      },
    });
    cleanup(() => chart.destroy());
  });

  const maxV = Math.max(...props.values, 1);
  const last = props.values[props.values.length - 1] ?? 0;
  const ratio = maxV > 0 ? last / maxV : 0;
  const pseudoPct = Math.round(ratio * 1000) / 10;

  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-baseline justify-between gap-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Actividad reciente</h3>
        <span class="text-xs tabular-nums text-[#04E6E6]/85">
          Muestra Base · último bucket {pseudoPct}% vs máximo local
        </span>
      </div>
      <div class="relative h-[min(220px,28vh)] w-full min-h-[160px]">
        {props.values.length > 0 ? (
          <canvas ref={canvasRef} class="!h-full !w-full" aria-label="Gráfico de actividad de la wallet en Base" />
        ) : (
          <div class="flex h-full items-center justify-center rounded-lg border border-[#043234]/60 bg-[#000D0E]/50 text-sm text-slate-500">
            Sin serie temporal en la muestra
          </div>
        )}
      </div>
    </div>
  );
});
