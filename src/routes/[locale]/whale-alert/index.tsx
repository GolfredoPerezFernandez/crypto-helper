import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LuExternalLink, LuRadio } from "@qwikest/icons/lucide";
import { inlineTranslate } from "qwik-speak";
import {
  getGlobalSnapshotJson,
  getGlobalSnapshotRecord,
  GLOBAL_WHALE_ALERT_BUNDLE,
} from "~/server/crypto-helper/api-snapshot-sync";
import type { WhaleAlertFetchRow } from "~/server/crypto-helper/whale-alert-api";
import { buildSeo, localeFromParams } from "~/utils/seo";

export const head: DocumentHead = ({ url, params }) => {
  const locale = localeFromParams(params);
  return buildSeo({
    title: "Whale Alert · on-chain transfers | Crypto Helper",
    description:
      "Cached Whale Alert Enterprise REST samples (status, transactions, blocks) and integration notes. Data refreshes on daily sync — no live API calls when you open this page.",
    canonicalUrl: url.href,
    locale,
  });
};

type WhaleBundle = {
  syncedAt?: number;
  configured?: boolean;
  results?: WhaleAlertFetchRow[];
  websocket?: {
    urlPublic?: string;
    subscribeAlertsExample?: Record<string, unknown>;
    subscribeSocialsExample?: Record<string, unknown>;
  };
  notes?: string[];
};

export const useWhaleAlertLoader = routeLoader$(async () => {
  const bundle = await getGlobalSnapshotJson<WhaleBundle | null>(GLOBAL_WHALE_ALERT_BUNDLE);
  const row = await getGlobalSnapshotRecord(GLOBAL_WHALE_ALERT_BUNDLE);
  return {
    bundle,
    updatedAt: row?.updatedAt ?? null,
  };
});

