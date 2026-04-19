import { component$ } from "@builder.io/qwik";
import { MORALIS_WALLET_LIVE_KINDS, moralisLiveSlotKey } from "./moralis-wallet-live-api";
import { WalletMoralisLiveBlock } from "./wallet-moralis-live-block";

export type ProLiveSlot = { error?: string; data?: unknown };

export const WalletMoralisProDashboard = component$(
  (props: {
    locale: string;
    slots: Record<string, ProLiveSlot>;
    loading: boolean;
  }) => {
    if (props.loading) {
      return (
        <div class="rounded-xl border border-[#043234] bg-[#000D0E]/50 px-4 py-8 text-center">
          <div class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#04E6E6]/30 border-t-[#04E6E6]" />
          <p class="text-sm text-gray-400">Cargando datos en vivo (Base + Ethereum, todos los tipos)…</p>
          <p class="mt-1 text-[11px] text-gray-600">18 solicitudes en paralelo · sesión requerida</p>
        </div>
      );
    }

    return (
      <div class="space-y-8">
        {MORALIS_WALLET_LIVE_KINDS.map(({ id, label }) => (
          <section
            key={id}
            class="rounded-xl border border-[#043234] bg-[#001a1c]/90 p-4 shadow-lg shadow-black/10"
          >
            <h3 class="mb-4 border-b border-[#043234]/60 pb-2 text-sm font-semibold tracking-tight text-white">
              {label}
            </h3>
            <div class="grid gap-4 lg:grid-cols-2">
              {(["base", "eth"] as const).map((chain) => {
                const key = moralisLiveSlotKey(id, chain);
                const slot = props.slots[key];
                const chainTitle = chain === "base" ? "Base" : "Ethereum";
                return (
                  <div
                    key={key}
                    class="rounded-lg border border-[#043234]/80 bg-[#000D0E]/60 p-3 ring-1 ring-black/20"
                  >
                    <div class="mb-3 flex items-center justify-between gap-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-[#04E6E6]/90">
                        {chainTitle}
                      </span>
                      {slot?.error ? (
                        <span class="max-w-[min(100%,12rem)] truncate text-[10px] text-amber-400" title={slot.error}>
                          Error
                        </span>
                      ) : null}
                    </div>
                    {slot?.error ? (
                      <p class="text-xs leading-relaxed text-amber-300/95">{slot.error}</p>
                    ) : slot?.data !== undefined ? (
                      <div class="space-y-3">
                        <WalletMoralisLiveBlock kind={id} chain={chain} locale={props.locale} payload={slot.data} />
                        <details class="group rounded border border-[#043234]/60 bg-black/25">
                          <summary class="cursor-pointer px-2 py-1.5 text-[10px] text-gray-500 hover:text-gray-400">
                            JSON · {chainTitle}
                          </summary>
                          <pre class="max-h-48 overflow-auto border-t border-[#043234]/40 p-2 text-[9px] leading-relaxed text-slate-500 font-mono whitespace-pre-wrap break-all">
                            {JSON.stringify(slot.data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ) : (
                      <p class="text-xs text-gray-600">Sin respuesta.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  },
);
