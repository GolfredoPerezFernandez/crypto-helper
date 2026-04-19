import { component$, useSignal, useTask$, $ } from '@builder.io/qwik';
import { Link, useLocation, useNavigate } from '@builder.io/qwik-city';
import { LuWallet, LuArrowUpRight, LuCopy, LuTrendingUp, LuDroplet, LuLoader2, LuAlertCircle, LuPlus, LuMinus, LuX, LuLogOut } from '@qwikest/icons/lucide';
import { useLiquidityManager } from '~/hooks/useLiquidityManager';
import { usePoolData } from '~/hooks/usePoolData';
import { useWallet } from '~/hooks/useWallet';
import { createPublicClient, http, parseAbi, formatUnits, parseUnits } from 'viem';

const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)'
]);

// Helper to calculate amounts without using the SDK (avoids Buffer issues)
const Q96 = 2n ** 96n;
const MIN_TICK = -887272;
const MAX_TICK = 887272;
const MIN_SQRT_RATIO = 4295128739n;
const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

function getSqrtRatioAtTick(tick: number): bigint {
  if (tick <= MIN_TICK) return MIN_SQRT_RATIO;
  if (tick >= MAX_TICK) return MAX_SQRT_RATIO;
  return BigInt(Math.floor(Math.pow(1.0001, tick / 2) * Number(Q96)));
}

function getAmount0ForLiquidity(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity: bigint): bigint {
    if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    const numerator = liquidity * (sqrtRatioBX96 - sqrtRatioAX96) * Q96;
    const denominator = sqrtRatioBX96 * sqrtRatioAX96;
    return numerator / denominator;
}

function getAmount1ForLiquidity(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity: bigint): bigint {
    if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    return liquidity * (sqrtRatioBX96 - sqrtRatioAX96) / Q96;
}

function getLiquidityForAmount0(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, amount0: bigint): bigint {
    if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    const numerator = amount0 * sqrtRatioAX96 * sqrtRatioBX96;
    const denominator = (sqrtRatioBX96 - sqrtRatioAX96) * Q96;
    return numerator / denominator;
}

function getLiquidityForAmount1(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, amount1: bigint): bigint {
    if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    return (amount1 * Q96) / (sqrtRatioBX96 - sqrtRatioAX96);
}

