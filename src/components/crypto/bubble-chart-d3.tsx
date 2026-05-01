import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { usableTokenLogoUrl } from "~/components/crypto-dashboard/token-logo";
import { formatBubbleMetricFromUsd, type BubbleQuoteId } from "~/utils/bubble-quote";

/** Color / % change axis (Crypto Bubbles–style timeframes). */
export type BubbleTimeframe = "1h" | "24h" | "7d" | "30d" | "90d";

/** Bubble radius ~ sqrt(metric). `fdv` uses fully diluted valuation as a market-cap proxy. */
export type BubbleSizeBy = "volume" | "fdv";
export type BubbleColorBy = "performance" | "neutral";
export type BubbleContentBy = "symbol" | "symbol-change" | "name";

export interface BubbleToken {
  id: number;
  symbol: string;
  name: string;
  logo?: string | null;
  volume: string | number;
  fullyDilutedValuation?: string | number;
  percentChange1h: string | number;
  percentChange24h?: string | number;
  percentChange7d: string | number;
  percentChange30d: string | number;
  percentChange90d?: string | number;
}

type SimNode = BubbleToken & {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  tx?: number;
  ty?: number;
};

const POS_STROKE = "rgba(0, 255, 160, 0.95)";
const NEG_STROKE = "rgba(255, 82, 82, 0.95)";
const POS_GRAD_CENTER = "rgba(0, 230, 118, 0.65)";
const NEG_GRAD_CENTER = "rgba(255, 82, 82, 0.55)";

