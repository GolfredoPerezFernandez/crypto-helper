import { component$, useSignal, $, useComputed$, useVisibleTask$ } from '@builder.io/qwik';
import { inlineTranslate, useSpeak } from 'qwik-speak';
import { LuWallet, LuInfo, LuRocket, LuCheck, LuX, LuRefreshCw } from '@qwikest/icons/lucide';
import { Card } from '~/components/ui/card/card';
import { Button } from '~/components/ui/button/button';
import { Input } from '~/components/ui/input/input';
import { useMarketplaceContracts } from '~/hooks/useMarketplaceContracts';
import { ethers } from 'ethers';

/* ------------------------------------------------------- */
/* Helpers / Tipos                                         */
/* ------------------------------------------------------- */
type UiError = { title: string; message: string };
const uiErr = (title: string, message: string): UiError => ({ title, message });
const isAddr = (s: string) => {
  try { return ethers.isAddress(s); } catch { return false; }
};
const trim = (s: string) => (s || '').trim();

/* ------------------------------------------------------- */
/* ABIs de fábrica compatibles (variantes comunes)         */
/* ------------------------------------------------------- */
// Variante A: deployERC20(name, symbol, decimals, initialSupply, recipient)
const FACTORY_ABI_A = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" },
      { "internalType": "uint8", "name": "decimals", "type": "uint8" },
      { "internalType": "uint256", "name": "initialSupply", "type": "uint256" },
      { "internalType": "address", "name": "recipient", "type": "address" }
    ],
    "name": "deployERC20", "outputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "isTokenFromFactory", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view", "type": "function"
  }
];

// Variante B: deployERC20(name, symbol, recipient, initialSupply, decimals)
const FACTORY_ABI_B = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" },
      { "internalType": "address", "name": "recipient", "type": "address" },
      { "internalType": "uint256", "name": "initialSupply", "type": "uint256" },
      { "internalType": "uint8", "name": "decimals", "type": "uint8" }
    ],
    "name": "deployERC20", "outputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "stateMutability": "nonpayable", "type": "function"
  }
];

