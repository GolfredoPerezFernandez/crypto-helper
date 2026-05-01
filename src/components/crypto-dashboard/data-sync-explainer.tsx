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
          <strong class="text-slate-300">Sync principal:</strong> corre con el ciclo de mercado global (rankings,
          métricas agregadas, flujos y operaciones DEX de alto nivel que alimentan vistas como Smart money).
        </li>
        <li>
          <strong class="text-slate-300">Sync auxiliar:</strong> corre después y rellena carteras, NFTs, listas de
          actividad por intercambio y bundles de rendimiento por activo. Lo que ves en estas pantallas viene de
          snapshots guardados en base de datos, no de llamadas en vivo al abrir la página.
        </li>
      </ul>
    </aside>
  );
});
