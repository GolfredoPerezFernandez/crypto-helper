import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import type { QRL } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { LuSend, LuSparkles, LuX } from "@qwikest/icons/lucide";
import { inlineTranslate, useSpeak } from "qwik-speak";
import { askCryptoGhostDb } from "~/server/db-chat-actions";

const TEASER_KEY = "cg_ai_fab_teaser_dismissed";

export type AiChatFabProps = {
  locale: string;
  isAuthenticated: boolean;
  hasPro: boolean;
  onOpenPro$: QRL<() => void>;
};

export const AiChatFab = component$((props: AiChatFabProps) => {
  useSpeak({ runtimeAssets: ["app"] });
  const t = inlineTranslate();

  const panelOpen = useSignal(false);
  const teaserDismissed = useSignal(false);
  const question = useSignal("");
  const answer = useSignal("");
  const loading = useSignal(false);
  const err = useSignal("");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(TEASER_KEY) === "1") {
        teaserDismissed.value = true;
      }
    } catch {
      /* ignore */
    }
  });

  const dismissTeaser = $(() => {
    teaserDismissed.value = true;
    try {
      sessionStorage.setItem(TEASER_KEY, "1");
    } catch {
      /* ignore */
    }
  });

  const openFromTeaser = $(() => {
    panelOpen.value = true;
    teaserDismissed.value = true;
    try {
      sessionStorage.setItem(TEASER_KEY, "1");
    } catch {
      /* ignore */
    }
  });

  const togglePanel = $(() => {
    const next = !panelOpen.value;
    panelOpen.value = next;
    if (next) {
      teaserDismissed.value = true;
      try {
        sessionStorage.setItem(TEASER_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  });

  const closePanel = $(() => {
    panelOpen.value = false;
  });

  const send = $(async () => {
    err.value = "";
    answer.value = "";
    const q = question.value.trim();
    if (!q) return;
    loading.value = true;
    try {
      const r = await askCryptoGhostDb(q);
      if (!r.ok) {
        err.value = r.error;
        return;
      }
      answer.value = r.answer;
    } finally {
      loading.value = false;
    }
  });

  const base = `/${props.locale}`;
  const showTeaser = !teaserDismissed.value && !panelOpen.value;

  return (
    <div
      class="pointer-events-none fixed bottom-0 right-0 z-[170] flex flex-col items-end gap-3 p-4 pb-[max(5.5rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] md:bottom-10 md:pb-[max(2.25rem,env(safe-area-inset-bottom))]"
      aria-live="polite"
    >
      {showTeaser ? (
        <div class="pointer-events-auto w-[min(calc(100vw-2rem),20rem)]">
          <div class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-black/20">
            <div class="flex gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <LuSparkles class="h-5 w-5" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-slate-900">{t("app.aiFab.teaserTitle@@Hey there!")}</p>
                <p class="mt-1 text-sm leading-snug text-slate-600">
                  {t(
                    "app.aiFab.teaserBody@@Questions about markets or the dashboard? Ask the AI assistant (Pro).",
                  )}
                </p>
                <p class="mt-2 text-[11px] text-slate-400">Crypto Helper · AI</p>
              </div>
            </div>
            <div class="mt-4 flex gap-2">
              <button
                type="button"
                class="pointer-events-auto flex-1 rounded-full border border-slate-200 bg-white py-2 text-sm font-medium text-blue-600 shadow-sm transition hover:bg-slate-50"
                onClick$={openFromTeaser}
              >
                {t("app.aiFab.teaserYes@@Yes")}
              </button>
              <button
                type="button"
                class="pointer-events-auto flex-1 rounded-full border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                onClick$={dismissTeaser}
              >
                {t("app.aiFab.teaserNo@@Not now")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {panelOpen.value ? (
        <div class="pointer-events-auto w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-2xl border border-[#043234] bg-[#001a1c] shadow-2xl shadow-black/40">
          <div class="flex items-center justify-between border-b border-[#043234] px-4 py-3">
            <div class="flex min-w-0 items-center gap-2">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white shadow-md">
                <LuSparkles class="h-4 w-4" />
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-white">{t("app.aiFab.panelTitle@@Assistant")}</p>
                <p class="truncate text-[10px] text-slate-500">{t("app.aiFab.panelSubtitle@@Crypto Helper · DB insight")}</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 hover:bg-[#043234] hover:text-white"
              aria-label={t("app.aiFab.close@@Close")}
              onClick$={closePanel}
            >
              <LuX class="h-5 w-5" />
            </button>
          </div>

          <div class="max-h-[min(50vh,22rem)] space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {!props.isAuthenticated ? (
              <div class="space-y-3">
                <p class="text-slate-400">{t("app.aiFab.signInLine@@Sign in to use the assistant and Pro features.")}</p>
                <Link
                  href={`${base}/login/?next=${encodeURIComponent(`${base}/db-insight/`)}`}
                  class="block w-full rounded-xl border border-[#043234] py-2.5 text-center text-sm font-medium text-[#04E6E6] transition hover:bg-[#043234]/50"
                  onClick$={closePanel}
                >
                  {t("app.footer.loginNav@@Login")}
                </Link>
              </div>
            ) : !props.hasPro ? (
              <div class="space-y-3">
                <p class="text-slate-400">{t("app.aiFab.proLine@@DB insight is a Pro feature. Upgrade to ask the AI about aggregated data.")}</p>
                <button
                  type="button"
                  class="w-full rounded-xl bg-amber-500/15 py-2.5 text-sm font-medium text-amber-200 ring-1 ring-amber-500/30 transition hover:bg-amber-500/25"
                  onClick$={props.onOpenPro$}
                >
                  {t("app.proUpgrade.nav@@Upgrade Pro")}
                </button>
              </div>
            ) : (
              <>
                <label class="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {t("app.aiFab.questionLabel@@Question")}
                </label>
                <textarea
                  class="mt-1 w-full rounded-xl border border-[#043234] bg-[#000D0E] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#04E6E6]/40 focus:outline-none"
                  rows={3}
                  placeholder={t("app.aiFab.placeholder@@Ask about market data, signals, sync…")}
                  value={question.value}
                  onInput$={(e) => {
                    question.value = (e.target as HTMLTextAreaElement).value;
                  }}
                />
                <button
                  type="button"
                  disabled={loading.value}
                  class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#04E6E6] py-2.5 text-sm font-semibold text-[#001a1c] disabled:opacity-50"
                  onClick$={send}
                >
                  <LuSend class="h-4 w-4" />
                  {loading.value ? t("app.aiFab.thinking@@Thinking…") : t("app.aiFab.send@@Send")}
                </button>
                {err.value ? (
                  <div class="rounded-lg border border-rose-500/30 bg-rose-950/25 px-3 py-2 text-xs text-rose-200">
                    {err.value}
                  </div>
                ) : null}
                {answer.value ? (
                  <div class="rounded-xl border border-[#043234] bg-[#000D0E]/80 p-3">
                    <p class="text-[10px] font-medium uppercase tracking-wide text-slate-500">{t("app.aiFab.answerLabel@@Answer")}</p>
                    <pre class="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-200">
                      {answer.value}
                    </pre>
                  </div>
                ) : null}
              </>
            )}

            <Link
              href={`${base}/db-insight/`}
              class="block text-center text-xs text-[#04E6E6] underline-offset-2 hover:underline"
              onClick$={closePanel}
            >
              {t("app.aiFab.openFullPage@@Open full DB insight page")}
            </Link>
          </div>
        </div>
      ) : null}

      <div class="pointer-events-auto relative self-end">
        {showTeaser ? (
          <span class="absolute -right-0.5 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
            1
          </span>
        ) : null}
        <button
          type="button"
          class="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 via-indigo-800 to-violet-900 text-white shadow-lg shadow-indigo-900/40 ring-2 ring-white/10 transition hover:scale-[1.03] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#04E6E6]"
          aria-label={t("app.aiFab.fabAria@@Open AI assistant")}
          onClick$={togglePanel}
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-inner">
            <LuSparkles class="h-5 w-5 text-white" />
          </span>
        </button>
      </div>
    </div>
  );
});