export default component$(() => {
  useSpeak({ runtimeAssets: ['deployErc20'] });
  const t = inlineTranslate();

  /* ---------------- Wallet (MISMA UX/ESTADO QUE MINT) ---------------- */
  const { contracts, connect, isLoading, actions } = useMarketplaceContracts();
  const isConnected = useComputed$(() => !!contracts.value.isConnected && !!contracts.value.address);
  const userAddress = useComputed$(() => (contracts.value.address || '').toLowerCase());

  /* ---------------- Form state ---------------- */
  const tokenName = useSignal('');
  const tokenSymbol = useSignal('');
  const tokenDecimals = useSignal<number>(18);
  const initialSupplyHuman = useSignal('0');
  const recipient = useSignal('');
  const useSignerAsRecipient = useSignal(true);

  /* ---------------- UI state ---------------- */
  const uiError = useSignal<UiError | null>(null);
  const stepBusy = useSignal(false);
  const deployHash = useSignal<string>('');
  const deployedAddress = useSignal<string>('');

  const clearBanners = $(() => {
    uiError.value = null;
    deployHash.value = '';
    deployedAddress.value = '';
  });

  // Mantener recipient = cuenta conectada cuando toggle está activo
  useVisibleTask$(({ track }) => {
    track(() => [userAddress.value, useSignerAsRecipient.value]);
    if (useSignerAsRecipient.value && userAddress.value) {
      recipient.value = userAddress.value;
    }
  });

  /* ---------------- Validación ---------------- */
  const canDeploy = useComputed$(() => {
    if (!isConnected.value) return false;
    const n = trim(tokenName.value);
    const s = trim(tokenSymbol.value);
    if (!n || !s) return false;
    if (!Number.isFinite(tokenDecimals.value) || tokenDecimals.value < 0 || tokenDecimals.value > 30) return false;
    const hasInit = trim(initialSupplyHuman.value || '0');
    if (hasInit === '') return false;
    if (!useSignerAsRecipient.value && !isAddr(recipient.value)) return false;
    return true;
  });

  /* ---------------- Obtener signer de la wallet ---------------- */
  const getSigner = $(async () => {
    const t = inlineTranslate();
    if (!(window as any).ethereum) throw uiErr(t('deployErc20.errors.walletNotDetected'), t('deployErc20.errors.walletNotDetectedDesc'));
    const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
    return browserProvider.getSigner();
  });

  /* ---------------- Resolver address de fábrica ---------------- */
  const getFactoryAddress = $(() => {
    const fromContracts =
      (contracts.value as any)?.erc20Factory ||
      (contracts.value as any)?.addresses?.erc20Factory;
    return typeof fromContracts === 'string' && isAddr(fromContracts) ? fromContracts : '';
  });

  /* ---------------- Deploy via actions o fábrica on-chain -------- */
  const deploy = $(async () => {
    const t = inlineTranslate();
    clearBanners();

    if (!isConnected.value) {
      uiError.value = uiErr(t('deployErc20.errors.connectWallet'), t('deployErc20.errors.connectWalletDesc'));
      return;
    }

    const name = trim(tokenName.value);
    const symbol = trim(tokenSymbol.value);
    const decimals = Number(tokenDecimals.value);
    const recp = useSignerAsRecipient.value ? userAddress.value : recipient.value;

    if (!name || !symbol) {
      uiError.value = uiErr(t('deployErc20.errors.requiredFields'), t('deployErc20.errors.requiredFieldsDesc'));
      return;
    }
    if (!Number.isFinite(decimals) || decimals < 0 || decimals > 30) {
      uiError.value = uiErr(t('deployErc20.errors.invalidDecimals'), t('deployErc20.errors.invalidDecimalsDesc'));
      return;
    }
    if (!isAddr(recp)) {
      uiError.value = uiErr(t('deployErc20.errors.invalidRecipient'), t('deployErc20.errors.invalidRecipientDesc'));
      return;
    }

    let initialWei: bigint = 0n;
    const human = trim(initialSupplyHuman.value || '0');
    try {
      initialWei = ethers.parseUnits(human || '0', decimals);
    } catch {
      uiError.value = uiErr(t('deployErc20.errors.invalidSupply'), t('deployErc20.errors.invalidSupplyDesc').replace('{value}', human).replace('{decimals}', decimals.toString()));
      return;
    }

    stepBusy.value = true;
    try {
      /* ---- Opción 1: Acción del hook (si existe) ---- */
      const maybeAction = (actions as any)?.deployErc20;
      if (typeof maybeAction === 'function') {
        const res = await maybeAction({
          name, symbol, decimals, initialSupply: initialWei, recipient: recp
        });
        // Se esperan algunos contratos con patrón { txHash, address, wait }
        if (res?.wait) await res.wait();
        if (res?.txHash) deployHash.value = res.txHash;
        if (res?.address) deployedAddress.value = res.address;
        if (!deployedAddress.value && res?.contract?.getAddress) {
          deployedAddress.value = await res.contract.getAddress();
        }
        if (!deployedAddress.value) {
          uiError.value = uiErr(t('deployErc20.errors.deployedNoAddress'), t('deployErc20.errors.deployedNoAddressDesc'));
        }
        return;
      }

      /* ---- Opción 2: Fábrica on-chain conocida ---- */
      const factoryAddr = await getFactoryAddress();
      if (!factoryAddr) throw uiErr(
        t('deployErc20.errors.noFactory'),
        t('deployErc20.errors.noFactoryDesc')
      );

      const signer = await getSigner();

      // Intentar ABI A
      let tokenAddress = '';
      try {
        const factoryA = new ethers.Contract(factoryAddr, FACTORY_ABI_A, signer);
        const tx = await factoryA.deployERC20(name, symbol, decimals, initialWei, recp);
        const rec = await tx.wait();
        deployHash.value = tx.hash || rec?.hash || '';
        // Muchas fábricas emiten evento, pero también devuelven address:
        try {
          const rc = await signer.provider!.getTransactionReceipt(deployHash.value);
          // fallback: buscar logs / topic si la fábrica los emite (omito parse por simplicidad)
        } catch { }
        // Algunas fábricas devuelven address directamente por .wait() o por llamada estática previa
        // Realizamos call estática para obtener address si soporta:
        try {
          tokenAddress = await factoryA.deployERC20.staticCall(name, symbol, decimals, initialWei, recp);
        } catch { }
      } catch (e) {
        // Intentar ABI B
        const factoryB = new ethers.Contract(factoryAddr, FACTORY_ABI_B, signer);
        const tx = await factoryB.deployERC20(name, symbol, recp, initialWei, decimals);
        const rec = await tx.wait();
        deployHash.value = tx.hash || rec?.hash || '';
        try {
          tokenAddress = await factoryB.deployERC20.staticCall(name, symbol, recp, initialWei, decimals);
        } catch { }
      }

      if (tokenAddress && isAddr(tokenAddress)) {
        deployedAddress.value = tokenAddress;
      } else {
        // Si la fábrica no expone staticCall, deja guía al usuario
        deployedAddress.value = deployedAddress.value || '';
      }

      if (!deployedAddress.value) {
        // Último recurso: informar éxito parcial
        // (el usuario podrá ver el token en los logs del explorer de la fábrica)
        // No lo marcamos como error duro porque el deploy ocurrió.
      }
    } catch (e: any) {
      const raw = (e?.shortMessage || e?.reason || e?.message || '').toLowerCase();
      if (raw.includes('user rejected')) {
        uiError.value = uiErr(t('deployErc20.errors.signatureCancelled'), t('deployErc20.errors.signatureCancelledDesc'));
      } else if (raw.includes('insufficient funds')) {
        uiError.value = uiErr(t('deployErc20.errors.insufficientFunds'), t('deployErc20.errors.insufficientFundsDesc'));
      } else if (raw.includes('wrong network') || raw.includes('chain id')) {
        uiError.value = uiErr(t('deployErc20.errors.wrongNetwork'), t('deployErc20.errors.wrongNetworkDesc'));
      } else if (e?.title && e?.message) {
        uiError.value = e; // typed error above (no factory configured)
      } else {
        uiError.value = uiErr(t('deployErc20.errors.couldNotDeploy'), e?.shortMessage || e?.message || t('deployErc20.errors.deploymentError'));
      }
    } finally {
      stepBusy.value = false;
    }
  });

  /* ---------------- Computed readiness (al estilo de mint) ---------------- */
  const readiness = useComputed$(() => {
    const t = inlineTranslate();
    const checklist = [
      { label: t('deployErc20.guide.checks.name'), done: !!tokenName.value.trim() },
      { label: t('deployErc20.guide.checks.symbol'), done: !!tokenSymbol.value.trim() },
      { label: t('deployErc20.guide.checks.decimals'), done: Number.isFinite(tokenDecimals.value) && tokenDecimals.value >= 0 && tokenDecimals.value <= 30 },
      { label: t('deployErc20.guide.checks.recipient'), done: !useSignerAsRecipient.value ? isAddr(recipient.value) : !!userAddress.value },
    ];
    const done = checklist.filter((item) => item.done).length;
    const score = Math.round((done / checklist.length) * 100);
    return { checklist, score };
  });

  /* ---------------- UI ---------------- */
  return (
    <div class="relative isolate px-4 py-12 sm:px-8">
      {/* Background gradient blobs */}
      <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div class="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#c1272d]/15 blur-[150px]" />
        <div class="absolute bottom-12 right-6 h-[360px] w-[360px] rounded-full bg-[#d13238]/10 blur-[150px]" />
      </div>

      <div class="relative mx-auto flex max-w-6xl flex-col gap-10">
        {/* Header section */}
        <section class="space-y-6 text-center lg:text-left">
          <div class="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c1272d] shadow-sm shadow-[#c1272d]/10 lg:justify-start">
            <span>{t('deployErc20.badge')}</span>
            <span class="text-gray-500">{t('deployErc20.network')}</span>
          </div>
          <div class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h1 class="text-4xl sm:text-5xl font-semibold leading-tight text-gray-900">
                {t('deployErc20.title')}
              </h1>
              <p class="mt-4 text-lg leading-relaxed text-gray-700">
                {t('deployErc20.subtitle')}
              </p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div class="rounded-2xl border border-white/50 bg-white/90 px-4 py-4 text-left shadow-sm shadow-[#c1272d]/5 backdrop-blur">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('deployErc20.wallet.title')}</p>
                <p class="mt-1 text-lg font-semibold text-gray-900">
                  {isConnected.value ? t('deployErc20.wallet.connected') : t('deployErc20.wallet.notConnected')}
                </p>
                <p class="text-xs text-gray-500">
                  {isConnected.value ? t('deployErc20.wallet.ready') : t('deployErc20.wallet.connectPrompt')}
                </p>
              </div>
              <div class="rounded-2xl border border-white/50 bg-white/90 px-4 py-4 text-left shadow-sm shadow-[#c1272d]/5 backdrop-blur">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('deployErc20.decimalsInfo.title')}</p>
                <p class="mt-1 text-lg font-semibold text-gray-900">{tokenDecimals.value}</p>
                <p class="text-xs text-gray-500">
                  {t('deployErc20.decimalsInfo.desc')}
                </p>
              </div>
              <div class="rounded-2xl border border-white/50 bg-white/90 px-4 py-4 text-left shadow-sm shadow-[#c1272d]/5 backdrop-blur">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('deployErc20.readiness.title')}</p>
                <p class="mt-1 text-lg font-semibold text-gray-900">{readiness.value.score}%</p>
                <p class="text-xs text-gray-500">
                  {readiness.value.score === 100 ? t('deployErc20.readiness.allSet') : t('deployErc20.readiness.completeFields')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Journey status (al estilo mint) */}
        <section class="rounded-3xl border border-white/40 bg-white/90 px-6 py-6 shadow-xl shadow-[#c1272d]/10 backdrop-blur">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.35em] text-[#c1272d]">Deployment Guide</p>
              <h2 class="text-lg font-semibold text-gray-900">Complete each section at your own pace</h2>
            </div>
            <p class="text-xs text-gray-500">
              No forced steps, but we show you the status of each field.
            </p>
          </div>
          <div class="mt-4 grid gap-3 md:grid-cols-2">
            {readiness.value.checklist.map((item: any) => (
              <div
                key={item.label}
                class={`flex flex-col gap-1 rounded-2xl border px-4 py-3 ${item.done ? 'border-emerald-100 bg-emerald-50/70' : 'border-gray-100 bg-white'
                  }`}
              >
                <div class="flex items-center gap-2">
                  <span
                    class={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${item.done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                  >
                    {item.done ? '✓' : '•'}
                  </span>
                  <p class="text-sm font-semibold text-gray-900">{item.label}</p>
                </div>
                <p class="text-xs text-gray-600">
                  {item.done ? 'Ready' : 'Please complete this field'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Connection prompt or main form */}
        {!isConnected.value ? (
          <div class="rounded-3xl border border-white/40 bg-white/90 px-10 py-16 text-center shadow-xl shadow-[#c1272d]/10 backdrop-blur">
            <LuWallet class="mx-auto mb-5 h-16 w-16 text-[#c1272d]" />
            <h2 class="text-2xl font-semibold text-gray-900">{t('deployErc20.connectSection.title')}</h2>
            <p class="mx-auto mt-3 max-w-md text-gray-600">
              {t('deployErc20.connectSection.desc')}
            </p>
            <Button
              onClick$={connect}
              disabled={isLoading.value}
              class="mx-auto mt-6 rounded-2xl bg-gradient-to-r from-[#c1272d] to-[#d13238] px-6 py-3 font-semibold text-white shadow-lg shadow-[#c1272d]/30 transition-all hover:shadow-xl hover:shadow-[#c1272d]/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LuWallet class="mr-2 inline h-4 w-4" />
              {isLoading.value ? t('deployErc20.connectSection.btnConnecting') : t('deployErc20.connectSection.btnConnect')}
            </Button>
          </div>
        ) : (
          <section class="grid gap-8 lg:grid-cols-[minmax(0,2.15fr)_minmax(280px,1fr)]">
            {/* Main form column */}
            <div class="space-y-6">
              {/* Token Info Card */}
              <div class="rounded-3xl border border-white/40 bg-white/90 px-6 py-6 shadow-xl shadow-[#c1272d]/10 backdrop-blur">
                <div class="mb-5 flex items-center gap-2">
                  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#c1272d] to-[#d13238] text-lg font-semibold text-white shadow">
                    1
                  </span>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">{t('deployErc20.form.step1')}</h3>
                    <p class="text-xs text-gray-500">{t('deployErc20.form.step1Desc')}</p>
                  </div>
                </div>

                <div class="space-y-4">
                  {/* Token Name */}
                  <div>
                    <label class="mb-1 block text-sm font-semibold text-gray-700">{t('deployErc20.form.name')}</label>
                    <Input
                      type="text"
                      placeholder={t('deployErc20.form.namePlaceholder')}
                      value={tokenName.value}
                      onInput$={(e) => (tokenName.value = (e.target as HTMLInputElement).value)}
                      class={`w-full ${tokenName.value.trim() ? 'border-emerald-400' : 'border-gray-300'}`}
                    />
                  </div>

                  {/* Token Symbol */}
                  <div>
                    <label class="mb-1 block text-sm font-semibold text-gray-700">{t('deployErc20.form.symbol')}</label>
                    <Input
                      type="text"
                      placeholder={t('deployErc20.form.symbolPlaceholder')}
                      value={tokenSymbol.value}
                      onInput$={(e) => (tokenSymbol.value = (e.target as HTMLInputElement).value)}
                      class={`w-full ${tokenSymbol.value.trim() ? 'border-emerald-400' : 'border-gray-300'}`}
                    />
                  </div>

                  {/* Decimals */}
                  <div>
                    <label class="mb-1 block text-sm font-semibold text-gray-700">{t('deployErc20.form.decimals')}</label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={String(tokenDecimals.value)}
                      onInput$={(e) => (tokenDecimals.value = Number((e.target as HTMLInputElement).value))}
                      class="w-full border-gray-300"
                    />
                    <p class="mt-1 text-xs text-gray-500">
                      {t('deployErc20.form.decimalsNote')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supply & Recipient Card */}
              <div class="rounded-3xl border border-white/40 bg-white/90 px-6 py-6 shadow-xl shadow-[#c1272d]/10 backdrop-blur">
                <div class="mb-5 flex items-center gap-2">
                  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#c1272d] to-[#d13238] text-lg font-semibold text-white shadow">
                    2
                  </span>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">{t('deployErc20.form.step2')}</h3>
                    <p class="text-xs text-gray-500">{t('deployErc20.form.step2Desc')}</p>
                  </div>
                </div>

                <div class="space-y-4">
                  {/* Initial Supply */}
                  <div>
                    <label class="mb-1 block text-sm font-semibold text-gray-700">
                      {t('deployErc20.form.supply')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('deployErc20.form.supplyPlaceholder')}
                      value={initialSupplyHuman.value}
                      onInput$={(e) => (initialSupplyHuman.value = (e.target as HTMLInputElement).value)}
                      class={`w-full ${initialSupplyHuman.value ? 'border-emerald-400' : 'border-gray-300'}`}
                    />
                    {initialSupplyHuman.value && (
                      <p class="mt-1 text-xs text-gray-500">
                        {(() => {
                          try {
                            const w = ethers.parseUnits(
                              trim(initialSupplyHuman.value || '0') || '0',
                              tokenDecimals.value
                            );
                            return t('deployErc20.form.supplyBaseUnits').replace('{value}', w.toString()).replace('{decimals}', tokenDecimals.value.toString());
                          } catch {
                            return t('deployErc20.form.supplyInvalid');
                          }
                        })()}
                      </p>
                    )}
                  </div>

                  {/* Checkbox: use signer as recipient */}
                  <div class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="use-signer"
                      checked={useSignerAsRecipient.value}
                      onChange$={(e) => {
                        const checked = (e.target as HTMLInputElement).checked;
                        useSignerAsRecipient.value = checked;
                        if (checked && userAddress.value) recipient.value = userAddress.value;
                      }}
                      class="h-4 w-4 cursor-pointer accent-[#c1272d]"
                    />
                    <label for="use-signer" class="cursor-pointer text-sm text-gray-700">
                      {t('deployErc20.form.useSigner')}
                    </label>
                  </div>

                  {/* Recipient address (if not using signer) */}
                  {!useSignerAsRecipient.value && (
                    <div>
                      <label class="mb-1 block text-sm font-semibold text-gray-700">
                        {t('deployErc20.form.recipient')}
                      </label>
                      <Input
                        type="text"
                        placeholder={t('deployErc20.form.recipientPlaceholder')}
                        value={recipient.value}
                        onInput$={(e) => (recipient.value = (e.target as HTMLInputElement).value.trim())}
                        class={`w-full ${isAddr(recipient.value) ? 'border-emerald-400' : 'border-gray-300'}`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Error message */}
              {uiError.value && (
                <div class="rounded-2xl border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-red-100/50 px-5 py-4 shadow-sm">
                  <div class="flex items-start gap-3">
                    <LuX class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                    <div>
                      <p class="text-sm font-semibold text-red-800">{uiError.value.title}</p>
                      <p class="mt-1 text-sm text-red-700">{uiError.value.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success message */}
              {deployedAddress.value && (
                <div class="rounded-2xl border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-5 py-4 shadow-sm">
                  <div class="flex items-start gap-3">
                    <LuCheck class="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <div>
                      <p class="text-sm font-semibold text-emerald-800">{t('deployErc20.form.successTitle')}</p>
                      <p class="mt-1 text-sm text-emerald-700">
                        {t('deployErc20.form.addressLabel')}{' '}
                        <a
                          href={`https://basescan.org/address/${deployedAddress.value}`}
                          target="_blank"
                          rel="noreferrer"
                          class="font-mono underline hover:no-underline"
                        >
                          {deployedAddress.value}
                        </a>
                      </p>
                      {deployHash.value && (
                        <p class="mt-1 text-xs text-emerald-700">
                          {t('deployErc20.form.txLabel')}{' '}
                          <a
                            href={`https://basescan.org/tx/${deployHash.value}`}
                            target="_blank"
                            rel="noreferrer"
                            class="font-mono underline hover:no-underline"
                          >
                            {t('deployErc20.form.viewTx')}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Deployment button */}
              <Button
                type="button"
                onClick$={deploy}
                disabled={!canDeploy.value || stepBusy.value}
                class="w-full rounded-2xl bg-gradient-to-r from-[#c1272d] to-[#d13238] px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-[#c1272d]/30 transition-all hover:shadow-xl hover:shadow-[#c1272d]/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {stepBusy.value ? (
                  <>
                    <LuRefreshCw class="mr-2 inline h-5 w-5 animate-spin" />
                    {t('deployErc20.form.btnDeploying')}
                  </>
                ) : (
                  <>
                    <LuRocket class="mr-2 inline h-5 w-5" />
                    {t('deployErc20.form.btnDeploy')}
                  </>
                )}
              </Button>
            </div>

            {/* Sidebar: Live Preview */}
            <aside class="space-y-5 lg:sticky lg:top-6 lg:self-start">
              {/* Token Summary */}
              <div class="rounded-3xl border border-white/40 bg-white/90 px-5 py-5 shadow-xl shadow-[#c1272d]/10 backdrop-blur">
                <p class="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#c1272d]">
                  Live Preview
                </p>
                <h3 class="text-lg font-semibold text-gray-900">Token Summary</h3>
                <div class="mt-4 space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-500">Name</span>
                    <span class="font-semibold text-gray-900">{tokenName.value || '—'}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Symbol</span>
                    <span class="font-semibold text-gray-900">{tokenSymbol.value || '—'}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Decimals</span>
                    <span class="font-semibold text-gray-900">{tokenDecimals.value}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Initial Supply</span>
                    <span class="font-semibold text-gray-900">
                      {initialSupplyHuman.value || '0'}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Recipient</span>
                    <span class="truncate font-mono text-xs font-semibold text-gray-900">
                      {useSignerAsRecipient.value
                        ? userAddress.value?.slice(0, 6) + '...' + userAddress.value?.slice(-4)
                        : recipient.value
                          ? recipient.value.slice(0, 6) + '...' + recipient.value.slice(-4)
                          : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Checklist */}
              <div class="rounded-3xl border border-white/40 bg-white/90 px-5 py-5 shadow-xl shadow-[#c1272d]/10 backdrop-blur">
                <p class="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#c1272d]">
                  {t('deployErc20.checklist.tag')}
                </p>
                <div class="mb-4 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    class="h-full bg-gradient-to-r from-[#c1272d] to-[#d13238] transition-all duration-300"
                    style={{ width: `${readiness.value.score}%` }}
                  />
                </div>
                <div class="space-y-2">
                  {readiness.value.checklist.map((item: any) => (
                    <div key={item.label} class="flex items-center gap-2">
                      <span
                        class={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${item.done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                          }`}
                      >
                        {item.done ? '✓' : '•'}
                      </span>
                      <p class={`text-sm ${item.done ? 'text-gray-900' : 'text-gray-500'}`}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Tips */}
              <div class="rounded-3xl border border-white/40 bg-gradient-to-br from-white/90 to-gray-50/90 px-5 py-5 shadow-xl shadow-[#c1272d]/10 backdrop-blur">
                <p class="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#c1272d]">
                  {t('deployErc20.tips.tag')}
                </p>
                <ul class="space-y-3 text-xs leading-relaxed text-gray-700">
                  <li class="flex items-start gap-2">
                    <span class="text-[#c1272d]">•</span>
                    <span>
                      <strong>{t('deployErc20.tips.nameTitle')}</strong> {t('deployErc20.tips.nameDesc')}
                    </span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-[#c1272d]">•</span>
                    <span>
                      <strong>{t('deployErc20.tips.symbolTitle')}</strong> {t('deployErc20.tips.symbolDesc')}
                    </span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-[#c1272d]">•</span>
                    <span>
                      <strong>{t('deployErc20.tips.decimalsTitle')}</strong> {t('deployErc20.tips.decimalsDesc')}
                    </span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-[#c1272d]">•</span>
                    <span>
                      <strong>{t('deployErc20.tips.supplyTitle')}</strong> {t('deployErc20.tips.supplyDesc')}
                    </span>
                  </li>
                </ul>
              </div>
            </aside>
          </section>
        )}
      </div>
    </div>
  );
});
