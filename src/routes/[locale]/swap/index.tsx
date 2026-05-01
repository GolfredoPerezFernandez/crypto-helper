import { component$, useSignal, $, useComputed$, useTask$ } from '@builder.io/qwik';
import { inlineTranslate, useSpeak } from 'qwik-speak';

import { LuSettings, LuArrowDownUp, LuArrowDownRight, LuSearch, LuX } from '@qwikest/icons/lucide';
import { useWallet } from '~/hooks/useWallet';
import { useSwapMultihop, SWAP_MULTIHOP_ADDRESS } from '~/hooks/useSwapMultihop';
import { parseUnits, formatUnits, erc20Abi, createPublicClient, http } from 'viem';
import { Modal } from '@qwik-ui/headless';
import { TOKENS as CONST_TOKENS } from '~/constants';
import { formatUsdBalance } from '~/utils/format-market';

type TokenOption = {
  symbol: string;
  name: string;
  icon: string;
  address: string;
  decimals: number;
};

const TOKENS: TokenOption[] = Object.values(CONST_TOKENS).map(t => ({
  symbol: t.symbol,
  name: t.name,
  icon: t.icon || '🪙',
  address: t.address,
  decimals: t.decimals
}));

const DEFAULT_SELL = TOKENS.find(t => t.symbol === 'WETH') || TOKENS[1];
const DEFAULT_BUY = TOKENS.find(t => t.symbol === 'KNRT') || TOKENS[0];