export default component$(() => {
  const location = useLocation();
  const nav = useNavigate();
  const tokenId = location.params.contract;
  const positionsListHref = `/${location.params.locale || 'en-us'}/positions/`;
  
  const { 
      getPositionDetails, 
      getPosition,
      collectAllFees, 
      increaseLiquidity,
      decreaseLiquidity, 
      checkAllowance, 
      approveToken,
      retrieveNFT,
      getTokenBalance 
  } = useLiquidityManager();
  
  const { poolData, fetchPoolData } = usePoolData();
  const { wallet, BASE_NETWORK } = useWallet();

  const position = useSignal<any>(null);
  const token0Meta = useSignal<any>(null);
  const token1Meta = useSignal<any>(null);
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);
  const positionAmounts = useSignal<{ amount0: string; amount1: string } | null>(null);
  const isCollecting = useSignal(false);
  const isRetrieving = useSignal(false);

  // Increase Liquidity State
  const showIncreaseModal = useSignal(false);
  const addAmount0 = useSignal('');
  const addAmount1 = useSignal('');
  const isApproving0 = useSignal(false);
  const isApproving1 = useSignal(false);
  const isIncreasing = useSignal(false);
  const balance0 = useSignal('0');
  const balance1 = useSignal('0');

  // Decrease Liquidity State
  const showDecreaseModal = useSignal(false);
  const removePercent = useSignal(0);
  const isDecreasing = useSignal(false);

  const handleAmount0Change = $((val: string) => {
      addAmount0.value = val;
      if (!val || !poolData.value.sqrtPriceX96 || !position.value || !token0Meta.value || !token1Meta.value) {
          if (!val) addAmount1.value = '';
          return;
      }

      const currentTick = poolData.value.currentTick;
      const tickLower = position.value.tickLower;
      const tickUpper = position.value.tickUpper;

      if (currentTick === null) return;

      // If out of range (Price < Range), only Token0 needed.
      if (currentTick < tickLower) {
          addAmount1.value = '0';
          return;
      }
      // If out of range (Price > Range), only Token1 needed.
      if (currentTick >= tickUpper) {
          // Should not happen if inputting Amount0, as Amount0 should be 0/disabled
          return;
      }

      // In Range
      try {
          const amount0 = parseUnits(val, token0Meta.value.decimals);
          const sqrtRatioX96 = BigInt(poolData.value.sqrtPriceX96);
          const sqrtRatioA = getSqrtRatioAtTick(tickLower);
          const sqrtRatioB = getSqrtRatioAtTick(tickUpper);

          // Calculate liquidity from Amount0
          // For Amount0, we use the range [current, upper]
          // L = amount0 * (sqrtRatio * sqrtRatioB) / (sqrtRatioB - sqrtRatio)
          const liquidity = getLiquidityForAmount0(sqrtRatioX96, sqrtRatioB, amount0);

          // Calculate Amount1 from liquidity
          // For Amount1, we use the range [lower, current]
          const amount1 = getAmount1ForLiquidity(sqrtRatioA, sqrtRatioX96, liquidity);

          addAmount1.value = formatUnits(amount1, token1Meta.value.decimals);
      } catch (e) {
          console.error(e);
      }
  });

  const handleAmount1Change = $((val: string) => {
      addAmount1.value = val;
      if (!val || !poolData.value.sqrtPriceX96 || !position.value || !token0Meta.value || !token1Meta.value) {
          if (!val) addAmount0.value = '';
          return;
      }

      const currentTick = poolData.value.currentTick;
      const tickLower = position.value.tickLower;
      const tickUpper = position.value.tickUpper;

      if (currentTick === null) return;

      // If out of range (Price > Range), only Token1 needed.
      if (currentTick >= tickUpper) {
          addAmount0.value = '0';
          return;
      }
      // If out of range (Price < Range), only Token0 needed.
      if (currentTick < tickLower) {
          // Should not happen
          return;
      }

      // In Range
      try {
          const amount1 = parseUnits(val, token1Meta.value.decimals);
          const sqrtRatioX96 = BigInt(poolData.value.sqrtPriceX96);
          const sqrtRatioA = getSqrtRatioAtTick(tickLower);
          const sqrtRatioB = getSqrtRatioAtTick(tickUpper);

          // Calculate liquidity from Amount1
          // For Amount1, we use the range [lower, current]
          const liquidity = getLiquidityForAmount1(sqrtRatioA, sqrtRatioX96, amount1);

          // Calculate Amount0 from liquidity
          // For Amount0, we use the range [current, upper]
          const amount0 = getAmount0ForLiquidity(sqrtRatioX96, sqrtRatioB, liquidity);

          addAmount0.value = formatUnits(amount0, token0Meta.value.decimals);
      } catch (e) {
          console.error(e);
      }
  });

  const handleIncrease = $(async () => {
      if (isIncreasing.value) return;
      isIncreasing.value = true;
      try {
          const amount0 = parseUnits(addAmount0.value || '0', token0Meta.value.decimals);
          const amount1 = parseUnits(addAmount1.value || '0', token1Meta.value.decimals);

          if (amount0 === 0n && amount1 === 0n) {
              alert('Please enter an amount');
              return;
          }

          // Safety check for amounts in range
          const isInRange = poolData.value.currentTick !== null && 
                  poolData.value.currentTick >= position.value.tickLower && 
                  poolData.value.currentTick <= position.value.tickUpper;

          if (isInRange && (amount0 === 0n || amount1 === 0n)) {
              if (!confirm(`You are adding liquidity IN RANGE but one of the amounts is 0. This might fail or result in 0 liquidity added. Do you want to proceed?`)) {
                  isIncreasing.value = false;
                  return;
              }
          }

          // Check balances
          const bal0 = parseUnits(balance0.value, token0Meta.value.decimals);
          const bal1 = parseUnits(balance1.value, token1Meta.value.decimals);

          if (amount0 > bal0) {
              alert(`Insufficient ${token0Meta.value.symbol} balance`);
              return;
          }
          if (amount1 > bal1) {
              alert(`Insufficient ${token1Meta.value.symbol} balance`);
              return;
          }

          // Check allowances
          if (amount0 > 0n) {
              const allowed0 = await checkAllowance(token0Meta.value.address, amount0.toString());
              if (!allowed0) {
                  isApproving0.value = true;
                  const { wait } = await approveToken(token0Meta.value.address, amount0.toString());
                  await wait();
                  isApproving0.value = false;
              }
          }

          if (amount1 > 0n) {
              const allowed1 = await checkAllowance(token1Meta.value.address, amount1.toString());
              if (!allowed1) {
                  isApproving1.value = true;
                  const { wait } = await approveToken(token1Meta.value.address, amount1.toString());
                  await wait();
                  isApproving1.value = false;
              }
          }

          const { wait } = await increaseLiquidity(
              tokenId, 
              amount0.toString(), 
              amount1.toString(),
              token0Meta.value.address,
              token1Meta.value.address
          );
          await wait();

          // Refresh
          const details = await getPositionDetails(tokenId);
          position.value = details;
          showIncreaseModal.value = false;
          addAmount0.value = '';
          addAmount1.value = '';

      } catch (e: any) {
          console.error(e);
          const msg = e.message || String(e);
          if (msg && msg.toLowerCase && (msg.toLowerCase().includes('user denied') || msg.toLowerCase().includes('rejected'))) {
              // User cancelled, just log or show a friendly toast if we had one
              console.log('Transaction cancelled by user');
          } else {
              alert('Failed to increase liquidity: ' + msg);
          }
      } finally {
          isIncreasing.value = false;
          isApproving0.value = false;
          isApproving1.value = false;
      }
  });

  const openIncreaseModal = $(async () => {
      showIncreaseModal.value = true;
      if (token0Meta.value && token1Meta.value) {
          const b0 = await getTokenBalance(token0Meta.value.address);
          const b1 = await getTokenBalance(token1Meta.value.address);
          balance0.value = formatUnits(BigInt(b0), token0Meta.value.decimals);
          balance1.value = formatUnits(BigInt(b1), token1Meta.value.decimals);
      }
  });

  const handleDecrease = $(async () => {
      if (isDecreasing.value || removePercent.value === 0) return;
      isDecreasing.value = true;
      try {
          const liquidity = BigInt(position.value.liquidity);
          const liquidityToRemove = liquidity * BigInt(removePercent.value) / 100n;
          
          const { wait } = await decreaseLiquidity(tokenId, liquidityToRemove.toString());
          await wait();

          // Refresh
          const details = await getPositionDetails(tokenId);
          position.value = details;
          showDecreaseModal.value = false;
          removePercent.value = 0;

      } catch (e: any) {
          console.error(e);
          const msg = e.message || String(e);
          if (msg && msg.toLowerCase && (msg.toLowerCase().includes('user denied') || msg.toLowerCase().includes('rejected'))) {
              console.log('Transaction cancelled by user');
          } else {
              alert('Failed to decrease liquidity: ' + msg);
          }
      } finally {
          isDecreasing.value = false;
      }
  });

  const fetchMetadata = $(async (address: string) => {
    if (!BASE_NETWORK) return null;
    const publicClient = createPublicClient({
      chain: BASE_NETWORK,
      transport: http(BASE_NETWORK.rpcUrls.default.http[0])
    });

    const [symbol, decimals, name] = await Promise.all([
      publicClient.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' }),
      publicClient.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' }),
      publicClient.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: 'name' })
    ]);

    return { address, symbol, decimals, name };
  });

  useTask$(async ({ track }) => {
    track(() => tokenId);
    track(() => wallet.address);

    if (!tokenId || !wallet.address) return;

    isLoading.value = true;
    error.value = null;

    try {
      console.log(`[DetailPage] Loading data for tokenId: ${tokenId}`);
      // 1. Fetch Position Details from NPM and Wrapper
      const [details, wrapperPos] = await Promise.all([
        getPositionDetails(tokenId),
        getPosition(tokenId)
      ]);
      console.log('[DetailPage] Details (NPM):', details);
      console.log('[DetailPage] Wrapper (LM):', wrapperPos);
      
      // Merge details with owner from wrapper
      // Use liquidity from wrapper if NPM reports 0 (which might happen if fees were collected but liquidity remains in wrapper accounting? No, they should sync.)
      // Actually, let's trust the Wrapper liquidity if it's non-zero and NPM is zero, to debug.
      const liquidity = details.liquidity === '0' && wrapperPos.liquidity !== '0' ? wrapperPos.liquidity : details.liquidity;
      
      position.value = { ...details, owner: wrapperPos.owner, liquidity };

      // 2. Fetch Token Metadata
      const [t0, t1] = await Promise.all([
        fetchMetadata(details.token0),
        fetchMetadata(details.token1)
      ]);
      token0Meta.value = t0;
      token1Meta.value = t1;

      // 3. Fetch Pool Data
      await fetchPoolData(t0, t1, details.fee);

    } catch (e: any) {
      console.error(e);
      error.value = e.message || 'Failed to load position';
    } finally {
      isLoading.value = false;
    }
  });

  // Calculate amounts when pool data is ready
  useTask$(({ track }) => {
    const sqrtPriceX96Str = track(() => poolData.value.sqrtPriceX96);
    const currentTick = track(() => poolData.value.currentTick);
    const pos = track(() => position.value);
    const t0 = track(() => token0Meta.value);
    const t1 = track(() => token1Meta.value);
    
    if (sqrtPriceX96Str && currentTick !== null && pos && t0 && t1) {
        try {
            // Manual calculation to avoid SDK Buffer dependency
            const liquidity = BigInt(pos.liquidity);
            const tickLower = pos.tickLower;
            const tickUpper = pos.tickUpper;
            const tickCurrent = currentTick;
            const sqrtRatioX96 = BigInt(sqrtPriceX96Str);

            const sqrtRatioA = getSqrtRatioAtTick(tickLower);
            const sqrtRatioB = getSqrtRatioAtTick(tickUpper);

            let amount0 = 0n;
            let amount1 = 0n;

            if (tickCurrent < tickLower) {
                amount0 = getAmount0ForLiquidity(sqrtRatioA, sqrtRatioB, liquidity);
            } else if (tickCurrent >= tickUpper) {
                amount1 = getAmount1ForLiquidity(sqrtRatioA, sqrtRatioB, liquidity);
            } else {
                amount0 = getAmount0ForLiquidity(sqrtRatioX96, sqrtRatioB, liquidity);
                amount1 = getAmount1ForLiquidity(sqrtRatioA, sqrtRatioX96, liquidity);
            }
            
            positionAmounts.value = {
                amount0: formatUnits(amount0, t0.decimals),
                amount1: formatUnits(amount1, t1.decimals)
            };
        } catch (e) {
            console.error('Error calculating amounts:', e);
        }
    }
  });

  const handleCollectFees = $(async () => {
    if (isCollecting.value) return;
    isCollecting.value = true;
    try {
        const { wait } = await collectAllFees(tokenId);
        await wait();
        // Refresh data
        const details = await getPositionDetails(tokenId);
        position.value = details;
    } catch (e) {
        console.error(e);
    } finally {
        isCollecting.value = false;
    }
  });

  const handleRetrieveNFT = $(async () => {
    if (!confirm('Are you sure you want to retrieve the NFT? This will remove the position from the manager and return the NFT to your wallet.')) return;
    if (isRetrieving.value) return;
    isRetrieving.value = true;
    try {
        const { wait } = await retrieveNFT(tokenId);
        await wait();
        // Redirect to positions list
        nav('/positions');
    } catch (e: any) {
        console.error(e);
        const msg = e.message || String(e);
        if (msg && msg.toLowerCase && (msg.toLowerCase().includes('user denied') || msg.toLowerCase().includes('rejected'))) {
            console.log('Transaction cancelled by user');
        } else {
            alert('Failed to retrieve NFT: ' + msg);
        }
    } finally {
        isRetrieving.value = false;
    }
  });

  if (isLoading.value) {
      return (
          <div class="min-h-screen flex items-center justify-center bg-gray-50">
              <LuLoader2 class="w-8 h-8 animate-spin text-gray-400" />
          </div>
      );
  }

  if (error.value || !position.value || !token0Meta.value || !token1Meta.value) {
      return (
          <div class="min-h-screen flex items-center justify-center bg-gray-50">
              <div class="text-center">
                  <LuAlertCircle class="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h2 class="text-xl font-semibold text-gray-900">Error loading position</h2>
                  <p class="text-gray-500 mt-2">{error.value}</p>
                  <Link href={positionsListHref} class="mt-6 inline-block text-blue-600 hover:underline">Back to positions</Link>
              </div>
          </div>
      );
  }

  // Derived values
  const t0 = token0Meta.value;
  const t1 = token1Meta.value;
  const feePercent = position.value.fee / 10000;
  
  // Calculate prices from ticks
  const getPriceFromTick = (tick: number) => {
      const price = 1.0001 ** tick;
      // Adjust for decimals: price * 10^(dec0 - dec1) ? 
      // Price of Token0 in terms of Token1 = (amount1 / amount0)
      // 1.0001^tick is price of T0 in T1 (raw).
      // Adjusted = raw * 10^(dec0 - dec1)
      return price * (10 ** (t0.decimals - t1.decimals));
  };

  const minPrice = getPriceFromTick(position.value.tickLower);
  const maxPrice = getPriceFromTick(position.value.tickUpper);
  const currentPrice = poolData.value.currentPrice ? parseFloat(poolData.value.currentPrice) : 0;
  
  // Invert if needed (usually we want price of ETH in USDC, so if T0 is ETH, we are good. If T0 is USDC, we might want to invert).
  // Assuming T0 is the base token for now or just displaying T0/T1.
  // Let's stick to T0/T1 for simplicity unless we detect stablecoins.
  
  const inRange = poolData.value.currentTick !== null && 
                  poolData.value.currentTick >= position.value.tickLower && 
                  poolData.value.currentTick <= position.value.tickUpper;

  // Check if connected wallet is the owner of the position
  const isOwner = position.value.owner.toLowerCase() === wallet.address?.toLowerCase();

  const unclaimed0 = formatUnits(BigInt(position.value.tokensOwed0), t0.decimals);
  const unclaimed1 = formatUnits(BigInt(position.value.tokensOwed1), t1.decimals);

  const estimatedValue = positionAmounts.value 
      ? (Number(positionAmounts.value.amount1) + (Number(positionAmounts.value.amount0) * currentPrice))
      : null;

  return (
    <div class="bg-gray-50 min-h-screen text-gray-900 py-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm text-gray-500 flex items-center gap-2">
              <Link href={positionsListHref} class="text-[#c1272d] hover:underline">
                Your positions
              </Link>
              <span>›</span>
              <span class="text-gray-900 font-medium">Position detail</span>
            </p>
            <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">{t0.symbol} / {t1.symbol} · {feePercent}%</h1>
            <div class="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <span>Token ID:</span>
              <code class="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs">{tokenId}</code>
              <button class="text-gray-400 hover:text-gray-900">
                <LuCopy class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <button 
                class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick$={openIncreaseModal}
                disabled={!isOwner}
                title={!isOwner ? "You must be the owner to increase liquidity" : ""}
            >
              <LuPlus class="w-4 h-4" />
              Increase Liquidity
            </button>
            <button 
                class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick$={() => showDecreaseModal.value = true}
                disabled={!isOwner}
                title={!isOwner ? "You must be the owner to decrease liquidity" : ""}
            >
              <LuMinus class="w-4 h-4" />
              Decrease Liquidity
            </button>
            <button 
                onClick$={handleCollectFees}
                disabled={isCollecting.value || (Number(unclaimed0) === 0 && Number(unclaimed1) === 0) || !isOwner}
                title={!isOwner ? "You must be the owner to collect fees" : ""}
                class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-semibold shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCollecting.value ? <LuLoader2 class="w-4 h-4 animate-spin" /> : <LuWallet class="w-4 h-4" />}
              Collect fees
            </button>
            <button 
                onClick$={handleRetrieveNFT}
                disabled={isRetrieving.value || !isOwner}
                title={!isOwner ? "You must be the owner to retrieve the NFT" : ""}
                class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-sm font-medium hover:bg-red-100 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrieving.value ? <LuLoader2 class="w-4 h-4 animate-spin" /> : <LuLogOut class="w-4 h-4" />}
              Retrieve NFT
            </button>
          </div>
        </div>

        {/* Warning for Smart Wallet Mismatch */}
        {!isLoading.value && !isOwner && (
            <div class="bg-blue-50 border border-blue-200 rounded-[32px] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div class="p-3 bg-blue-100 rounded-full text-blue-600">
                    <LuWallet class="w-6 h-6" />
                </div>
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-blue-900">Smart Wallet Detected</h3>
                    <p class="text-blue-700 text-sm mt-1">
                        This position is owned by a Smart Wallet (<strong>{position.value.owner.slice(0, 6)}...{position.value.owner.slice(-4)}</strong>). 
                        <br/>
                        You are currently connected with <strong>{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</strong>.
                        To manage this position, you must use the owner wallet or a compatible Account Abstraction provider.
                    </p>
                </div>
            </div>
        )}

        {/* Warning for 0 Liquidity */}
        {!isLoading.value && position.value && BigInt(position.value.liquidity) === 0n && (
            <div class="bg-yellow-50 border border-yellow-200 rounded-[32px] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div class="p-3 bg-yellow-100 rounded-full text-yellow-600">
                    <LuAlertCircle class="w-6 h-6" />
                </div>
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-yellow-900">Empty Position</h3>
                    <p class="text-yellow-700 text-sm mt-1">
                        This position currently has <strong>0 liquidity</strong>. This can happen if the deposited amount was too small or if the liquidity was withdrawn. 
                        You won't earn fees until you add liquidity.
                    </p>
                </div>
                <button 
                    onClick$={openIncreaseModal}
                    class="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full text-sm font-semibold whitespace-nowrap transition shadow-sm"
                >
                    Increase Liquidity
                </button>
            </div>
        )}

        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p class="text-sm text-gray-500">Est. Value</p>
              <p class="text-2xl font-semibold mt-2">
                  {estimatedValue !== null ? `≈ ${estimatedValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${t1.symbol}` : '...'}
              </p>
              <p class="text-xs text-gray-500 mt-1" title="Liquidity (L) is a protocol value representing your position size">
                  Liquidity (L): {BigInt(position.value.liquidity).toLocaleString()}
              </p>
          </div>
          <div class="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p class="text-sm text-gray-500">Unclaimed fees</p>
              <div class="mt-2">
                  <p class="text-sm font-semibold">{Number(unclaimed0).toFixed(4)} {t0.symbol}</p>
                  <p class="text-sm font-semibold">{Number(unclaimed1).toFixed(4)} {t1.symbol}</p>
              </div>
          </div>
          <div class="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p class="text-sm text-gray-500">Fee Tier</p>
              <p class="text-2xl font-semibold mt-2">{feePercent}%</p>
          </div>
          <div class="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p class="text-sm text-gray-500">Status</p>
              <div class={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-sm font-medium ${inRange ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  <span class={`w-2 h-2 rounded-full ${inRange ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  {inRange ? 'In range' : 'Out of range'}
              </div>
          </div>
        </section>

        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="rounded-[32px] border border-gray-200 bg-white p-6 space-y-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">Price range</p>
                <p class="font-semibold">
                    {position.value.tickLower === -887220 && position.value.tickUpper === 887220 ? 'Full Range' : 'Custom Range'}
                </p>
              </div>
              <span class="inline-flex items-center gap-2 text-sm text-gray-500">
                <LuTrendingUp class="w-4 h-4" />
                Current: {currentPrice} {t1.symbol}/{t0.symbol}
              </span>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="rounded-2xl border border-gray-200 p-4">
                <p class="text-sm text-gray-500">Min price</p>
                <p class="text-2xl font-semibold">
                    {position.value.tickLower === -887220 ? '0' : minPrice.toPrecision(6)}
                </p>
                <p class="text-xs text-gray-500">{t1.symbol} per {t0.symbol}</p>
              </div>
              <div class="rounded-2xl border border-gray-200 p-4">
                <p class="text-sm text-gray-500">Max price</p>
                <p class="text-2xl font-semibold">
                    {position.value.tickUpper === 887220 ? '∞' : maxPrice.toPrecision(6)}
                </p>
                <p class="text-xs text-gray-500">{t1.symbol} per {t0.symbol}</p>
              </div>
            </div>
          </div>

          <div class="rounded-[32px] border border-gray-200 bg-white p-6 space-y-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">Liquidity components</p>
                <p class="font-semibold">Deposited tokens</p>
              </div>
              <LuDroplet class="w-5 h-5 text-gray-400" />
            </div>
            <div class="space-y-4">
              <div class="rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-500">{t0.symbol}</p>
                  <p class="text-2xl font-semibold">
                    {positionAmounts.value ? Number(positionAmounts.value.amount0).toFixed(6) : '...'}
                  </p>
                </div>
              </div>
              <div class="rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-500">{t1.symbol}</p>
                  <p class="text-2xl font-semibold">
                    {positionAmounts.value ? Number(positionAmounts.value.amount1).toFixed(6) : '...'}
                  </p>
                </div>
              </div>
            </div>
            <div class="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
              Concentrated liquidity supplies more capital inside your selected price band. Keep this position “in range” to maximize fees.
            </div>
          </div>
        </section>

        {showIncreaseModal.value && (
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div class="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="text-xl font-semibold">Increase Liquidity</h3>
                        <button onClick$={() => showIncreaseModal.value = false} class="text-gray-400 hover:text-gray-600">
                            <LuX class="w-6 h-6" />
                        </button>
                    </div>
                    <div class="p-6 space-y-6">
                        {/* Token 0 Input */}
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-700 flex justify-between">
                                <span>Amount {t0.symbol}</span>
                                <span class="text-gray-500 text-xs">Balance: {Number(balance0.value).toFixed(4)}</span>
                            </label>
                            <div class="relative">
                                <input 
                                    type="text" 
                                    value={addAmount0.value}
                                    onInput$={(e) => handleAmount0Change((e.target as HTMLInputElement).value)}
                                    placeholder="0.0"
                                    class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    disabled={poolData.value.currentTick !== null && poolData.value.currentTick >= position.value.tickUpper}
                                />
                                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                                    {t0.symbol}
                                </div>
                            </div>
                        </div>

                        {/* Token 1 Input */}
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-700 flex justify-between">
                                <span>Amount {t1.symbol}</span>
                                <span class="text-gray-500 text-xs">Balance: {Number(balance1.value).toFixed(4)}</span>
                            </label>
                            <div class="relative">
                                <input 
                                    type="text" 
                                    value={addAmount1.value}
                                    onInput$={(e) => handleAmount1Change((e.target as HTMLInputElement).value)}
                                    placeholder="0.0"
                                    class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    disabled={poolData.value.currentTick !== null && poolData.value.currentTick < position.value.tickLower}
                                />
                                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                                    {t1.symbol}
                                </div>
                            </div>
                        </div>

                        <div class="pt-4">
                            <button 
                                onClick$={handleIncrease}
                                disabled={isIncreasing.value || (!addAmount0.value && !addAmount1.value)}
                                class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isIncreasing.value ? <LuLoader2 class="w-5 h-5 animate-spin" /> : <LuPlus class="w-5 h-5" />}
                                {isApproving0.value ? `Approving ${t0.symbol}...` : isApproving1.value ? `Approving ${t1.symbol}...` : 'Add Liquidity'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showDecreaseModal.value && (
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div class="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="text-xl font-semibold">Decrease Liquidity</h3>
                        <button onClick$={() => showDecreaseModal.value = false} class="text-gray-400 hover:text-gray-600">
                            <LuX class="w-6 h-6" />
                        </button>
                    </div>
                    <div class="p-6 space-y-6">
                        <div class="space-y-4">
                            <label class="text-sm font-medium text-gray-700">Amount to remove</label>
                            <div class="text-4xl font-bold text-center text-blue-600">{removePercent.value}%</div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                step="1"
                                value={removePercent.value}
                                onInput$={(e) => removePercent.value = Number((e.target as HTMLInputElement).value)}
                                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div class="flex justify-between gap-2">
                                {[25, 50, 75, 100].map((pct) => (
                                    <button 
                                        key={pct}
                                        onClick$={() => removePercent.value = pct}
                                        class={`px-3 py-1 rounded-lg text-sm font-medium border ${removePercent.value === pct ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {pct}%
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                            <p class="text-sm font-medium text-gray-500">You will receive (estimated)</p>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-900 font-semibold">{t0.symbol}</span>
                                <span class="text-gray-900">
                                    {positionAmounts.value?.amount0 ? (Number(positionAmounts.value.amount0) * removePercent.value / 100).toFixed(6) : '0'}
                                </span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-900 font-semibold">{t1.symbol}</span>
                                <span class="text-gray-900">
                                    {positionAmounts.value?.amount1 ? (Number(positionAmounts.value.amount1) * removePercent.value / 100).toFixed(6) : '0'}
                                </span>
                            </div>
                        </div>

                        <div class="pt-4">
                            <button 
                                onClick$={handleDecrease}
                                disabled={isDecreasing.value || removePercent.value === 0}
                                class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isDecreasing.value ? <LuLoader2 class="w-5 h-5 animate-spin" /> : <LuMinus class="w-5 h-5" />}
                                Remove Liquidity
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
});