export default component$(() => {
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const base = `/${L}`;
  const t = inlineTranslate();
  const data = useWhaleAlertLoader();

  const wantLive = useSignal(false);
  const liveStatus = useSignal<"off" | "connecting" | "live" | "error">("off");
  const liveItems = useSignal<unknown[]>([]);
  const liveErr = useSignal("");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => wantLive.value);
    if (!wantLive.value) {
      liveStatus.value = "off";
      liveErr.value = "";
      return;
    }
    liveStatus.value = "connecting";
    const es = new EventSource(`${window.location.origin}/api/stream/whale-alert`);
    const onOpen = () => {
      liveStatus.value = "live";
      liveErr.value = "";
    };
    const onMessage = (e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data as string) as unknown;
        liveItems.value = [j, ...liveItems.value].slice(0, 50);
      } catch {
        /* ignore */
      }
    };
    const onUpstreamErr = (e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data as string) as { error?: string; message?: string; reason?: string };
        liveErr.value = j.message || j.reason || j.error || "upstream error";
      } catch {
        liveErr.value = "upstream error";
      }
      liveStatus.value = "error";
    };
    es.addEventListener("open", onOpen);
    es.addEventListener("message", onMessage);
    es.addEventListener("upstream-error", onUpstreamErr);
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        liveStatus.value = "error";
        if (!liveErr.value)
          liveErr.value =
            "Connection closed — needs Pro, WHALE_ALERT_API_KEY on server, and yarn serve (Express) for /api/stream.";
      }
    };
    return () => {
      es.removeEventListener("open", onOpen);
      es.removeEventListener("message", onMessage);
      es.removeEventListener("upstream-error", onUpstreamErr);
      es.close();
    };
  });

  const b = data.value.bundle;
  const rows = b?.results ?? [];
  const syncedLabel =
    data.value.updatedAt != null
      ? new Date(data.value.updatedAt * 1000).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "medium",
        })
      : "—";

  return (
    <div class="mx-auto w-full max-w-[1100px] space-y-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-[#04E6E6]/80">
            {t("whaleAlertPage.kicker@@Whale Alert")}
          </p>
          <h1 class="text-2xl font-bold text-white mt-1">{t("whaleAlertPage.title@@Large transfers & REST samples")}</h1>
          <p class="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
            {t(
              "whaleAlertPage.subtitle@@Listado de transferencias relevantes. Los datos se refrescan periódicamente para mantener la página rápida y consistente.",
            )}
          </p>
        </div>
        <Link href={`${base}/home/`} class="text-sm text-[#04E6E6] hover:underline shrink-0">
          ← {t("whaleAlertPage.back@@Overview")}
        </Link>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
          <p class="text-[10px] uppercase tracking-wide text-slate-500">{t("whaleAlertPage.cacheUpdated@@Cache updated")}</p>
          <p class="text-lg font-semibold text-white mt-1 tabular-nums">{syncedLabel}</p>
          <p class="text-xs text-slate-500 mt-1">
            {b?.configured
              ? t("whaleAlertPage.keyOk@@API key configured on server")
              : t("whaleAlertPage.keyMissing@@WHALE_ALERT_API_KEY not set — bundle empty until configured")}
          </p>
        </div>
        <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
          <p class="text-[10px] uppercase tracking-wide text-slate-500">{t("whaleAlertPage.endpoints@@Endpoints cached")}</p>
          <p class="text-lg font-semibold text-[#04E6E6] mt-1 tabular-nums">{rows.length}</p>
          <p class="text-xs text-slate-500 mt-1">{t("whaleAlertPage.endpointsHint@@Enterprise + deprecated v1 status")}</p>
        </div>
      </div>

      <section class="rounded-xl border border-emerald-500/25 bg-[#001318]/90 p-4 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <LuRadio class="h-5 w-5 text-emerald-400 animate-pulse" />
              <h2 class="text-sm font-semibold text-white">
                {t("whaleAlertPage.liveTitle@@Live alerts (SSE)")}
              </h2>
            </div>
            <p class="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {t(
                "whaleAlertPage.liveDesc@@Server opens wss://leviathan.whale-alert.io/ws with your API key and streams events here. Requires Pro and Express (e.g. yarn serve after build — vite dev does not mount this route).",
              )}
            </p>
            <p class="text-[11px] text-amber-200/90 mt-2 leading-relaxed">
              {t(
                "whaleAlertPage.liveLimit@@Limited concurrent WebSocket connections per API key — disconnect when idle and avoid many tabs.",
              )}
            </p>
          </div>
          <div class="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
            <button
              type="button"
              disabled={!b?.configured}
              class={
                !b?.configured
                  ? "rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2 text-sm text-slate-500 cursor-not-allowed"
                  : wantLive.value
                    ? "rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-sm font-medium text-rose-100 hover:bg-rose-950/60"
                    : "rounded-lg border border-emerald-500/40 bg-emerald-950/35 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-950/55"
              }
              onClick$={() => {
                wantLive.value = !wantLive.value;
              }}
            >
              {wantLive.value
                ? t("whaleAlertPage.liveDisconnect@@Disconnect")
                : t("whaleAlertPage.liveConnect@@Connect live")}
            </button>
            <span class="text-[11px] text-slate-500 text-right tabular-nums">
              {liveStatus.value === "off"
                ? t("whaleAlertPage.liveOff@@Idle")
                : liveStatus.value === "connecting"
                  ? t("whaleAlertPage.liveConnecting@@Connecting…")
                  : liveStatus.value === "live"
                    ? t("whaleAlertPage.liveOn@@Streaming")
                    : t("whaleAlertPage.liveError@@Error")}
            </span>
          </div>
        </div>
        {!b?.configured ? (
          <p class="text-xs text-slate-500">{t("whaleAlertPage.liveNeedsKey@@Set WHALE_ALERT_API_KEY on the server to enable the live bridge.")}</p>
        ) : null}
        {liveErr.value ? (
          <p class="text-xs text-rose-300/95 whitespace-pre-wrap">{liveErr.value}</p>
        ) : null}
        <div class="rounded-lg border border-[#043234]/80 bg-black/25 max-h-96 overflow-auto p-3">
          {liveItems.value.length === 0 ? (
            <p class="text-xs text-slate-500 py-6 text-center">
              {wantLive.value
                ? t("whaleAlertPage.liveWaiting@@Waiting for messages…")
                : t("whaleAlertPage.liveEmpty@@Connect to append incoming alerts above.")}
            </p>
          ) : (
            <ul class="space-y-3">
              {liveItems.value.map((row, i) => (
                <li key={i} class="rounded-md border border-[#043234]/50 bg-[#001317]/80 p-2">
                  <pre class="text-[10px] text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                    {JSON.stringify(row, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {b?.notes && b.notes.length > 0 ? (
        <div class="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90 space-y-2">
          <p class="font-semibold text-amber-200">{t("whaleAlertPage.notesTitle@@Notes")}</p>
          <ul class="list-disc pl-5 space-y-1 text-amber-100/85">
            {b.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section class="rounded-xl border border-[#043234] bg-[#000d0e]/90 overflow-hidden">
        <div class="px-4 py-3 border-b border-[#043234] flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-white">{t("whaleAlertPage.restTitle@@Enterprise REST (cached samples)")}</h2>
          <a
            href="https://developer.whale-alert.io/documentation/"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1 text-xs text-[#04E6E6] hover:underline"
          >
            {t("whaleAlertPage.docs@@Documentation")}
            <LuExternalLink class="h-3.5 w-3.5" />
          </a>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#001317] text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-4 py-2 font-medium">{t("whaleAlertPage.colId@@ID")}</th>
                <th class="px-4 py-2 font-medium">{t("whaleAlertPage.colPath@@Path")}</th>
                <th class="px-4 py-2 font-medium">{t("whaleAlertPage.colStatus@@HTTP")}</th>
                <th class="px-4 py-2 font-medium">{t("whaleAlertPage.colPreview@@Preview")}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#043234]/70 text-slate-300">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} class="px-4 py-8 text-center text-slate-500">
                    {t(
                      "whaleAlertPage.empty@@Aún no hay datos disponibles. Vuelve más tarde.",
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} class="align-top hover:bg-[#001a1c]/50">
                    <td class="px-4 py-2 font-mono text-[11px] text-cyan-100/90 whitespace-nowrap">{r.id}</td>
                    <td class="px-4 py-2 text-[11px] text-slate-400 max-w-[min(28rem,45vw)] break-all">{r.pathLabel}</td>
                    <td class="px-4 py-2 tabular-nums">
                      <span class={r.ok ? "text-emerald-300" : "text-rose-300"}>{r.status}</span>
                    </td>
                    <td class="px-4 py-2">
                      <details class="cursor-pointer">
                        <summary class="text-[11px] text-[#04E6E6] select-none">
                          {t("whaleAlertPage.viewJson@@JSON")}
                        </summary>
                        <pre class="mt-2 max-h-56 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] text-slate-400 whitespace-pre-wrap">
                          {JSON.stringify(r.body ?? r.error ?? {}, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c]/70 p-4 space-y-3">
        <div class="flex items-center gap-2">
          <LuRadio class="h-5 w-5 text-[#04E6E6]" />
          <h2 class="text-sm font-semibold text-white">{t("whaleAlertPage.wsTitle@@WebSocket (Custom Alerts API)")}</h2>
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">
          {t(
            "whaleAlertPage.wsDesc@@Direct WebSocket uses wss://leviathan.whale-alert.io/ws — use a trusted backend (this app proxies via GET /api/stream/whale-alert). Never put your API key in the browser bundle.",
          )}
        </p>
        <div class="grid gap-3 md:grid-cols-2">
          <div class="rounded-lg border border-[#043234]/80 bg-[#001317]/80 p-3">
            <p class="text-[10px] uppercase text-slate-500 mb-1">{t("whaleAlertPage.wsSubscribeAlerts@@subscribe_alerts example")}</p>
            <pre class="text-[10px] text-slate-400 overflow-auto max-h-40 whitespace-pre-wrap">
              {JSON.stringify(b?.websocket?.subscribeAlertsExample ?? {}, null, 2)}
            </pre>
          </div>
          <div class="rounded-lg border border-[#043234]/80 bg-[#001317]/80 p-3">
            <p class="text-[10px] uppercase text-slate-500 mb-1">{t("whaleAlertPage.wsSubscribeSocials@@subscribe_socials example")}</p>
            <pre class="text-[10px] text-slate-400 overflow-auto max-h-40 whitespace-pre-wrap">
              {JSON.stringify(b?.websocket?.subscribeSocialsExample ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
});
