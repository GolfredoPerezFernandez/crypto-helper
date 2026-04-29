import { component$, useSignal, $ } from "@builder.io/qwik";
import { askCryptoGhostDb } from "~/server/db-chat-actions";
import { useRequirePro } from "../use-require-pro";
import { useDashboardAuth } from "../../layout";

// Re-export loader so Qwik City can register it for this route.
export { useRequirePro } from "../use-require-pro";

export default component$(() => {
  useRequirePro();
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const question = useSignal("");
  const answer = useSignal("");
  const loading = useSignal(false);
  const err = useSignal<string | null>(null);

  const send = $(async () => {
    err.value = null;
    answer.value = "";
    loading.value = true;
    try {
      const r = await askCryptoGhostDb(question.value);
      if (!r.ok) {
        err.value = r.error;
        return;
      }
      answer.value = r.answer;
    } finally {
      loading.value = false;
    }
  });

  return (
    <div class="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-white">DB insight (IA)</h1>
        <p class="mt-2 text-sm text-slate-400">
          {showSync ? (
            <>
              Solo suscriptores Pro. Pregunta en lenguaje natural sobre el estado agregado de la base (tokens, tableros
              de mercado, señales whale/trader, sincronización, datos cacheados, direcciones demo). Solo lectura: usuarios, credenciales y{" "}
              <span class="text-slate-500">push_subscriptions</span> no están expuestos. Respuestas orientativas — no es
              asesoramiento financiero ni recomendación personalizada.
            </>
          ) : (
            <>
              Solo suscriptores Pro. Pregunta en lenguaje natural sobre mercado agregado, señales y tableros. Solo
              lectura: datos personales sensibles no están expuestos. Respuestas orientativas — no es asesoramiento
              financiero ni recomendación personalizada.
            </>
          )}
        </p>
      </div>

      <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
        <label class="block text-xs font-medium uppercase tracking-wide text-slate-500">Pregunta</label>
        <textarea
          class="mt-2 w-full rounded-lg border border-[#043234] bg-[#000D0E] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#04E6E6]/50 focus:outline-none"
          rows={4}
          placeholder="Ej.: ¿Qué tokens meme subieron más esta semana en la base? ¿Resumen de últimas whale alerts? ¿Ideas generales según señales recientes?"
          value={question.value}
          onInput$={(e) => {
            question.value = (e.target as HTMLTextAreaElement).value;
          }}
        />
        <button
          type="button"
          disabled={loading.value}
          class="mt-3 rounded-lg bg-[#04E6E6] px-4 py-2 text-sm font-semibold text-[#001a1c] disabled:opacity-50"
          onClick$={send}
        >
          {loading.value ? "Consultando…" : "Preguntar"}
        </button>
      </div>

      {err.value ? (
        <div class="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">{err.value}</div>
      ) : null}

      {answer.value ? (
        <div class="rounded-xl border border-[#043234] bg-[#000D0E]/80 p-4">
          <h2 class="text-xs font-medium uppercase tracking-wide text-slate-500">Respuesta</h2>
          <pre class="mt-3 whitespace-pre-wrap text-sm text-slate-200 font-sans">{answer.value}</pre>
        </div>
      ) : null}
    </div>
  );
});