function parsePctField(raw: string | number | null | undefined): number {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const s = String(raw).trim().replace(/%/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function pctForTimeframe(t: BubbleToken, tf: BubbleTimeframe): number {
  switch (tf) {
    case "1h":
      return parsePctField(t.percentChange1h);
    case "24h": {
      if (t.percentChange24h !== undefined && t.percentChange24h !== "") {
        return parsePctField(t.percentChange24h);
      }
      return parsePctField(t.percentChange7d);
    }
    case "7d":
      return parsePctField(t.percentChange7d);
    case "30d":
      return parsePctField(t.percentChange30d);
    case "90d": {
      if (t.percentChange90d !== undefined && t.percentChange90d !== "") {
        return parsePctField(t.percentChange90d);
      }
      return parsePctField(t.percentChange30d);
    }
    default:
      return 0;
  }
}

export function bubbleSizeValue(t: BubbleToken, sizeBy: BubbleSizeBy): number {
  if (sizeBy === "fdv") return Math.max(Number(t.fullyDilutedValuation) || 0, 0);
  return Math.max(Number(t.volume) || 0, 0);
}

function bubbleDisplaySize(t: BubbleToken, sizeBy: BubbleSizeBy, quoteScale: number): number {
  return bubbleSizeValue(t, sizeBy) * quoteScale;
}

function formatPct(p: number): string {
  const n = Math.abs(p).toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  if (p > 0) return `+${n}%`;
  if (p < 0) return `-${n}%`;
  return `${Number(0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function momentumRadiusFactor(pct: number): number {
  const abs = Math.abs(pct);
  // Keep relation with % change without making bubbles jump too hard.
  // ~2.5% => ~0.93x, ~6% => ~1.05x, ~10% => ~1.17x, capped.
  const raw = 0.88 + abs / 35;
  return Math.max(0.86, Math.min(1.22, raw));
}

function spiralSeed(i: number, total: number, width: number, height: number): { x: number; y: number } {
  const t = Math.max(total, 1);
  const angle = i * 2.3999632297; // golden angle
  const rx = width * 0.48;
  const ry = height * 0.44;
  const r01 = Math.sqrt((i + 0.5) / t);
  const jitter = Math.max(4, Math.min(width, height) * 0.012);
  return {
    x: width / 2 + Math.cos(angle) * rx * r01 + (Math.random() - 0.5) * jitter,
    y: height / 2 + Math.sin(angle) * ry * r01 + (Math.random() - 0.5) * jitter,
  };
}

export const BubbleChartD3 = component$(
  (props: {
    list: BubbleToken[];
    timeframe: BubbleTimeframe;
    sizeBy: BubbleSizeBy;
    colorBy?: BubbleColorBy;
    contentBy?: BubbleContentBy;
    highlightedTokenIds?: number[];
    quoteScale?: number;
    quoteId?: BubbleQuoteId;
  }) => {
    const hostRef = useSignal<HTMLDivElement>();

    useVisibleTask$(async ({ track, cleanup }) => {
      track(() => props.timeframe);
      track(() => props.sizeBy);
      track(() => props.colorBy ?? "performance");
      track(() => props.contentBy ?? "symbol-change");
      track(() => (props.highlightedTokenIds ?? []).join(","));
      track(() => props.quoteScale ?? 1);
      track(() => props.quoteId ?? "USD");
      track(() => props.list.length);
      track(() => props.list.map((t) => t.id).join(","));
      track(() =>
        props.list
          .map((t) =>
            [
              t.id,
              t.percentChange1h,
              t.percentChange24h,
              t.percentChange7d,
              t.percentChange30d,
              t.percentChange90d,
            ].join(":"),
          )
          .join("|"),
      );

      const rawList = props.list;
      const timeframe = props.timeframe;
      const sizeBy = props.sizeBy;
      const colorBy = props.colorBy ?? "performance";
      const contentBy = props.contentBy ?? "symbol-change";
      const highlighted = new Set((props.highlightedTokenIds ?? []).map((n) => Number(n)));
      const quoteScale = props.quoteScale ?? 1;
      const quoteId = props.quoteId ?? "USD";
      const host = hostRef.value;
      if (!host || rawList.length === 0) return;

      const d3 = await import("d3");
      const uid = Math.random().toString(36).slice(2, 9);
      const gradPos = `cg-pos-${uid}`;
      const gradNeg = `cg-neg-${uid}`;
      const filtGlowPos = `cg-glow-pos-${uid}`;
      const filtGlowNeg = `cg-glow-neg-${uid}`;

      let simulation: d3.Simulation<SimNode, undefined> | null = null;
      let resizeTimer: ReturnType<typeof setTimeout> | null = null;
      let ro: ResizeObserver | null = null;

      const mount = () => {
        const width = Math.max(host!.clientWidth || 800, 320);
        const height = Math.max(host!.clientHeight || 520, 360);
        const isMobile = width < 768;
        const isWide = width >= 1400;
        const isUltraWide = width >= 1900;
        const isTvWide = width >= 2400;
        const count = Math.max(rawList.length, 1);
        const area = width * height;
        const densityTarget = isTvWide ? 0.74 : isUltraWide ? 0.7 : isWide ? 0.66 : 0.6;
        const baseRadius = Math.sqrt((area * densityTarget) / (Math.PI * count));
        const countBoost = count <= 100 ? 1.2 : count <= 150 ? 1.12 : count <= 220 ? 1.06 : 1;
        const densityBoost = isTvWide ? 1.35 : isUltraWide ? 1.24 : isWide ? 1.14 : 1;
        const radiusBoost = countBoost * densityBoost;
        const minR = Math.max(isMobile ? 18 : 24, Math.min((baseRadius * (isMobile ? 0.64 : 0.72)) * radiusBoost, isTvWide ? 68 : 52));
        const maxR = Math.max(minR + 12, Math.min((baseRadius * (isMobile ? 1.95 : 2.3)) * radiusBoost, isTvWide ? 250 : isUltraWide ? 210 : 172));
        const labelThreshold = isMobile ? 28 : 32;

        const sizes = rawList.map((t) => bubbleDisplaySize(t, sizeBy, quoteScale));
        const maxS = Math.max(...sizes, 1);
        const minS = Math.min(...sizes.filter((v) => v > 0), maxS) || 0;

        const scaleR = d3.scaleSqrt().domain([minS, maxS]).range([minR, maxR]).clamp(true);

        const nodes: SimNode[] = rawList.map((t) => ({ ...t }));
        // Place larger bubbles first in a spiral seed for organic packing.
        const bySize = [...nodes]
          .map((n) => ({ n, s: bubbleDisplaySize(n, sizeBy, quoteScale) }))
          .sort((a, b) => b.s - a.s);
        bySize.forEach(({ n }, i) => {
          const p = spiralSeed(i, bySize.length, width, height);
          n.x = p.x;
          n.y = p.y;
        });

        d3.select(host!).selectAll("svg").remove();

        const svg = d3
          .select(host!)
          .append("svg")
          .attr("class", "w-full h-full block")
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("preserveAspectRatio", "xMidYMid meet")
          .style("overflow", "hidden");

        const defs = svg.append("defs");

        const radial = (id: string, center: string) => {
          const g = defs
            .append("radialGradient")
            .attr("id", id)
            .attr("cx", "42%")
            .attr("cy", "42%")
            .attr("r", "65%");
          g.append("stop").attr("offset", "0%").attr("stop-color", center).attr("stop-opacity", 0.72);
          g.append("stop").attr("offset", "70%").attr("stop-color", center).attr("stop-opacity", 0.22);
          g.append("stop").attr("offset", "100%").attr("stop-color", "#0a0f10").attr("stop-opacity", 0.05);
        };
        radial(gradPos, POS_GRAD_CENTER);
        radial(gradNeg, NEG_GRAD_CENTER);

        const makeGlowFilter = (fid: string) => {
          const f = defs
            .append("filter")
            .attr("id", fid)
            .attr("x", "-80%")
            .attr("y", "-80%")
            .attr("width", "260%")
            .attr("height", "260%");
          f.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "2.8").attr("result", "blur");
          const merge = f.append("feMerge");
          merge.append("feMergeNode").attr("in", "blur");
          merge.append("feMergeNode").attr("in", "SourceGraphic");
        };
        makeGlowFilter(filtGlowPos);
        makeGlowFilter(filtGlowNeg);

        const radiusFor = (d: SimNode) => {
          const v = bubbleDisplaySize(d, sizeBy, quoteScale);
          const base = scaleR(v);
          const p = pctForTimeframe(d, timeframe);
          const perfFactor = momentumRadiusFactor(p);
          return base * perfFactor;
        };

        simulation?.stop();
        const collidePad = isTvWide ? 2.8 : isUltraWide ? 3.4 : isWide ? 4.2 : 5.2;
        simulation = d3
          .forceSimulation<SimNode>(nodes)
          .force(
            "collide",
            d3
              .forceCollide<SimNode>()
              .radius((d) => radiusFor(d) + 3 + collidePad)
              .strength(1)
              .iterations(3),
          )
          .force("center", d3.forceCenter(width / 2, height / 2).strength(isTvWide ? 0.032 : isWide ? 0.028 : 0.024))
          .force("x", d3.forceX(width / 2).strength(isTvWide ? 0.01 : isWide ? 0.009 : 0.008))
          .force("y", d3.forceY(height / 2).strength(isTvWide ? 0.01 : isWide ? 0.009 : 0.008))
          .force("charge", d3.forceManyBody().strength(isTvWide ? -16 : isWide ? -22 : -28).distanceMax(Math.max(width, height)))
          .alphaTarget(0.12)
          .restart();

        const node = svg.selectAll<SVGGElement, SimNode>("g").data(nodes).enter().append("g");

        node
          .append("circle")
          .attr("class", "bubble-halo")
          .attr("r", (d) => radiusFor(d) + 5)
          .attr("fill", "none")
          .attr("stroke", (d) => (colorBy === "neutral" ? "rgba(120, 225, 255, 0.9)" : pctForTimeframe(d, timeframe) >= 0 ? POS_STROKE : NEG_STROKE))
          .attr("stroke-width", 2)
          .style("opacity", 0.55)
          .style("filter", (d) => (pctForTimeframe(d, timeframe) >= 0 ? `url(#${filtGlowPos})` : `url(#${filtGlowNeg})`))
          .style("pointer-events", "none");

        const core = node
          .append("circle")
          .attr("class", "bubble-core")
          .attr("r", (d) => radiusFor(d))
          .style("fill", (d) => {
            const p = pctForTimeframe(d, timeframe);
            if (colorBy === "neutral") return "rgba(19, 36, 40, 0.88)";
            return p >= 0 ? `url(#${gradPos})` : `url(#${gradNeg})`;
          })
          .attr("stroke", (d) => (colorBy === "neutral" ? "rgba(96, 210, 232, 0.95)" : pctForTimeframe(d, timeframe) >= 0 ? POS_STROKE : NEG_STROKE))
          .style("stroke-width", 3)
          .style("cursor", "grab");

        core
          .append("title")
          .text(
            (d) =>
              `${d.name} (${d.symbol}) · ${sizeBy === "fdv" ? "FDV" : "Vol"} ${formatBubbleMetricFromUsd(bubbleSizeValue(d, sizeBy), quoteId, quoteScale)} · ${timeframe} ${pctForTimeframe(d, timeframe).toFixed(2)}%`,
          );

        core
          .on("mouseover", function (_event, d) {
            const up = pctForTimeframe(d, timeframe) >= 0;
            node
              .transition()
              .duration(140)
              .style("opacity", (d2) => (pctForTimeframe(d2, timeframe) >= 0 === up ? 1 : 0.12));
          })
          .on("mouseout", function () {
            node.transition().duration(140).style("opacity", 1);
          });

        node.each(function (d) {
          const g = d3.select(this);
          const r = radiusFor(d);
          const logo = usableTokenLogoUrl(d.logo ?? null);
          const p = pctForTimeframe(d, timeframe);
          const pctStr = formatPct(p);

          const iconS = Math.min(r * 0.42, 38);
          if (logo && r > 18) {
            g.append("image")
              .attr("href", logo)
              .attr("x", -iconS / 2)
              .attr("y", -r * 0.72)
              .attr("width", iconS)
              .attr("height", iconS)
              .attr("preserveAspectRatio", "xMidYMid slice")
          }

          if (r > labelThreshold) {
            g.append("text")
              .attr("x", 0)
              .attr("y", r * 0.08)
              .attr("text-anchor", "middle")
              .style("font-size", `${Math.max(r / 2.9, 11)}px`)
              .style("font-weight", "800")
              .style("fill", "#ffffff")
              .style("pointer-events", "none")
              .style("text-shadow", "0 1px 3px rgba(0,0,0,0.85)")
              .text(contentBy === "name" ? d.name : d.symbol);

            if (contentBy === "symbol-change") {
              g.append("text")
                .attr("x", 0)
                .attr("y", r * 0.52)
                .attr("text-anchor", "middle")
                .style("font-size", `${Math.max(r / 4.2, 10)}px`)
                .style("font-weight", "600")
                .style("fill", "#f5f5f5")
                .style("pointer-events", "none")
                .style("text-shadow", "0 1px 2px rgba(0,0,0,0.8)")
                .text(pctStr);
            }
          } else if (r > 22) {
            g.append("text")
              .attr("x", 0)
              .attr("y", r * 0.15)
              .attr("text-anchor", "middle")
              .style("font-size", `${Math.max(r / 3.2, 9)}px`)
              .style("font-weight", "800")
              .style("fill", "#fff")
              .style("pointer-events", "none")
              .text(d.symbol);
          }

          if (highlighted.has(Number(d.id)) && r > 16) {
            g.append("circle")
              .attr("cx", r * 0.56)
              .attr("cy", -r * 0.56)
              .attr("r", Math.max(7, Math.min(12, r * 0.2)))
              .attr("fill", "rgba(245, 186, 48, 0.95)")
              .attr("stroke", "rgba(255,255,255,0.8)")
              .attr("stroke-width", 1.4)
              .style("pointer-events", "none");
            g.append("text")
              .attr("x", r * 0.56)
              .attr("y", -r * 0.56 + 3)
              .attr("text-anchor", "middle")
              .style("font-size", `${Math.max(9, r * 0.16)}px`)
              .style("font-weight", "800")
              .style("fill", "#1b1200")
              .style("pointer-events", "none")
              .text("★");
          }
        });

        const locale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] || "en-us" : "en-us";

        node.call(
          d3
            .drag<SVGGElement, SimNode>()
            .on("start", (event, d) => {
              if (!event.active) simulation!.alphaTarget(0.22).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on("drag", (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on("end", (event, d) => {
              if (!event.active) simulation!.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            }),
        );

        node.on("click", (_e, d) => {
          window.location.href = `/${locale}/token/${d.id}/`;
        });

        simulation!.nodes(nodes).on("tick", () => {
          node.attr("transform", (d) => {
            const edgePad = radiusFor(d) + 8;
            const minX = edgePad;
            const maxX = width - edgePad;
            const minY = edgePad;
            const maxY = height - edgePad;
            d.x = Math.max(minX, Math.min(maxX, d.x!));
            d.y = Math.max(minY, Math.min(maxY, d.y!));
            return `translate(${d.x},${d.y})`;
          });
        });
      };

      mount();

      const onResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          simulation?.stop();
          mount();
        }, 120);
      };

      window.addEventListener("resize", onResize);
      ro = new ResizeObserver(onResize);
      ro.observe(host);

      cleanup(() => {
        window.removeEventListener("resize", onResize);
        ro?.disconnect();
        if (resizeTimer) clearTimeout(resizeTimer);
        simulation?.stop();
        d3.select(host).selectAll("svg").remove();
      });
    });

    return (
      <div
        ref={hostRef}
        class="h-[min(86vh,1060px)] w-full min-h-[500px] overflow-hidden rounded-xl border border-[#1a2c2e]/90 bg-[#0d1114] 2xl:h-[min(90vh,1320px)] min-[2200px]:h-[min(92vh,1520px)]"
      />
    );
  },
);

// Legacy export name for any external imports
export type BubbleColorMode = BubbleTimeframe;
