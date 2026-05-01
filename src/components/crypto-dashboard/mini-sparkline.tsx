import { component$ } from "@builder.io/qwik";

type SparkPoint = { x: number; y: number };

export const MiniSparkline = component$((props: { points: SparkPoint[]; width?: number; height?: number }) => {
  const w = props.width ?? 74;
  const h = props.height ?? 24;
  const pts = props.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length < 2) {
    return <div class="h-6 w-[74px] rounded bg-[#001217]/80" />;
  }
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const spanY = Math.max(maxY - minY, 0.0001);
  const spanX = Math.max(maxX - minX, 0.0001);
  const path = pts
    .map((p, i) => {
      const x = ((p.x - minX) / spanX) * w;
      const y = h - ((p.y - minY) / spanY) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const up = pts[pts.length - 1]!.y >= pts[0]!.y;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} class="overflow-visible">
      <path d={path} fill="none" stroke={up ? "rgba(52,211,153,0.95)" : "rgba(251,113,133,0.95)"} stroke-width="2" />
    </svg>
  );
});

