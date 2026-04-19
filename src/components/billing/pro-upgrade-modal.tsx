import { component$, useSignal, $ } from "@builder.io/qwik";
import type { QRL } from "@builder.io/qwik";
import { LuX, LuCopy, LuLoader2, LuZap } from "@qwikest/icons/lucide";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { base } from "viem/chains";
import { inlineTranslate } from "qwik-speak";
import { useWallet } from "~/hooks/useWallet";
import { getProChainEntry, proPlanUsdtAmount, PRO_CHAIN_REGISTRY } from "~/constants/pro-networks";
import { switchOrAddEthereumChain } from "~/utils/evm-switch-chain";

const erc20TransferAbi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const DEFAULT_RECIPIENT = "0xf6657f7019e481204d26882d6b1bed1da1541896";

export const ProUpgradeModal = component$(
  (props: {
    onClose$: QRL<() => void>;
  }) => {
    const t = inlineTranslate();
    const { wallet } = useWallet();
    const busy = useSignal(false);
    const err = useSignal("");
    const manualHash = useSignal("");
    const chainId = useSignal<number>(base.id);

    const recipient = (import.meta.env.PUBLIC_PRO_PAYMENT_RECIPIENT || DEFAULT_RECIPIENT).trim() as `0x${string}`;

    const copyRecipient = $(async (e: Event) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(recipient);
      } catch {
        /* ignore */
      }
    });

    const postVerify = $(async (hash: string, cid: number) => {
      err.value = "";
      busy.value = true;
      try {
        const res = await fetch("/api/crypto/billing/verify-pro-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ txHash: hash.trim(), chainId: cid }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!data.ok) {
          err.value = data.error || t("app.proUpgrade.verifyFail@@Could not verify payment.");
          return;
        }
        window.location.reload();
      } catch {
        err.value = t("app.proUpgrade.networkError@@Network error. Try again.");
      } finally {
        busy.value = false;
      }
    });

    const payWithWallet = $(async () => {
      err.value = "";
      const eth = typeof window !== "undefined" ? (window as unknown as { ethereum?: unknown }).ethereum : null;
      if (!wallet.connected || !wallet.address || !eth) {
        err.value = t("app.proUpgrade.needWallet@@Connect your wallet first.");
        return;
      }
      const entry = getProChainEntry(chainId.value);
      if (!entry) {
        err.value = t("app.proUpgrade.badChain@@Select a supported network.");
        return;
      }
      const switched = await switchOrAddEthereumChain(
        eth as { request: (a: unknown) => Promise<unknown> },
        entry.chain,
      );
      if (!switched) {
        err.value = t("app.proUpgrade.needSwitch@@Approve the network switch in your wallet, then try again.");
        return;
      }
      busy.value = true;
      try {
        const wc = createWalletClient({
          chain: entry.chain,
          transport: custom(eth as never),
        });
        const amount = proPlanUsdtAmount(entry.id);
        const hash = await wc.writeContract({
          address: entry.usdt,
          abi: erc20TransferAbi,
          functionName: "transfer",
          args: [recipient, amount],
          account: wallet.address as `0x${string}`,
        });
        const pc = createPublicClient({
          chain: entry.chain,
          transport: http(entry.chain.rpcUrls.default.http[0]),
        });
        await pc.waitForTransactionReceipt({ hash });
        await postVerify(hash, entry.id);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        err.value = msg || t("app.proUpgrade.txFail@@Transaction failed.");
      } finally {
        busy.value = false;
      }
    });

    const verifyManual = $(async () => {
      const h = manualHash.value.trim();
      if (!h || !/^0x[0-9a-fA-F]{64}$/.test(h)) {
        err.value = t("app.proUpgrade.badHash@@Enter a valid transaction hash (0x…).");
        return;
      }
      const entry = getProChainEntry(chainId.value);
      if (!entry) {
        err.value = t("app.proUpgrade.badChain@@Select a supported network.");
        return;
      }
      await postVerify(h, entry.id);
    });

    return (
      <div
        class="fixed inset-0 z-[220] flex items-end justify-center p-4 sm:items-center"
        role="presentation"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
          aria-label={t("app.proUpgrade.close@@Close")}
          onClick$={props.onClose$}
        />
        <div
          class="relative z-10 w-full max-w-md rounded-2xl border border-[#043234] bg-[#001a1c] p-6 shadow-2xl shadow-black/50"
          role="dialog"
          aria-modal="true"
          onClick$={(e) => e.stopPropagation()}
        >
          <div class="mb-4 flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#04E6E6]/15 text-[#04E6E6]">
                <LuZap class="h-5 w-5" />
              </span>
              <div>
                <h2 class="text-lg font-semibold text-white">{t("app.proUpgrade.title@@Upgrade to Pro")}</h2>
                <p class="text-xs text-slate-500">{t("app.proUpgrade.subtitle@@5 USDT · one-time · pick your network")}</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 hover:bg-[#043234] hover:text-white"
              aria-label={t("app.proUpgrade.close@@Close")}
              onClick$={props.onClose$}
            >
              <LuX class="h-5 w-5" />
            </button>
          </div>

          <div class="space-y-4 text-sm text-slate-300">
            <div>
              <label class="mb-1 block text-xs text-slate-500">{t("app.proUpgrade.network@@Network")}</label>
              <select
                class="w-full rounded-xl border border-[#043234] bg-[#000D0E]/70 px-3 py-2.5 text-sm text-white"
                value={chainId.value}
                onChange$={(e) => {
                  chainId.value = Number((e.target as HTMLSelectElement).value);
                }}
              >
                {PRO_CHAIN_REGISTRY.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} (chain {n.id})
                  </option>
                ))}
              </select>
              <p class="mt-1 text-[10px] text-slate-500">
                {getProChainEntry(chainId.value)?.decimals === 18
                  ? t("app.proUpgrade.bscDecimals@@BNB Chain uses 18-decimal USDT — amount is still exactly 5 USDT.")
                  : t("app.proUpgrade.usdtDecimals@@USDT uses 6 decimals on this network.")}
              </p>
            </div>

            <p>{t("app.proUpgrade.body@@Send exactly 5 USDT on the selected network to the treasury. Pro unlocks after confirmation.")}</p>
            <div class="rounded-xl border border-[#043234] bg-[#000D0E]/60 p-3">
              <p class="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {t("app.proUpgrade.recipient@@Recipient")}
              </p>
              <div class="mt-1 flex items-center gap-2">
                <code class="min-w-0 flex-1 break-all text-xs text-[#04E6E6]/90">{recipient}</code>
                <button
                  type="button"
                  onClick$={copyRecipient}
                  class="shrink-0 rounded-lg border border-[#043234] p-2 text-slate-400 hover:text-[#04E6E6]"
                  aria-label={t("app.proUpgrade.copy@@Copy address")}
                >
                  <LuCopy class="h-4 w-4" />
                </button>
              </div>
              <p class="mt-2 text-[10px] text-slate-500">
                USDT: <span class="font-mono text-slate-400">{getProChainEntry(chainId.value)?.usdt ?? ""}</span>
              </p>
              {getProChainEntry(chainId.value)?.explorerHintId ? (
                <p class="mt-2 text-[10px] leading-snug text-slate-500">
                  {t(
                    `app.proUpgrade.usdtExplorerHints.${getProChainEntry(chainId.value)!.explorerHintId}@@`,
                  )}
                </p>
              ) : null}
            </div>

            {err.value ? (
              <div class="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
                {err.value}
              </div>
            ) : null}

            <button
              type="button"
              disabled={busy.value}
              onClick$={payWithWallet}
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#04E6E6] py-3 text-sm font-semibold text-[#001a1c] shadow-lg shadow-[#04E6E6]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy.value ? <LuLoader2 class="h-4 w-4 animate-spin" /> : null}
              {t("app.proUpgrade.payWallet@@Pay with connected wallet")}
            </button>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-[#043234]" />
              </div>
              <div class="relative flex justify-center text-xs">
                <span class="bg-[#001a1c] px-2 text-slate-500">{t("app.proUpgrade.or@@or")}</span>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs text-slate-500">{t("app.proUpgrade.manualHash@@Transaction hash")}</label>
              <input
                type="text"
                class="w-full rounded-xl border border-[#043234] bg-[#000D0E]/70 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600"
                placeholder="0x…"
                value={manualHash.value}
                onInput$={(e) => {
                  manualHash.value = (e.target as HTMLInputElement).value;
                }}
              />
              <button
                type="button"
                disabled={busy.value}
                onClick$={verifyManual}
                class="mt-2 w-full rounded-xl border border-[#043234] py-2.5 text-sm font-medium text-[#04E6E6] transition hover:bg-[#043234]/50 disabled:opacity-60"
              >
                {t("app.proUpgrade.verify@@Verify payment")}
              </button>
            </div>

            <p class="text-[11px] leading-relaxed text-slate-500">
              {t(
                "app.proUpgrade.note@@The sending wallet must match your account wallet. Choose the same network you used for the transfer when verifying.",
              )}
            </p>
          </div>
        </div>
      </div>
    );
  },
);
