import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { EvmAddrLinks } from "~/components/crypto-dashboard/evm-dash-links";
import type { DexActivityHighlightBundle } from "~/server/crypto-helper/dex-activity-highlight";

export const DexActivityWalletsSection = component$(
  (props: { locale: string; bundle: DexActivityHighlightBundle | null }) => {
    const L = props.locale;
    const b = props.bundle;
    if (!b?.wallets?.length) return null;

    const refreshed =
      b.syncedAt > 0
        ? new Date(b.syncedAt * 1000).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : null;

    return (
      <section class="space-y-4">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-[#04E6E6] sm:text-2xl">
            Wallets con actividad reciente en DEX
          </h2>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            Resumen agregado a partir del último panel de operaciones en DEX del sync principal: direcciones que
            aparecen con más filas en ese recorte.
            {refreshed ? (
              <>
                {" "}
                <span class="text-slate-400">Procesado: {refreshed}.</span>
              </>
            ) : null}
          </p>
        </div>

        <div class="overflow-x-auto rounded-xl border border-[#043234]/80 bg-[#001318]/95 text-xs">
          <table class="w-full text-left">
            <thead class="border-b border-[#043234] bg-[#001a1d] text-[#04E6E6]/95">
              <tr>
                <th class="px-3 py-2.5 font-semibold">Wallet</th>
                <th class="px-3 py-2.5 font-semibold">Apariciones</th>
                <th class="px-3 py-2.5 font-semibold">Etiqueta</th>
                <th class="px-3 py-2.5 font-semibold">Red / token</th>
                <th class="px-3 py-2.5 font-semibold">Último evento</th>
              </tr>
            </thead>
            <tbody class="text-slate-200">
              {b.wallets.map((w) => (
                <tr key={w.address} class="border-b border-[#043234]/40">
                  <td class="px-3 py-2 font-mono">
                    <EvmAddrLinks
                      locale={L}
                      moralisChain={w.lastChain ?? "eth"}
                      address={w.address}
                      variant="wallet"
                    />
                  </td>
                  <td class="px-3 py-2 tabular-nums">{w.tradeCount}</td>
                  <td class="px-3 py-2 max-w-[14rem] truncate text-slate-300" title={w.label ?? ""}>
                    {w.label ?? "—"}
                  </td>
                  <td class="px-3 py-2 text-slate-400">
                    {[w.lastChain, w.lastTokenSymbol].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td class="px-3 py-2 text-slate-500 whitespace-nowrap">{w.lastTimestamp ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p class="text-[11px] text-slate-600">
          Tabla detallada de operaciones:{" "}
          <Link class="text-[#04E6E6] hover:underline" href={`/${L}/smart-money/?tab=dex-trades`}>
            Smart money · DEX
          </Link>{" "}
          (requiere plan Pro).
        </p>
      </section>
    );
  },
);
