import { component$ } from "@builder.io/qwik";

/** Neutral explanation of how market data reaches the app (no third-party branding). */
export const DataSyncExplainer = component$(() => {
  return (
    <aside class="rounded-xl border border-[#043234]/70 bg-[#001318]/80 p-4 text-sm text-slate-400 leading-relaxed">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-[#04E6E6]/90 mb-2">
        Cómo se actualizan los datos
      </h3>
      <ul class="list-disc pl-5 space-y-2">
        <li>
          <strong class="text-slate-300">Mercado y rankings:</strong> precios, capitalización, flujos y operaciones DEX
          de alto nivel que alimentan vistas como Smart money se refrescan de forma periódica para mantener la
          coherencia entre todas las pantallas.
        </li>
        <li>
          <strong class="text-slate-300">Carteras y rendimiento:</strong> los datos de wallets, NFTs, actividad por
          intercambio y métricas de rendimiento por activo se preparan en segundo plano. Por eso las vistas cargan al
          instante sin depender de respuestas externas en tiempo real.
        </li>
      </ul>
    </aside>
  );
});