export default component$(() => {
  useSpeak({ runtimeAssets: ['app', 'swapPage'] });
  const t = inlineTranslate();

  const sellAmount = useSignal('');
  const buyAmount = useSignal('');
  const sellToken = useSignal<TokenOption>(DEFAULT_SELL);
  const buyToken = useSignal<TokenOption>(DEFAULT_BUY);
  const isSwapping = useSignal(false);
  const quoteLoading = useSignal(false);
  const quoteError = useSignal('');
  const swapError = useSignal('');
  const currentFee = useSignal(3000);
  const bestPath = useSignal<{ tokens: string[], fees: number[] } | null>(null);
  const rawBuyAmount = useSignal('0');
  const balanceRefreshTrigger = useSignal(0);

  const sellBalance = useSignal('0');
  const buyBalance = useSignal('0');

  const { wallet, connectWallet, openWalletModal, initWalletClient, BASE_NETWORK } = useWallet();
  const { previewSwapMultihop, swapExactInputMultihop } = useSwapMultihop();

  const estimatedFiat = useComputed$(() => {
    if (!sellAmount.value) return '$0.00';
    const num = Number(sellAmount.value);
    if (Number.isNaN(num)) return '$0.00';
    // Mock conversion, in production use an oracle or API
    const usd = num * 3200;
    return usd < 1 ? '<$1' : `$${formatUsdBalance(usd)}`;
  });

  // Fetch balances
  useTask$(async ({ track }) => {
    track(() => balanceRefreshTrigger.value);

    // Ensure wallet is defined and trackable
    if (!wallet) return;

    const address = track(() => wallet.address);
    const sToken = track(() => sellToken.value);
    const bToken = track(() => buyToken.value);
    const connected = track(() => wallet.connected);

    if (!connected || !address || !BASE_NETWORK) {
      sellBalance.value = '0';
      buyBalance.value = '0';
      return;
    }

    const publicClient = createPublicClient({
      chain: BASE_NETWORK,
      transport: http(BASE_NETWORK.rpcUrls.default.http[0])
    });

    const fetchBal = async (token: TokenOption) => {
      if (!token.address) return '0';
      try {
        const bal = await publicClient.readContract({
          address: token.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        });
        return formatUnits(bal, token.decimals);
      } catch (e) {
        console.error("Error fetching balance", e);
        return '0';
      }
    };

    const [sBal, bBal] = await Promise.all([fetchBal(sToken), fetchBal(bToken)]);
    sellBalance.value = sBal;
    buyBalance.value = bBal;
  });

  const setMaxSell = $(() => {
    if (sellBalance.value && sellBalance.value !== '0') {
      sellAmount.value = sellBalance.value;
    }
  });

  // Update quote when sell amount or tokens change
  useTask$(async ({ track }) => {
    const t = inlineTranslate();
    const amount = track(() => sellAmount.value);
    const sToken = track(() => sellToken.value);
    const bToken = track(() => buyToken.value);

    if (!amount || Number(amount) <= 0 || !sToken.address || !bToken.address) {
      buyAmount.value = '';
      quoteError.value = '';
      bestPath.value = null;
      return;
    }

    if (sToken.address === bToken.address) {
      buyAmount.value = '';
      quoteError.value = '';
      bestPath.value = null;
      return;
    }

    quoteLoading.value = true;
    quoteError.value = '';
    swapError.value = '';
    buyAmount.value = '';
    bestPath.value = null;

    try {
      const amountInWei = parseUnits(amount, sToken.decimals).toString();

      // Define candidate paths
      const WETH = CONST_TOKENS.WETH.address;
      const USDC = CONST_TOKENS.USDC.address;

      const candidates: { tokens: string[], fees: number[] }[] = [];

      // 1. Direct paths
      [3000, 10000, 500, 100].forEach(fee => {
        candidates.push({ tokens: [sToken.address, bToken.address], fees: [fee] });
      });

      // 2. Multihop via WETH (if neither token is WETH)
      if (sToken.address !== WETH && bToken.address !== WETH) {
        [[3000, 3000], [3000, 500], [500, 3000], [500, 500]].forEach(fees => {
          candidates.push({ tokens: [sToken.address, WETH, bToken.address], fees });
        });
      }

      // 3. Multihop via USDC (if neither token is USDC)
      if (sToken.address !== USDC && bToken.address !== USDC) {
        [[3000, 3000], [3000, 500], [500, 3000], [500, 500]].forEach(fees => {
          candidates.push({ tokens: [sToken.address, USDC, bToken.address], fees });
        });
      }

      let bestQuote = 0n;
      let foundPath = null;

      // Try candidates sequentially (could be parallelized but might rate limit)
      for (const candidate of candidates) {
        try {
          const quote = await previewSwapMultihop(
            candidate.tokens,
            candidate.fees,
            amountInWei
          );
          const quoteBig = BigInt(quote);
          if (quoteBig > bestQuote) {
            bestQuote = quoteBig;
            foundPath = candidate;
          }
        } catch (e) {
          // Path might not exist or revert
        }
      }

      if (foundPath && bestQuote > 0n) {
        rawBuyAmount.value = bestQuote.toString();
        const formatted = formatUnits(bestQuote, bToken.decimals);
        // Truncate to 8 decimals max for UI cleanliness
        const [int, dec] = formatted.split('.');
        if (dec && dec.length > 8) {
          buyAmount.value = `${int}.${dec.substring(0, 8)}`;
        } else {
          buyAmount.value = formatted;
        }
        bestPath.value = foundPath;
      } else {
        console.warn('No liquidity route found');
        quoteError.value = t('swapPage.alerts.noRoute');
        buyAmount.value = '';
        rawBuyAmount.value = '0';
      }
    } catch (Error) {
      console.error('Error fetching quote:', Error);
      quoteError.value = t('swapPage.alerts.error');
      buyAmount.value = '';
      rawBuyAmount.value = '0';
    } finally {
      quoteLoading.value = false;
    }
  });

  const onSellTokenChange = $((token: TokenOption) => {
    if (token.address === buyToken.value.address) {
      buyToken.value = sellToken.value;
    }
    sellToken.value = token;
  });

  const onBuyTokenChange = $((token: TokenOption) => {
    if (token.address === sellToken.value.address) {
      sellToken.value = buyToken.value;
    }
    buyToken.value = token;
  });

  const switchTokens = $(() => {
    const prevSell = sellToken.value;
    sellToken.value = buyToken.value;
    buyToken.value = prevSell;
    sellAmount.value = buyAmount.value;
    // The useTask will trigger and update the new buyAmount based on the new sellAmount
  });

  const handleSwap = $(async () => {
    const t = inlineTranslate();
    if (!wallet) {
      console.error('Wallet object is undefined');
      return;
    }

    if (!wallet.connected) {
      openWalletModal();
      return;
    }

    if (!sellAmount.value || !buyAmount.value || !bestPath.value) return;
    if (!sellToken.value.address || !buyToken.value.address) {
      alert(t('swapPage.alerts.tokenAddressNotConfigured@@Token address not configured'));
      return;
    }

    isSwapping.value = true;
    swapError.value = '';
    try {
      const walletClient = await initWalletClient();
      if (!walletClient) throw new Error('No wallet client');

      const amountInWei = parseUnits(sellAmount.value, sellToken.value.decimals);

      // Check Allowance
      let currentAllowance = 0n;
      if (BASE_NETWORK) {
        const publicClient = createPublicClient({
          chain: BASE_NETWORK,
          transport: http(BASE_NETWORK.rpcUrls.default.http[0])
        });

        currentAllowance = await publicClient.readContract({
          address: sellToken.value.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [wallet.address as `0x${string}`, SWAP_MULTIHOP_ADDRESS as `0x${string}`]
        });
        console.log('Current allowance:', currentAllowance);
      }

      // 1. Approve Token if needed
      if (currentAllowance < amountInWei) {
        console.log('Approving token...');
        const approveHash = await walletClient.writeContract({
          address: sellToken.value.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [SWAP_MULTIHOP_ADDRESS as `0x${string}`, amountInWei],
          account: wallet.address as `0x${string}`
        });

        console.log('Approval sent:', approveHash);

        // Wait for approval receipt to ensure allowance is set before swapping
        if (BASE_NETWORK) {
          const publicClient = createPublicClient({
            chain: BASE_NETWORK,
            transport: http(BASE_NETWORK.rpcUrls.default.http[0])
          });
          console.log('Waiting for approval confirmation...');
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log('Approval confirmed');
        }
      } else {
        console.log('Allowance sufficient, skipping approval');
      }

      // 2. Execute Swap
      // Calculate min amount out with 3% slippage (safer for low liquidity)
      // Use rawBuyAmount for precision, not the truncated UI value
      const amountOutWei = BigInt(rawBuyAmount.value);
      const amountOutMin = (amountOutWei * 970n) / 1000n; // 3% slippage

      console.log(`Swapping via path:`, bestPath.value);
      console.log(`AmountIn: ${amountInWei}, AmountOutMin: ${amountOutMin} (RawQuote: ${amountOutWei})`);

      const { hash, wait } = await swapExactInputMultihop(
        bestPath.value.tokens,
        bestPath.value.fees,
        amountInWei.toString(),
        amountOutMin.toString()
      );

      console.log('Swap tx hash received:', hash);
      await wait();
      console.log('Swap confirmed on chain');

      alert(t('swapPage.alerts.success'));
      balanceRefreshTrigger.value++;
      sellAmount.value = '';
      buyAmount.value = '';
      bestPath.value = null;

    } catch (Error: any) {
      console.error('Swap failed:', Error);
      const msg = Error?.message || '';
      if (msg.includes('insufficient funds')) {
        swapError.value = t('swapPage.alerts.insufficientFunds');
      } else if (msg.includes('User rejected')) {
        swapError.value = t('swapPage.alerts.rejected');
      } else {
        swapError.value = t('swapPage.alerts.failed');
      }
    } finally {
      isSwapping.value = false;
    }
  });

  return (
    <div class="bg-gray-50 text-gray-900 min-h-screen py-16">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-start justify-between gap-4 mb-10">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-600">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              {t('swapPage.badge')}
            </span>
            <h1 class="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
              {t('swapPage.title')}
            </h1>
            <p class="mt-2 text-gray-600">
              {t('swapPage.subtitle')}
            </p>
          </div>
          <button class="p-3 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow transition">
            <LuSettings class="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div class="bg-white border border-gray-200 rounded-[32px] shadow-lg p-6 sm:p-8">
          <div class="flex items-center gap-3 mb-8">
            <button class="px-5 py-2 rounded-full bg-gray-900 text-white text-sm font-semibold shadow-sm">
              {t('swapPage.tabs.swap')}
            </button>
          </div>

          <div class="space-y-4">
            <div class="rounded-[28px] border border-gray-200 p-5 bg-white shadow-inner">
              <div class="flex flex-col gap-3">
                <div class="flex justify-between items-center w-full">
                  <p class="text-sm text-gray-500 font-medium">{t('swapPage.form.sell')}</p>
                  {wallet.connected && (
                    <div class="text-xs text-gray-500 flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                      <span>{t('swapPage.form.balance')}: {Number(sellBalance.value).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                      <button onClick$={setMaxSell} class="text-[#c1272d] font-bold hover:text-[#a01f24] transition text-[10px] uppercase tracking-wider">
                        {t('swapPage.form.max')}
                      </button>
                    </div>
                  )}
                </div>

                <div class="flex items-center justify-between gap-4">
                  <div class="flex flex-col flex-1 min-w-0">
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder="0"
                      value={sellAmount.value}
                      onInput$={(_, el) => (sellAmount.value = (el as HTMLInputElement).value)}
                      class="w-full text-4xl font-semibold bg-transparent border-none p-0 focus:ring-0 placeholder-gray-300 outline-none text-gray-900"
                    />
                    <p class="text-sm text-gray-400 mt-1 font-medium">{estimatedFiat.value}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <TokenSelect token={sellToken.value} onChange$={onSellTokenChange} />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-center -my-3 relative z-10">
              <button
                class="p-2.5 rounded-xl bg-gray-50 border-4 border-white text-gray-600 shadow-sm hover:scale-110 hover:bg-gray-100 transition duration-200"
                onClick$={switchTokens}
                aria-label={t('swapPage.form.switchTokens')}
              >
                <LuArrowDownUp class="w-5 h-5" />
              </button>
            </div>

            <div class="rounded-[28px] border border-gray-200 p-5 bg-gray-50/50">
              <div class="flex flex-col gap-3">
                <div class="flex justify-between items-center w-full">
                  <p class="text-sm text-gray-500 font-medium">{t('swapPage.form.receive')}</p>
                  {wallet.connected && (
                    <span class="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-lg border border-gray-100">
                      {t('swapPage.form.balance')}: {Number(buyBalance.value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  )}
                </div>

                <div class="flex items-center justify-between gap-4">
                  <div class="flex flex-col flex-1 min-w-0">
                    {quoteLoading.value ? (
                      <div class="h-10 w-32 bg-gray-200 animate-pulse rounded-lg my-1"></div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        placeholder="0"
                        value={buyAmount.value}
                        readOnly
                        class="w-full text-4xl font-semibold bg-transparent border-none p-0 focus:ring-0 placeholder-gray-300 outline-none text-gray-900"
                      />
                    )}
                    <p class="text-sm text-gray-400 mt-1 font-medium">
                      {quoteLoading.value ? t('swapPage.form.searching') : (quoteError.value || t('swapPage.form.estimated'))}
                    </p>
                  </div>
                  <div class="flex-shrink-0">
                    <TokenSelect token={buyToken.value} onChange$={onBuyTokenChange} intent="secondary" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 space-y-3">
            <div class="flex items-center justify-between text-sm text-gray-500">
              <span>{t('swapPage.form.slippage')}</span>
              <span>0.5%</span>
            </div>
            <div class="flex items-center justify-between text-sm text-gray-500">
              <span>{t('swapPage.form.route')}</span>
              <span class="inline-flex items-center gap-1 text-gray-700">
                {t('swapPage.form.router')} <LuArrowDownRight class="w-3.5 h-3.5" />
                {t('swapPage.form.network')}
              </span>
            </div>
          </div>

          <div class="mt-10">
            <button
              onClick$={handleSwap}
              disabled={isSwapping.value || quoteLoading.value}
              class={`w-full rounded-[999px] px-6 py-4 text-sm font-semibold shadow-md transition transform hover:-translate-y-0.5 ${wallet.connected
                ? 'bg-gradient-to-r from-[#c1272d] to-[#d13238] text-white disabled:opacity-70 disabled:cursor-not-allowed'
                : 'bg-rose-100 text-[#c1272d]'
                }`}
            >
              {wallet.connected
                ? (isSwapping.value ? t('swapPage.form.processing') : t('swapPage.form.button'))
                : t('swapPage.form.connect')}
            </button>
            {wallet.connected && (
              <p class="text-xs text-gray-500 text-center mt-2">
                {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)} {t('swapPage.form.ready')}
              </p>
            )}
            {swapError.value && (
              <div class="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center font-medium">
                {swapError.value}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

interface TokenSelectProps {
  token: TokenOption;
  intent?: 'primary' | 'secondary';
  onChange$: (token: TokenOption) => void;
}

const TokenSelect = component$<TokenSelectProps>(({ token, onChange$, intent = 'primary' }) => {
  const t = inlineTranslate();
  const showModal = useSignal(false);
  const searchQuery = useSignal('');

  const filteredTokens = useComputed$(() => {
    const q = searchQuery.value.toLowerCase();
    return TOKENS.filter(t =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
    );
  });

  const handleSelect = $((t: TokenOption) => {
    onChange$(t);
    showModal.value = false;
  });

  const baseStyles =
    intent === 'primary'
      ? 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50'
      : 'bg-[#c1272d]/10 border border-[#c1272d]/20 text-[#c1272d] hover:bg-[#c1272d]/20';

  return (
    <Modal.Root bind:show={showModal}>
      <Modal.Trigger class={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm transition ${baseStyles}`}>
        <span class="text-lg">{token.icon}</span>
        <div class="text-left">
          <span class="text-sm font-semibold leading-none">{token.symbol}</span>
          <p class="text-[11px] opacity-70 leading-none mt-1 hidden sm:block">{token.name}</p>
        </div>
        <LuArrowDownRight class="w-4 h-4 opacity-50 ml-1" />
      </Modal.Trigger>

      <Modal.Panel class="bg-white rounded-[32px] shadow-2xl w-[90%] max-w-[450px] overflow-hidden border border-gray-100 backdrop:bg-black/50 backdrop:backdrop-blur-sm p-0 m-auto">
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center justify-between mb-4">
            <Modal.Title class="text-xl font-bold text-gray-900">{t('swapPage.modal.title')}</Modal.Title>
            <Modal.Close class="p-2 rounded-full hover:bg-gray-100 transition">
              <LuX class="w-5 h-5 text-gray-500" />
            </Modal.Close>
          </div>

          <div class="relative">
            <LuSearch class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('swapPage.modal.search')}
              class="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#c1272d]/20 text-gray-900 placeholder-gray-400"
              bind:value={searchQuery}
            />
          </div>
        </div>

        <div class="max-h-[400px] overflow-y-auto p-2">
          <div class="grid gap-1">
            {filteredTokens.value.map(tOption => (
              <button
                key={tOption.symbol}
                onClick$={() => handleSelect(tOption)}
                class={`flex items-center gap-4 p-3 rounded-2xl transition text-left ${token.symbol === tOption.symbol
                  ? 'bg-gray-100 cursor-default'
                  : 'hover:bg-gray-50'
                  }`}
                disabled={token.symbol === tOption.symbol}
              >
                <span class="text-2xl w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100">
                  {tOption.icon}
                </span>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-gray-900">{tOption.symbol}</span>
                    {token.symbol === tOption.symbol && (
                      <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {t('swapPage.modal.selected')}
                      </span>
                    )}
                  </div>
                  <span class="text-sm text-gray-500">{tOption.name}</span>
                </div>
              </button>
            ))}

            {filteredTokens.value.length === 0 && (
              <div class="py-8 text-center text-gray-500">
                {t('swapPage.modal.noTokens')}
              </div>
            )}
          </div>
        </div>
      </Modal.Panel>
    </Modal.Root>
  );
});



