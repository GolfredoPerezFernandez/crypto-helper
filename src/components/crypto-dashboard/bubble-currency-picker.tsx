import { component$, useSignal, type PropFunction } from "@builder.io/qwik";
import {
  BUBBLE_QUOTE_CRYPTO,
  BUBBLE_QUOTE_FIAT,
  type BubbleCryptoAnchors,
  type BubbleQuoteId,
  bubbleQuoteFactor,
} from "~/utils/bubble-quote";

export const BubbleCurrencyPicker = component$(
  (props: {
    value: BubbleQuoteId;
    onChange$: PropFunction<(id: BubbleQuoteId) => void>;
    fxRates: Record<string, number>;
    cryptoUsd: BubbleCryptoAnchors;
  }) => {
    const open = useSignal(false);

    const fiatAvailable = (id: BubbleQuoteId) =>
      id === "USD" || (props.fxRates[id] != null && props.fxRates[id]! > 0);

    const cryptoAvailable = (id: BubbleQuoteId) => {
      const { ok } = bubbleQuoteFactor(id, props.fxRates, props.cryptoUsd);
      return ok;
    };

    const currentLabel =
      [...BUBBLE_QUOTE_FIAT, ...BUBBLE_QUOTE_CRYPTO].find((x) => x.id === props.value)?.label ?? props.value;

    return (
      <div class="relative">
        <button
          type="button"
          class="flex min-w-[7.5rem] items-center justify-between gap-1 rounded-lg border border-[#043234] bg-[#060d0e] px-2 py-2 text-left text-xs text-gray-200 hover:border-[#04E6E6]/50"
          onClick$={() => {
            open.value = !open.value;
          }}
          aria-expanded={open.value}
          aria-haspopup="listbox"
        >
          <span class="truncate">{currentLabel}</span>
          <span class="text-gray-500">{open.value ? "\u25B2" : "\u25BC"}</span>
        </button>

        {open.value ? (
          <>
            <button
              type="button"
              class="fixed inset-0 z-40 cursor-default bg-black/20"
              aria-label="Close"
              onClick$={() => {
                open.value = false;
              }}
            />
            <div class="absolute right-0 z-50 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[#043234] bg-[#0a1214] p-3 shadow-xl shadow-black/40">
              <div class="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p class="mb-2 font-semibold uppercase tracking-wide text-gray-500">Fiat</p>
                  <ul class="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-1" role="listbox">
                    {BUBBLE_QUOTE_FIAT.map((c) => {
                      const ok = fiatAvailable(c.id);
                      const sel = props.value === c.id;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            disabled={!ok}
                            class={`w-full rounded-md px-2 py-1.5 text-left transition-colors ${
                              sel
                                ? "bg-[#04E6E6]/20 text-[#04E6E6]"
                                : ok
                                  ? "text-gray-300 hover:bg-[#043234]/80"
                                  : "cursor-not-allowed text-gray-600"
                            }`}
                            onClick$={() => {
                              if (!ok) return;
                              props.onChange$(c.id);
                              open.value = false;
                            }}
                          >
                            {c.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <p class="mb-2 font-semibold uppercase tracking-wide text-gray-500">Crypto</p>
                  <ul class="flex flex-col gap-0.5" role="listbox">
                    {BUBBLE_QUOTE_CRYPTO.map((c) => {
                      const ok = cryptoAvailable(c.id);
                      const sel = props.value === c.id;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            disabled={!ok}
                            class={`w-full rounded-md px-2 py-1.5 text-left transition-colors ${
                              sel
                                ? "bg-[#04E6E6]/20 text-[#04E6E6]"
                                : ok
                                  ? "text-gray-300 hover:bg-[#043234]/80"
                                  : "cursor-not-allowed text-gray-600"
                            }`}
                            onClick$={() => {
                              if (!ok) return;
                              props.onChange$(c.id);
                              open.value = false;
                            }}
                          >
                            {c.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <p class="mt-2 border-t border-[#043234]/60 pt-2 text-[10px] text-gray-600 leading-snug">
                Sizes use stored USD values × exchange rate. Percent change uses cached USD market data.
              </p>
            </div>
          </>
        ) : null}
      </div>
    );
  },
);
