import { component$, useSignal, $, useComputed$, useVisibleTask$, useTask$ } from '@builder.io/qwik';
import { inlineTranslate, useSpeak } from 'qwik-speak';
import { Link, useLocation, useNavigate } from '@builder.io/qwik-city';
import {
  LuSearch,
  LuPlus,
  LuChevronDown,
  LuArrowRight,
  LuSparkles,
  LuX,
  LuArrowDownRight,
  LuAlertCircle
} from '@qwikest/icons/lucide';
import { useWallet } from '~/hooks/useWallet';
import { useLiquidityManager } from '~/hooks/useLiquidityManager';
import { usePoolData } from '~/hooks/usePoolData';
import { getTickFromPrice, getPriceFromTick } from '~/utils/tickMath';
import { Token } from '@uniswap/sdk-core';
import { parseUnits } from 'viem';
import { TOKENS as CONST_TOKENS } from '~/constants';
import { Modal } from '@qwik-ui/headless';
import { Alert } from '~/components/ui/alert/alert';

type TokenOption = {
  symbol: string;
  name: string;
  icon: string;
  address: string;
  decimals: number;
};

const TOKENS_LIST: TokenOption[] = Object.values(CONST_TOKENS).map(t => ({
  symbol: t.symbol,
  name: t.name,
  icon: t.icon || '🪙',
  address: t.address,
  decimals: t.decimals
}));

const feeTiers = [
  { label: '0.01%', value: 100, description: 'Best for very stable pairs.', tvl: '0 TVL' },
  { label: '0.05%', value: 500, description: 'Best for stable pairs.', tvl: '0 TVL' },
  { label: '0.3%', value: 3000, description: 'Best for most pairs.', tvl: '0 TVL' },
  { label: '1%', value: 10000, description: 'Best for exotic pairs.', tvl: '0 TVL' },
];

const strategies = [
  { title: 'Stable', range: '± 3 ticks', copy: 'Good for stablecoins or low volatility pairs' },
  { title: 'Wide', range: '–50% — +100%', copy: 'Good for volatile pairs' },
  { title: 'One-sided lower', range: '–50%', copy: 'Supply liquidity if price goes down' },
  { title: 'One-sided upper', range: '+100%', copy: 'Supply liquidity if price goes up' },
];

export default component$(() => {
  useSpeak({ runtimeAssets: ['newPosition'] });
  const t = inlineTranslate();

  const { wallet, connectWallet, openWalletModal } = useWallet();
  const { mintNewPosition, checkAllowance, approveToken, getTokenBalance } = useLiquidityManager();
  const { poolData, fetchPoolData } = usePoolData();
  const nav = useNavigate();
  const loc = useLocation();
  const positionsBase = `/${loc.params.locale || 'en-us'}/positions`;
  const currentStep = useSignal<1 | 2>(1);
  const minPrice = useSignal(0);
  const maxPrice = useSignal(0);
  const rangePreset = useSignal<'custom' | 'full'>('custom');
  const selectedTier = useSignal(feeTiers[2]);
  const chartRef = useSignal<HTMLCanvasElement>();

  const amount0 = useSignal('');
  const amount1 = useSignal('');
  const balance0 = useSignal('0');
  const balance1 = useSignal('0');
  const isMinting = useSignal(false);
  const isApproving = useSignal(false);
  const isProcessing = useSignal(false);
  const progress = useSignal({ current: 0, total: 0, action: '' });
  const needsApproval0 = useSignal(false);
  const needsApproval1 = useSignal(false);
  const error = useSignal<string | null>(null);

  // Using constants for production
  const selectedToken0 = useSignal<TokenOption>(TOKENS_LIST.find(t => t.symbol === 'WETH') || TOKENS_LIST[0]);
  const selectedToken1 = useSignal<TokenOption>(TOKENS_LIST.find(t => t.symbol === 'USDC') || TOKENS_LIST[1]);

  const minPercent = useComputed$(() => {
    if (!poolData.value.currentPrice || minPrice.value === 0) return '0%';
    const current = parseFloat(poolData.value.currentPrice);
    const diff = ((minPrice.value - current) / current) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`;
  });

  const maxPercent = useComputed$(() => {
    if (!poolData.value.currentPrice || maxPrice.value === 0) return '0%';
    const current = parseFloat(poolData.value.currentPrice);
    const diff = ((maxPrice.value - current) / current) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`;
  });

  // Fetch pool data when tokens or fee change
  useTask$(async ({ track }) => {
    track(() => selectedToken0.value);
    track(() => selectedToken1.value);
    track(() => selectedTier.value);

    await fetchPoolData(selectedToken0.value, selectedToken1.value, selectedTier.value.value);
  });

  // Update price range when pool data loads
  useTask$(({ track }) => {
    track(() => poolData.value.currentPrice);

    if (poolData.value.currentPrice) {
      const price = parseFloat(poolData.value.currentPrice);
      // Default range +/- 10%
      minPrice.value = Number((price * 0.9).toFixed(4));
      maxPrice.value = Number((price * 1.1).toFixed(4));
    }
  });

  // Handle range preset changes
  useTask$(({ track }) => {
    const preset = track(() => rangePreset.value);
    const currentPriceStr = track(() => poolData.value.currentPrice);

    if (!currentPriceStr) return;
    const price = parseFloat(currentPriceStr);

    if (preset === 'full') {
      minPrice.value = 0;
      maxPrice.value = 999999999; // Effectively infinity for UI
    } else {
      // Reset to custom range (e.g. +/- 10%) if switching back to custom
      minPrice.value = Number((price * 0.9).toFixed(4));
      maxPrice.value = Number((price * 1.1).toFixed(4));
    }
  });

  const adjustMin = $((delta: number) => {
    if (rangePreset.value === 'full') return;
    minPrice.value = Math.max(0, Number((minPrice.value + delta).toFixed(4)));
  });

  const adjustMax = $((delta: number) => {
    if (rangePreset.value === 'full') return;
    maxPrice.value = Math.max(0, Number((maxPrice.value + delta).toFixed(4)));
  });

  const selectedStrategy = useSignal<string | null>(null);

  const applyStrategy = $((strategyTitle: string) => {
    if (!poolData.value.currentPrice || !poolData.value.currentTick) return;

    selectedStrategy.value = strategyTitle;
    rangePreset.value = 'custom'; // Ensure we are in custom mode

    const currentPrice = parseFloat(poolData.value.currentPrice);
    const currentTick = poolData.value.currentTick;
    const spacing = poolData.value.tickSpacing;

    // Helper to get price from tick offset
    const getPriceAtOffset = (tickOffset: number) => {
      const targetTick = currentTick + (tickOffset * spacing);
      const token0 = new Token(8453, selectedToken0.value.address, selectedToken0.value.decimals);
      const token1 = new Token(8453, selectedToken1.value.address, selectedToken1.value.decimals);
      return parseFloat(getPriceFromTick(targetTick, token0, token1));
    };

    switch (strategyTitle) {
      case 'Stable':
        // ± 3 ticks
        // Note: Price and Tick relationship is inverse if token0/token1 order flips, 
        // but getPriceFromTick handles the raw math.
        // We need to determine which price is lower/higher.
        const priceA = getPriceAtOffset(-3);
        const priceB = getPriceAtOffset(3);
        minPrice.value = Number(Math.min(priceA, priceB).toFixed(4));
        maxPrice.value = Number(Math.max(priceA, priceB).toFixed(4));
        break;

      case 'Wide':
        // -50% to +100%
        minPrice.value = Number((currentPrice * 0.5).toFixed(4));
        maxPrice.value = Number((currentPrice * 2.0).toFixed(4));
        break;

      case 'One-sided lower':
        // -50% to Current
        minPrice.value = Number((currentPrice * 0.5).toFixed(4));
        maxPrice.value = Number(currentPrice.toFixed(4));
        break;

      case 'One-sided upper':
        // Current to +100%
        minPrice.value = Number(currentPrice.toFixed(4));
        maxPrice.value = Number((currentPrice * 2.0).toFixed(4));
        break;
    }
  });

  const handleCreatePosition = $(async () => {
    if (!wallet.connected) {
      openWalletModal();
      return;
    }

    if (!amount0.value || !amount1.value) {
      alert(t('newPosition.errors.enterAmounts'));
      return;
    }

    if (!poolData.value.currentPrice || parseFloat(poolData.value.currentPrice) === 0) {
      error.value = t('newPosition.errors.poolInvalid');
      isProcessing.value = false;
      return;
    }

    // Check balances
    const amount0Big = parseUnits(amount0.value, selectedToken0.value.decimals);
    const amount1Big = parseUnits(amount1.value, selectedToken1.value.decimals);

    if (amount0Big > BigInt(balance0.value)) {
      error.value = t('newPosition.errors.insufficientBalance').replace('{symbol}', selectedToken0.value.symbol);
      isProcessing.value = false;
      return;
    }
    if (amount1Big > BigInt(balance1.value)) {
      error.value = t('newPosition.errors.insufficientBalance').replace('{symbol}', selectedToken1.value.symbol);
      isProcessing.value = false;
      return;
    }

    isMinting.value = true;
    error.value = null;
    try {
      console.log('Creating position...');

      // 1. Determine sorted order (Contract expects sorted tokens)
      const token0Address = selectedToken0.value.address;
      const token1Address = selectedToken1.value.address;
      const isSorted = token0Address.toLowerCase() < token1Address.toLowerCase();

      const sortedToken0 = isSorted ? selectedToken0.value : selectedToken1.value;
      const sortedToken1 = isSorted ? selectedToken1.value : selectedToken0.value;

      // 2. Calculate ticks
      // We calculate ticks based on the USER'S selected tokens (Token0 -> Token1)
      // because minPrice/maxPrice are expressed in terms of Token0/Token1.
      let tickLower = -887220;
      let tickUpper = 887220;

      if (rangePreset.value === 'custom') {
        const t0 = new Token(8453, selectedToken0.value.address, selectedToken0.value.decimals);
        const t1 = new Token(8453, selectedToken1.value.address, selectedToken1.value.decimals);

        // Calculate ticks for SelectedToken0 -> SelectedToken1
        let tickA = getTickFromPrice(minPrice.value.toString(), t0, t1, poolData.value.tickSpacing);
        let tickB = getTickFromPrice(maxPrice.value.toString(), t0, t1, poolData.value.tickSpacing);

        // If the contract expects the INVERSE order (SortedToken0 is actually SelectedToken1),
        // we need to invert the ticks.
        // In Uniswap V3, Price(T1/T0) corresponds to tick T. Price(T0/T1) corresponds to tick -T.
        if (!isSorted) {
          // Invert ticks: newTick = -oldTick
          // And since -B < -A (if A < B), we swap them too.
          const tempA = -tickB;
          const tempB = -tickA;
          tickA = tempA;
          tickB = tempB;
        }

        tickLower = tickA;
        tickUpper = tickB;

        // Normalize to nearest usable tick for the SORTED pair
        // (The previous calculation used tickSpacing, but negation preserves divisibility usually, 
        // but let's be safe and re-snap if needed, though getTickFromPrice already snapped).
        // Actually, getTickFromPrice snapped to tickSpacing. -Tick is also divisible by tickSpacing.

        // Ensure lower < upper
        if (tickLower > tickUpper) {
          const temp = tickLower;
          tickLower = tickUpper;
          tickUpper = temp;
        }

        // Ensure they are not equal
        if (tickLower === tickUpper) {
          tickUpper += poolData.value.tickSpacing;
        }
      }

      // 3. Map amounts to sorted tokens
      let amount0Sorted = '';
      let amount1Sorted = '';

      if (isSorted) {
        amount0Sorted = amount0.value;
        amount1Sorted = amount1.value;
      } else {
        amount0Sorted = amount1.value;
        amount1Sorted = amount0.value;
      }

      const amount0Big = parseUnits(amount0Sorted, sortedToken0.decimals).toString();
      const amount1Big = parseUnits(amount1Sorted, sortedToken1.decimals).toString();

      console.log('Mint params:', {
        token0: sortedToken0.symbol,
        token1: sortedToken1.symbol,
        tickLower,
        tickUpper,
        amount0: amount0Big,
        amount1: amount1Big
      });

      const { hash, wait } = await mintNewPosition(
        sortedToken0.address,
        sortedToken1.address,
        selectedTier.value.value,
        tickLower,
        tickUpper,
        amount0Big,
        amount1Big
      );

      // Alert user to confirm the recipient in console/logs just in case
      // Ideally we would show this in the UI but for now we assume trust
      // Verify recipient logic on hook side.

      console.log('Tx sent:', hash);
      await wait();
      // Force a hard navigation to ensure state is reset and loading bar clears
      window.location.href = '/positions';
    } catch (e: any) {
      console.error('Mint failed', e);
      let msg = e.message || String(e);
      if (msg.includes('User denied transaction signature')) {
        msg = t('newPosition.errors.rejected');
      } else if (msg.includes('insufficient funds')) {
        msg = t('newPosition.errors.insufficientFunds');
      }
      error.value = msg;
    } finally {
      isMinting.value = false;
    }
  });

  const handleApprove = $(async (token: TokenOption, amount: string) => {
    isApproving.value = true;
    error.value = null;
    try {
      const amountBig = parseUnits(amount, token.decimals).toString();
      const { hash, wait } = await approveToken(token.address, amountBig);
      console.log('Approval sent:', hash);
      await wait();

      // Recheck
      const allowed = await checkAllowance(token.address, amountBig);
      if (token.address === selectedToken0.value.address) needsApproval0.value = !allowed;
      else needsApproval1.value = !allowed;

    } catch (e: any) {
      console.error('Approval failed', e);
      error.value = e.message || String(e);
    } finally {
      isApproving.value = false;
    }
  });

  const handlePrimaryAction = $(async () => {
    if (currentStep.value === 1) {
      currentStep.value = 2;
      return;
    }

    // Calculate total steps
    let steps = 0;
    if (needsApproval0.value) steps++;
    if (needsApproval1.value) steps++;
    steps++; // Minting is always the last step

    progress.value = { current: 1, total: steps, action: t('newPosition.process.starting') };
    isProcessing.value = true;

    try {
      if (needsApproval0.value) {
        progress.value = { ...progress.value, action: t('newPosition.process.approving').replace('{symbol}', selectedToken0.value.symbol) };
        await handleApprove(selectedToken0.value, amount0.value);
        if (needsApproval0.value) return; // Failed
        progress.value.current++;
      }

      if (needsApproval1.value) {
        progress.value = { ...progress.value, action: t('newPosition.process.approving').replace('{symbol}', selectedToken1.value.symbol) };
        await handleApprove(selectedToken1.value, amount1.value);
        if (needsApproval1.value) return; // Failed
        progress.value.current++;
      }

      progress.value = { ...progress.value, action: t('newPosition.process.minting') };
      await handleCreatePosition();
    } catch (e) {
      console.error('Process failed', e);
    } finally {
      isProcessing.value = false;
      progress.value = { current: 0, total: 0, action: '' };
    }
  });

  // Check allowances when amounts change
  useTask$(async ({ track }) => {
    track(() => amount0.value);
    track(() => amount1.value);
    track(() => selectedToken0.value);
    track(() => selectedToken1.value);

    if (!wallet.connected) return;

    // Fetch balances
    try {
      const b0 = await getTokenBalance(selectedToken0.value.address);
      const b1 = await getTokenBalance(selectedToken1.value.address);
      // Format for display (simple division for now, or use formatUnits if available)
      // We'll store raw string for now and format in UI
      balance0.value = b0;
      balance1.value = b1;
    } catch (e) {
      console.error('Error fetching balances', e);
    }

    if (!amount0.value || !amount1.value) return;

    try {
      const amount0Big = parseUnits(amount0.value, selectedToken0.value.decimals).toString();
      const amount1Big = parseUnits(amount1.value, selectedToken1.value.decimals).toString();

      const allowed0 = await checkAllowance(selectedToken0.value.address, amount0Big);
      needsApproval0.value = !allowed0;

      const allowed1 = await checkAllowance(selectedToken1.value.address, amount1Big);
      needsApproval1.value = !allowed1;
    } catch (e) {
      console.error('Error checking allowance', e);
    }
  });

  useVisibleTask$(({ track, cleanup }) => {
    track(() => currentStep.value);
    track(() => poolData.value.currentPrice);
    if (currentStep.value !== 2) return;

    const renderChart = () => {
      if (!chartRef.value) return;
      const ctx = chartRef.value.getContext('2d');
      if (!ctx) return;
      const Chart = (window as any).Chart;
      if (!Chart) return;

      const gradient = ctx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, 'rgba(193,39,45,0.25)');
      gradient.addColorStop(1, 'rgba(193,39,45,0)');

      // Generate mock data based on current price
      const currentPrice = poolData.value.currentPrice ? parseFloat(poolData.value.currentPrice) : 3000;
      const points = 10;
      const volatility = 0.02; // 2% volatility

      let tempPrice = currentPrice;
      const history = [tempPrice];

      // Generate backwards from current price
      for (let i = 0; i < points - 1; i++) {
        const change = 1 + (Math.random() * volatility * 2 - volatility);
        tempPrice = tempPrice / change;
        history.unshift(tempPrice);
      }

      const dataset = {
        labels: ['Oct 12', 'Oct 15', 'Oct 18', 'Oct 21', 'Oct 24', 'Oct 27', 'Oct 30', 'Nov 2', 'Nov 5', 'Today'],
        datasets: [
          {
            data: history,
            borderColor: '#c1272d',
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
          },
        ],
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: '#9ca3af', font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            ticks: { color: '#9ca3af', font: { size: 11 }, callback: (val: number) => `$${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
            grid: { color: 'rgba(148,163,184,0.2)' },
          },
        },
      };

      const chart = new Chart(ctx, { type: 'line', data: dataset, options });
      return () => chart.destroy();
    };

    if ((window as any).Chart) {
      const disposer = renderChart();
      cleanup(() => disposer && disposer());
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(script);
    script.onload = () => {
      const disposer = renderChart();
      cleanup(() => disposer && disposer());
    };
    cleanup(() => {
      script.remove();
    });
  });

  return (
    <div class="bg-gray-50 min-h-screen text-gray-900 py-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm text-gray-500 flex items-center gap-2">
              <Link href={`${positionsBase}/`} class="text-[#c1272d] hover:underline">
                {t('newPosition.subtitle')}
              </Link>
              <span>›</span>
              <span class="text-gray-900 font-medium">{t('newPosition.title')}</span>
            </p>
            <h1 class="text-4xl sm:text-5xl font-semibold tracking-tight mt-2">{t('newPosition.title')}</h1>
          </div>
          <button class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium">
            <LuSparkles class="w-4 h-4 text-gray-500" />
            {t('newPosition.helpChoose')}
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <div class="bg-white border border-gray-200 rounded-[32px] p-6 space-y-6">
            <div class="flex items-start gap-4">
              <div
                class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep.value === 1 ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-500'
                  }`}
              >
                1
              </div>
              <div>
                <p class="text-sm text-gray-500">{t('newPosition.step1.tag')}</p>
                <p class="font-semibold">{t('newPosition.step1.title')}</p>
              </div>
            </div>
            <div class="flex items-start gap-4 opacity-70">
              <div
                class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep.value === 2 ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-500'
                  }`}
              >
                2
              </div>
              <div>
                <p class="text-sm text-gray-500">{t('newPosition.step2.tag')}</p>
                <p class="font-semibold">{t('newPosition.step2.title')}</p>
              </div>
            </div>
          </div>

          <div class="space-y-8">
            <div class="bg-white border border-gray-200 rounded-[32px] p-6 shadow-sm">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-3 text-lg font-semibold">
                  <span class="inline-flex items-center justify-center rounded-full bg-indigo-50 text-indigo-500 font-semibold px-3 py-1 text-sm">
                    {selectedToken0.value.symbol}
                  </span>
                  /
                  <span class="inline-flex items-center justify-center rounded-full bg-sky-50 text-sky-500 font-semibold px-3 py-1 text-sm">
                    {selectedToken1.value.symbol}
                  </span>
                  <span class="text-sm text-gray-500 font-medium px-3 py-1 rounded-full bg-gray-100">v3</span>
                  <span class="text-sm text-gray-500 px-3 py-1 rounded-full bg-gray-100">0.3%</span>
                </div>
                <button class="text-sm font-medium text-[#c1272d]">{t('newPosition.pair.edit')}</button>
              </div>

              <div class="mt-6">
                <div class="rounded-2xl border border-gray-200 p-4">
                  <p class="text-sm text-gray-500 mb-1">{t('newPosition.pair.select')}</p>
                  <p class="font-semibold mb-3">{t('newPosition.pair.desc')}</p>
                  <div class="flex items-center gap-2">
                    <TokenSelect token={selectedToken0.value} onChange$={(t) => selectedToken0.value = t} />
                    <LuPlus class="w-4 h-4 text-gray-400" />
                    <TokenSelect token={selectedToken1.value} onChange$={(t) => selectedToken1.value = t} />
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-[32px] p-6 shadow-sm">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <p class="text-sm text-gray-500">{t('newPosition.fee.title')}</p>
                  <p class="font-semibold">{t('newPosition.fee.desc')}</p>
                </div>
                <button class="text-sm text-gray-500 flex items-center gap-1">
                  {t('newPosition.fee.search')}
                  <LuChevronDown class="w-4 h-4" />
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                {feeTiers.map(tier => (
                  <button
                    key={tier.label}
                    class={`rounded-2xl border p-4 text-left transition ${selectedTier.value.label === tier.label
                      ? 'border-gray-900 shadow bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    onClick$={() => (selectedTier.value = tier)}
                  >
                    <p class="text-sm font-semibold">{tier.label}</p>
                    <p class={`text-xs mt-1 ${selectedTier.value.label === tier.label ? 'text-white/80' : 'text-gray-500'}`}>
                      {tier.value === 100 ? t('newPosition.tiers.t1') : tier.value === 500 ? t('newPosition.tiers.t2') : tier.value === 3000 ? t('newPosition.tiers.t3') : t('newPosition.tiers.t4')}
                    </p>
                    <p class={`text-xs mt-3 font-medium ${selectedTier.value.label === tier.label ? 'text-white' : 'text-gray-600'}`}>
                      {tier.tvl}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {currentStep.value === 2 && (
              <div class="bg-white border border-gray-200 rounded-[32px] p-6 shadow-sm space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-500">{t('newPosition.range.title')}</p>
                    <p class="font-semibold">{t('newPosition.range.desc')}</p>
                  </div>
                  <div class="inline-flex rounded-full border border-gray-200 p-1 bg-gray-100">
                    <button
                      class={`px-4 py-1.5 rounded-full text-sm font-medium ${rangePreset.value === 'full' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                        }`}
                      onClick$={() => (rangePreset.value = 'full')}
                    >
                      {t('newPosition.range.full')}
                    </button>
                    <button
                      class={`px-4 py-1.5 rounded-full text-sm font-medium ${rangePreset.value === 'custom' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                        }`}
                      onClick$={() => (rangePreset.value = 'custom')}
                    >
                      {t('newPosition.range.custom')}
                    </button>
                  </div>
                </div>

                <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-center justify-between text-sm mb-2">
                    <span>{t('newPosition.range.currentPrice')}</span>
                    <span class="font-semibold">
                      {poolData.value.isLoading ? t('newPosition.range.loading') : (poolData.value.error ? t('newPosition.range.error').replace('{err}', poolData.value.error) : (poolData.value.currentPrice ? parseFloat(poolData.value.currentPrice).toFixed(4) : '0'))} {selectedToken0.value.symbol}/{selectedToken1.value.symbol}
                    </span>
                  </div>
                  <div class="h-40 rounded-xl relative overflow-hidden bg-white">
                    <canvas ref={chartRef} class="absolute inset-0 h-full w-full" />
                  </div>
                  <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-3">
                    <span>1D</span>
                    <span>1W</span>
                    <span class="font-semibold text-gray-900">1M</span>
                    <span>1Y</span>
                    <span>All time</span>
                    <button class="ml-auto text-sm text-gray-600">{t('newPosition.range.reset')}</button>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {strategies.map(strategy => {
                    const id = strategy.title === 'Stable' ? 'stable' : strategy.title === 'Wide' ? 'wide' : strategy.title === 'One-sided lower' ? 'lower' : 'upper';
                    return (
                      <button
                        key={strategy.title}
                        class={`rounded-2xl border p-4 text-left transition hover:border-gray-300 ${selectedStrategy.value === strategy.title
                          ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                          : 'border-gray-200 bg-white'
                          }`}
                        onClick$={() => applyStrategy(strategy.title)}
                      >
                        <p class="text-sm font-semibold">{t(`newPosition.strategies.${id}.title`)}</p>
                        <p class="text-xs text-gray-500 mt-1">{strategy.range}</p>
                        <p class="text-xs text-gray-600 mt-2">{t(`newPosition.strategies.${id}.copy`)}</p>
                      </button>
                    );
                  })}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class={`rounded-2xl border border-gray-200 p-4 ${rangePreset.value === 'full' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <p class="text-sm text-gray-500">{t('newPosition.range.minPrice')}</p>
                    <div class="flex items-baseline gap-2">
                      <p class="text-3xl font-semibold">{rangePreset.value === 'full' ? '0' : minPrice.value.toFixed(4)}</p>
                      <span class="text-sm text-gray-500">{minPercent.value}</span>
                    </div>
                    <div class="mt-3 flex gap-2">
                      <button class="flex-1 px-3 py-2 rounded-xl border border-gray-200" onClick$={() => adjustMin(-5)}>
                        –
                      </button>
                      <button class="flex-1 px-3 py-2 rounded-xl border border-gray-200" onClick$={() => adjustMin(5)}>
                        +
                      </button>
                    </div>
                  </div>
                  <div class={`rounded-2xl border border-gray-200 p-4 ${rangePreset.value === 'full' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <p class="text-sm text-gray-500">{t('newPosition.range.maxPrice')}</p>
                    <div class="flex items-baseline gap-2">
                      <p class="text-3xl font-semibold">{rangePreset.value === 'full' ? '∞' : maxPrice.value.toFixed(4)}</p>
                      <span class="text-sm text-gray-500">{maxPercent.value}</span>
                    </div>
                    <div class="mt-3 flex gap-2">
                      <button class="flex-1 px-3 py-2 rounded-xl border border-gray-200" onClick$={() => adjustMax(-5)}>
                        –
                      </button>
                      <button class="flex-1 px-3 py-2 rounded-xl border border-gray-200" onClick$={() => adjustMax(5)}>
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TokenInput
                    label={t('newPosition.deposit.label').replace('{symbol}', selectedToken0.value.symbol)}
                    symbol={selectedToken0.value.symbol}
                    placeholder='0'
                    value={amount0}
                    balance={balance0}
                    decimals={selectedToken0.value.decimals}
                  />
                  <TokenInput
                    label={t('newPosition.deposit.label').replace('{symbol}', selectedToken1.value.symbol)}
                    symbol={selectedToken1.value.symbol}
                    placeholder='0'
                    value={amount1}
                    balance={balance1}
                    decimals={selectedToken1.value.decimals}
                  />
                </div>
              </div>
            )}

            {error.value && (
              <Alert.Root look="alert">
                <LuAlertCircle class="h-4 w-4" />
                <Alert.Title>Error</Alert.Title>
                <Alert.Description>{error.value}</Alert.Description>
              </Alert.Root>
            )}

            <div class="bg-white border border-gray-200 rounded-[32px] p-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-500">{t('newPosition.strategy.title')}</p>
                <p class="font-semibold">{t('newPosition.strategy.desc')}</p>
              </div>
              <button
                onClick$={handlePrimaryAction}
                disabled={isMinting.value || isApproving.value || isProcessing.value}
                class="px-6 py-3 rounded-full text-sm font-semibold shadow bg-gradient-to-r from-[#c1272d] to-[#d13238] text-white disabled:opacity-50"
              >
                {(() => {
                  if (currentStep.value === 1) return t('newPosition.action.continue');

                  if (isProcessing.value) {
                    return `${progress.value.action} (${progress.value.current}/${progress.value.total})`;
                  }

                  const steps = [];
                  if (needsApproval0.value) steps.push(t('newPosition.action.approve').replace('{symbol}', selectedToken0.value.symbol));
                  if (needsApproval1.value) steps.push(t('newPosition.action.approve').replace('{symbol}', selectedToken1.value.symbol));
                  steps.push(t('newPosition.process.minting'));

                  const totalSteps = steps.length;

                  if (needsApproval0.value) return `${t('newPosition.action.approve').replace('{symbol}', selectedToken0.value.symbol)} (1/${totalSteps})`;
                  if (needsApproval1.value) return `${t('newPosition.action.approve').replace('{symbol}', selectedToken1.value.symbol)} (1/${totalSteps})`;

                  return t('newPosition.action.btnDeposit');
                })()}
              </button>
            </div>

            <div class="rounded-3xl border border-gray-200 bg-white p-6 flex flex-col sm:flex-row gap-4 items-center">
              <div class="flex-1">
                <p class="text-sm text-[#c1272d] uppercase tracking-wide font-semibold">{t('newPosition.promo.tag')}</p>
                <h3 class="text-xl font-semibold mt-1">{t('newPosition.promo.title')}</h3>
              </div>
              <button class="px-5 py-3 rounded-full bg-gray-900 text-white text-sm font-semibold flex items-center gap-2">
                <LuSparkles class="w-4 h-4" />
                {t('newPosition.promo.btn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

import { Signal } from '@builder.io/qwik';
import { formatUnits } from 'viem';

interface TokenInputProps {
  label: string;
  symbol: string;
  placeholder?: string;
  value: Signal<string>;
  balance: Signal<string>;
  decimals: number;
}

const TokenInput = component$<TokenInputProps>(({ label, symbol, placeholder = '0', value, balance, decimals }) => {
  const t = inlineTranslate();

  const formattedBalance = useComputed$(() => {
    if (!balance.value || balance.value === '0') return '0';
    const val = formatUnits(BigInt(balance.value), decimals);
    return parseFloat(val).toFixed(4);
  });

  return (
    <div class="rounded-2xl border border-gray-200 p-4 bg-gray-50 overflow-hidden">
      <p class="text-sm text-gray-500 mb-2">{label}</p>
      <div class="flex items-center gap-3">
        <input
          type="number"
          min="0"
          inputMode="decimal"
          placeholder={placeholder}
          value={value.value}
          onInput$={(_, el) => (value.value = (el as HTMLInputElement).value)}
          class="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-2xl font-semibold focus:outline-none focus:border-[#c1272d]"
        />
        <div class="flex flex-col items-end min-w-[80px] shrink-0 text-right">
          <span class="text-sm font-semibold whitespace-nowrap">{symbol}</span>
          <span class="text-xs text-gray-500 whitespace-nowrap">
            {t('newPosition.deposit.balance')}: {formattedBalance.value}
          </span>
        </div>
      </div>
    </div>
  )
});

interface TokenSelectProps {
  token: TokenOption;
  onChange$: (token: TokenOption) => void;
}

const TokenSelect = component$<TokenSelectProps>(({ token, onChange$ }) => {
  const t = inlineTranslate();
  const showModal = useSignal(false);
  const searchQuery = useSignal('');

  const filteredTokens = useComputed$(() => {
    const q = searchQuery.value.toLowerCase();
    return TOKENS_LIST.filter(t =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
    );
  });

  const handleSelect = $((t: TokenOption) => {
    onChange$(t);
    showModal.value = false;
  });

  return (
    <Modal.Root bind:show={showModal}>
      <Modal.Trigger class="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 flex items-center gap-2 hover:bg-gray-50 transition shadow-sm">
        <span class="text-lg">{token.icon}</span>
        <span class="font-semibold">{token.symbol}</span>
        <LuChevronDown class="w-4 h-4 text-gray-400 ml-auto" />
      </Modal.Trigger>

      <Modal.Panel class="bg-white rounded-[32px] shadow-2xl w-[90%] max-w-[450px] overflow-hidden border border-gray-100 backdrop:bg-black/50 backdrop:backdrop-blur-sm p-0 m-auto">
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center justify-between mb-4">
            <Modal.Title class="text-xl font-bold text-gray-900">{t('newPosition.modal.title')}</Modal.Title>
            <Modal.Close class="p-2 rounded-full hover:bg-gray-100 transition">
              <LuX class="w-5 h-5 text-gray-500" />
            </Modal.Close>
          </div>

          <div class="relative">
            <LuSearch class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('newPosition.modal.search')}
              class="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#c1272d]/20 text-gray-900 placeholder-gray-400"
              bind:value={searchQuery}
            />
          </div>
        </div>

        <div class="max-h-[400px] overflow-y-auto p-2">
          <div class="grid gap-1">
            {filteredTokens.value.map(tokenItem => (
              <button
                key={tokenItem.symbol}
                onClick$={() => handleSelect(tokenItem)}
                class={`flex items-center gap-4 p-3 rounded-2xl transition text-left ${token.symbol === tokenItem.symbol
                  ? 'bg-gray-100 cursor-default'
                  : 'hover:bg-gray-50'
                  }`}
                disabled={token.symbol === tokenItem.symbol}
              >
                <span class="text-2xl w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100">
                  {tokenItem.icon}
                </span>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-gray-900">{tokenItem.symbol}</span>
                    {token.symbol === tokenItem.symbol && (
                      <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {t('newPosition.modal.selected')}
                      </span>
                    )}
                  </div>
                  <span class="text-sm text-gray-500">{tokenItem.name}</span>
                </div>
              </button>
            ))}

            {filteredTokens.value.length === 0 && (
              <div class="py-8 text-center text-gray-500">
                {t('newPosition.modal.notFound')}
              </div>
            )}
          </div>
        </div>
      </Modal.Panel>
    </Modal.Root>
  );
});
