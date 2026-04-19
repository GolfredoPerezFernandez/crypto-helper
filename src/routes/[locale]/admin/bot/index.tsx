import {
    component$,
    useSignal,
    useStore,
    useVisibleTask$,
    $,
    useStylesScoped$
} from '@builder.io/qwik';
import { useWallet } from '~/hooks/useWallet';
import { TOKENS, ADMIN_WALLETS } from '~/constants';
import { db } from '~/lib/turso';
import { users } from '../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { routeLoader$ } from '@builder.io/qwik-city';
// @ts-ignore
import { inlineTranslate, useSpeak } from 'qwik-speak';
import {
    LuPlay,
    LuSquare,
    LuTrash2,
    LuHistory,
    LuActivity,
    LuTrendingUp,
    LuTrendingDown,
    LuShuffle,
    LuBot
} from '@qwikest/icons/lucide';
import { formatUnits, parseUnits } from 'viem';
import { useSwapMultihop } from '~/hooks/useSwapMultihop';
import { executeBotTrade } from '~/server/bot-actions';

interface BotLog {
    id: string;
    timestamp: number;
    type: 'buy' | 'sell';
    amountIn: string;
    tokenIn: string;
    amountOut: string;
    tokenOut: string;
    status: 'pending' | 'success' | 'failed';
    txHash?: string;
    error?: string;
}

interface BotStats {
    totalVolume: number;
    txCount: number;
    lastPrice: string;
}

export const useBotDbAdminLoader = routeLoader$(async (requestEvent) => {
    try {
        const userIdCookie = requestEvent.cookie.get('auth_token');
        if (!userIdCookie || !userIdCookie.value) return { isDbAdmin: false };

        const userId = parseInt(userIdCookie.value);
        if (isNaN(userId)) return { isDbAdmin: false };

        const user = await db.select({ email: users.email, type: users.type }).from(users).where(eq(users.id, userId)).get();
        if (user && (user.email === 'admin@gmail.com' || user.type === 'admin')) {
            return { isDbAdmin: true };
        }
        return { isDbAdmin: false };
    } catch (e) {
        console.error('Error checking DB admin status in layout:', e);
        return { isDbAdmin: false };
    }
});

export default component$(() => {
    const dbAdmin = useBotDbAdminLoader();
    useSpeak({ runtimeAssets: ['bot'] });
    useStylesScoped$(`
    .bot-container {
      @apply max-w-7xl mx-auto p-6 space-y-8;
    }
    .card {
      @apply bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6;
    }
    .input-group {
      @apply space-y-2;
    }
    .input-label {
      @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
    }
    .input-field {
      @apply w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all;
    }
    .log-item {
      @apply flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm;
    }
  `);

    const t = inlineTranslate();
    const wallet = useWallet();
    const logs = useStore<{ items: BotLog[] }>({ items: [] });
    const stats = useStore<BotStats>({ totalVolume: 0, txCount: 0, lastPrice: '-' });
    const { previewSwapMultihop, swapExactInputMultihop } = useSwapMultihop();

    // Client-side Admin Check
    // We use the signal below to control rendering
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track }) => {
        track(() => wallet.wallet.address);
        // We can add logging here if needed
    });

    const isAdmin = useSignal(false);
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track }) => {
        const addr = track(() => wallet.wallet.address);
        if (dbAdmin.value.isDbAdmin) {
            isAdmin.value = true;
        } else if (addr && ADMIN_WALLETS.some(w => w.toLowerCase() === addr.toLowerCase())) {
            isAdmin.value = true;
        } else {
            isAdmin.value = false;
        }
    });

    if (!isAdmin.value) {
        return (
            <div class="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <LuBot class="w-16 h-16 text-gray-300" />
                <h1 class="text-2xl font-bold text-gray-700">{t('bot.restricted.title')}</h1>
                <p class="text-gray-500">{t('bot.restricted.desc')}</p>
                {!wallet.wallet.connected && (
                    <button
                        onClick$={() => wallet.connectWallet()}
                        class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        {t('bot.restricted.connect')}
                    </button>
                )}
            </div>
        );
    }

    const config = useStore({
        active: false,
        frequency: 30, // seconds
        minAmount: 1, // 1 Unit
        maxAmount: 5, // 5 Units
        mode: 'random' as 'random' | 'buy' | 'sell',
        slippage: 15, // 15% — needed for low-liquidity KNRT/USDC pair
    });

    const isProcessing = useSignal(false);
    const nextRun = useSignal<number>(0);
    const lastError = useSignal<string | null>(null);

    // Helper to add log
    const addLog = $((log: Omit<BotLog, 'id' | 'timestamp'>) => {
        logs.items.unshift({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            ...log
        });
        // Keep last 50 logs
        if (logs.items.length > 50) logs.items.pop();

        if (log.status === 'failed' && log.error) {
            lastError.value = `${new Date().toLocaleTimeString()} - ${log.error}`;
        }
    });

    // Bot Logic
    const executeTrade = $(async () => {
        if (isProcessing.value || !wallet.wallet.address) return;

        isProcessing.value = true;
        try {
            // 1. Determine direction
            let type: 'buy' | 'sell' = 'buy';
            if (config.mode === 'random') {
                type = Math.random() > 0.5 ? 'buy' : 'sell';
            } else {
                type = config.mode;
            }

            // 2. Determine amount
            let amount = Math.random() * (config.maxAmount - config.minAmount) + config.minAmount;

            // Common Viem setup for balance checks
            const { createPublicClient, http, parseAbi } = await import('viem');
            const publicClient = createPublicClient({
                chain: undefined,
                transport: http('https://mainnet.base.org')
            });

            // Safety: Clamp to 10% of wallet balance
            if (type === 'buy') {
                // Check USDC balance
                try {
                    const balance = await publicClient.readContract({
                        address: TOKENS.USDC.address as `0x${string}`,
                        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
                        functionName: 'balanceOf',
                        args: [wallet.wallet.address as `0x${string}`]
                    });
                    const balanceFormatted = Number(formatUnits(balance as bigint, TOKENS.USDC.decimals));

                    if (amount > balanceFormatted) {
                        amount = balanceFormatted * 0.9;
                    }
                    if (amount <= 0) {
                        console.warn('Bot: Insufficient USDC balance');
                        addLog({
                            type: 'buy', amountIn: '0', tokenIn: 'USDC', amountOut: '0', tokenOut: '-',
                            status: 'failed', error: 'Low USDC Balance'
                        });
                        return;
                    }
                } catch (e) {
                    console.warn('Bot: Failed to check USDC balance', e);
                }

            } else if (type === 'sell') {
                // Check KNRT balance
                try {
                    const balance = await publicClient.readContract({
                        address: TOKENS.KNRT.address as `0x${string}`,
                        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
                        functionName: 'balanceOf',
                        args: [wallet.wallet.address as `0x${string}`]
                    });
                    const balanceFormatted = Number(formatUnits(balance as bigint, TOKENS.KNRT.decimals));
                    if (amount > balanceFormatted) {
                        amount = balanceFormatted * 0.9;
                    }
                    if (amount <= 0) {
                        console.warn('Bot: Insufficient KNRT balance');
                        addLog({
                            type: 'sell', amountIn: '0', tokenIn: 'KNRT', amountOut: '0', tokenOut: '-',
                            status: 'failed', error: 'Low KNRT Balance'
                        });
                        return;
                    }
                } catch (e) {
                    console.warn('Bot: Failed to check KNRT balance', e);
                }
            }

            // Safety: Clamp to 6 decimals to avoid precision issues and ensure non-zero amounts
            const amountStr = amount.toFixed(6);

            // 3. Setup tokens
            const KNRT = TOKENS.KNRT;
            const USDC = TOKENS.USDC;
            const WETH = TOKENS.WETH;

            const tokenIn = type === 'buy' ? USDC : KNRT;
            const tokenOut = type === 'buy' ? KNRT : USDC;

            // 4. Get Quote
            // USDC has 6 decimals, KNRT has 18
            const amountInWei = parseUnits(amountStr, tokenIn.decimals).toString();

            // 5. Smart Routing
            const routingOptions: { tokens: string[], fees: number[] }[] = [];
            const commonFees = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%

            // A. Direct Paths (KNRT <-> USDC)
            for (const fee of commonFees) {
                routingOptions.push({ tokens: [tokenIn.address, tokenOut.address], fees: [fee] });
            }

            // B. Multi-hop via WETH (USDC -> WETH -> KNRT or vice versa)
            const intermediates = [WETH];
            // Add USDbC check just in case (if pair is USDbC?) - sticking to WETH as pivot for now

            for (const midToken of intermediates) {
                for (const fee1 of commonFees) {
                    for (const fee2 of commonFees) {
                        routingOptions.push({
                            tokens: [tokenIn.address, midToken.address, tokenOut.address],
                            fees: [fee1, fee2]
                        });
                    }
                }
            }

            let bestQuote = BigInt(0);
            let bestRoute: { tokens: string[], fees: number[] } | null = null;

            // Iterate routes to find best output
            console.log(`Bot: Testing ${routingOptions.length} routes for ${tokenIn.symbol} -> ${tokenOut.symbol}`);

            for (const route of routingOptions) {
                try {
                    // Quick check to avoid circular paths
                    const isCircular = route.tokens.length > 2 && (tokenIn.address === route.tokens[1] || tokenOut.address === route.tokens[1]);
                    if (isCircular) continue;

                    const q = await previewSwapMultihop(route.tokens, route.fees, amountInWei);

                    // Log successful quotes for debugging
                    console.log(`Route Found: ${route.fees.join(', ')} | Quote: ${q}`);

                    // Keep the best quote
                    if (BigInt(q) > bestQuote) {
                        bestQuote = BigInt(q);
                        bestRoute = route;
                    }
                } catch (e) {
                    // Log failures to help debug "No liquidity"
                    // console.warn(`Route Failed: ${route.fees.join(', ')}`, e);
                    // Silently continue or debug log
                    continue;
                }
            }

            if (bestQuote <= BigInt(0) || !bestRoute) {
                console.error(`Bot: Failed to find liquidity for ${tokenIn.symbol} -> ${tokenOut.symbol}. Checked ${routingOptions.length} routes.`);
                throw new Error(`No liquidity found for ${tokenIn.symbol} -> ${tokenOut.symbol}`);
            }

            // 6. Calculate Min Output with Slippage
            const minOut = (bestQuote * BigInt(10000 - config.slippage * 100)) / BigInt(10000);

            // Process Trade
            console.log(`Bot: Best route found through ${bestRoute.tokens.map(t => t.slice(0, 6)).join('->')} with Quote: ${bestQuote}`);

            // 7. Execute with best found route
            // Check Approval First (Explicitly) - matching swap page reliability
            // 7. Execute with best found route
            // Check Approval First (Explicitly) - matching swap page reliability
            const isNative = false; // Bot: Always treat WETH as ERC20 to allow recycling funds (Buy -> Sell -> Buy)

            if (!isNative) {
                console.log(`Bot: Checking allowance for ${tokenIn.symbol}...`);
                // Dynamic imports
                const { createPublicClient, http, parseAbi } = await import('viem');
                const { SWAP_MULTIHOP_ADDRESS } = await import('~/hooks/useSwapMultihop');
                // Use a default public RPC to read allowance
                const publicClient = createPublicClient({
                    chain: undefined,
                    transport: http('https://mainnet.base.org')
                });

                try {
                    const allowance = await publicClient.readContract({
                        address: tokenIn.address as `0x${string}`,
                        abi: parseAbi(['function allowance(address,address) view returns (uint256)']),
                        functionName: 'allowance',
                        args: [wallet.wallet.address as `0x${string}`, SWAP_MULTIHOP_ADDRESS as `0x${string}`]
                    });

                    console.log(`Bot: Allowance for ${tokenIn.symbol} is ${allowance}`);

                    if (BigInt(allowance as any) < BigInt(amountInWei)) {
                        addLog({
                            type, amountIn: '0', tokenIn: tokenIn.symbol, amountOut: '0', tokenOut: '-',
                            status: 'pending', error: 'Approving...'
                        });

                        // Use wallet client from hook to approve
                        const walletClient = await wallet.initWalletClient();
                        if (walletClient) {
                            const hashApprove = await walletClient.writeContract({
                                address: tokenIn.address as `0x${string}`,
                                abi: parseAbi(['function approve(address,uint256) returns (bool)']),
                                functionName: 'approve',
                                args: [SWAP_MULTIHOP_ADDRESS as `0x${string}`, BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')],
                                account: wallet.wallet.address as `0x${string}`
                            });
                            // Wait for confirmation
                            // We need to wait properly. Using a simple timeout or direct wait if possible.
                            // Better to use the public client to wait.
                            addLog({
                                type, amountIn: '0', tokenIn: tokenIn.symbol, amountOut: '0', tokenOut: '-',
                                status: 'pending', error: 'Waiting for Approval...'
                            });
                            await publicClient.waitForTransactionReceipt({ hash: hashApprove });
                        }
                    }
                } catch (e) {
                    console.warn('Approval check failed', e);
                }
            }

            let hash, wait;

            // Check Wallet Type
            const walletType = localStorage.getItem('knrt_wallet_type');

            if (walletType === 'managed') {
                console.log('Bot: Executing via Managed Wallet (Server Action)...');
                addLog({
                    type, amountIn: '0', tokenIn: tokenIn.symbol, amountOut: '0', tokenOut: '-',
                    status: 'pending', error: 'Server Execution...'
                });

                const result = await executeBotTrade({
                    tokens: bestRoute.tokens,
                    fees: bestRoute.fees,
                    amountIn: amountInWei,
                    amountOutMinimum: minOut.toString(),
                    isNative,
                    tokenInAddress: tokenIn.address
                });

                if (!result.success) {
                    throw new Error(result.message || 'Server execution failed');
                }

                hash = result.hash;
                wait = async () => { /* Server already waited mostly, or we assume success if hash returned */ };

                console.log('Bot: Managed Wallet Execution Success', hash);


            } else {
                // MetaMask / Client Side — Call writeContract directly, bypassing simulateContract
                // The hook's simulateContract often fails for low-liquidity pools even when the on-chain swap would succeed
                const { createWalletClient, createPublicClient, custom, http, parseAbi: viemParseAbi, encodePacked } = await import('viem');
                const { base } = await import('viem/chains');

                const botWalletClient = createWalletClient({
                    chain: base,
                    transport: custom(window.ethereum)
                });

                // Encode the path manually
                const pathTypes: string[] = [];
                const pathValues: any[] = [];
                for (let i = 0; i < bestRoute.fees.length; i++) {
                    pathTypes.push('address');
                    pathTypes.push('uint24');
                    pathValues.push(bestRoute.tokens[i]);
                    pathValues.push(bestRoute.fees[i]);
                }
                pathTypes.push('address');
                pathValues.push(bestRoute.tokens[bestRoute.tokens.length - 1]);
                const encodedPath = encodePacked(pathTypes, pathValues);


                const ROUTER_ABI = viemParseAbi([
                    // SwapRouter02: NO deadline in ExactInputParams (deadline is via multicall wrapper)
                    'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)'
                ]);

                console.log(`Bot: Sending writeContract directly (no simulate). amountIn=${amountInWei}, minOut=0`);

                const txHash = await botWalletClient.writeContract({
                    address: '0x2626664c2603336E57B271c5C0b26F421741e481' as `0x${string}`,
                    abi: ROUTER_ABI,
                    functionName: 'exactInput',
                    args: [{
                        path: encodedPath,
                        recipient: wallet.wallet.address as `0x${string}`,
                        amountIn: BigInt(amountInWei),
                        amountOutMinimum: BigInt(0) // Accept any output — bot trusts the quoter
                    }],
                    account: wallet.wallet.address as `0x${string}`,
                    value: BigInt(0)
                });

                hash = txHash;

                const botPublicClient = createPublicClient({
                    chain: base,
                    transport: http('https://mainnet.base.org')
                });
                wait = async () => {
                    await botPublicClient.waitForTransactionReceipt({ hash: txHash });
                };
            }

            stats.txCount++;
            stats.totalVolume += amount;

            addLog({
                type,
                amountIn: amountStr,
                tokenIn: tokenIn.symbol,
                amountOut: formatUnits(bestQuote, tokenOut.decimals),
                tokenOut: tokenOut.symbol,
                status: 'pending',
                txHash: hash
            });

            await wait();

            // Update log to success
            const index = logs.items.findIndex(l => l.txHash === hash);
            if (index !== -1) logs.items[index].status = 'success';

        } catch (error: any) {
            console.warn('Bot trade failed:', error);

            let errorMsg = 'Unknown error';
            if (error?.message?.includes('No liquidity')) errorMsg = 'No Liquidity';
            else if (error?.shortMessage) errorMsg = error.shortMessage;
            else if (error?.message) errorMsg = error.message.substring(0, 50);

            addLog({
                type: config.mode === 'buy' ? 'buy' : 'sell', // potential fallback
                amountIn: '0',
                tokenIn: '-',
                amountOut: '0',
                tokenOut: '-',
                status: 'failed',
                error: errorMsg
            });
        } finally {
            isProcessing.value = false;
            nextRun.value = Date.now() + (config.frequency * 1000);
        }
    });

    // Main Loop
    useVisibleTask$(({ track, cleanup }) => {
        track(() => config.active);

        if (!config.active) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now >= nextRun.value && !isProcessing.value) {
                executeTrade();
            }
        }, 1000);

        cleanup(() => clearInterval(interval));
    });

    const isBuy = config.mode === 'buy';
    const isSell = config.mode === 'sell';
    const isRandom = config.mode === 'random';


    return (
        <div class="min-h-screen bg-gray-50 py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header Section */}
                <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold bg-gradient-to-r from-[#c1272d] to-[#d13238] bg-clip-text text-transparent flex items-center gap-3">
                            <LuBot class="text-[#c1272d] w-8 h-8" />
                            {t('bot.title')}
                        </h1>
                        <p class="mt-2 text-gray-600">
                            {t('bot.subtitle')}
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        {!wallet.wallet.connected ? (
                            <button
                                onClick$={() => wallet.connectWallet()}
                                class="px-6 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                            >
                                {t('bot.actions.connect')}
                            </button>
                        ) : (
                            <button
                                onClick$={() => config.active = !config.active}
                                class={`group flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${config.active
                                    ? 'bg-white text-red-600 border border-red-100 ring-4 ring-red-50'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/20'
                                    }`}
                            >
                                {config.active ? (
                                    <>
                                        <div class="relative flex h-3 w-3 mr-1">
                                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </div>
                                        {t('bot.actions.stop')}
                                    </>
                                ) : (
                                    <>
                                        <LuPlay class="w-5 h-5 fill-current" />
                                        {t('bot.actions.start')}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Grid */}
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Stats & Config (4 cols) */}
                    <div class="lg:col-span-4 space-y-6">

                        {/* Stats Cards - Vertical Stack for better mobile/desktop flow in this layout */}
                        <div class="grid grid-cols-2 lg:grid-cols-1 gap-4">
                            {/* Volume */}
                            <div class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                <div class="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <LuTrendingUp class="w-6 h-6" />
                                </div>
                                <div>
                                    <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('bot.stats.volume')}</p>
                                    <p class="text-xl font-bold text-slate-900">{stats.totalVolume.toFixed(2)} <span class="text-sm font-medium text-slate-500">KNRT</span></p>
                                </div>
                            </div>

                            {/* Transactions */}
                            <div class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                <div class="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                    <LuActivity class="w-6 h-6" />
                                </div>
                                <div>
                                    <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('bot.stats.transactions')}</p>
                                    <p class="text-xl font-bold text-slate-900">{stats.txCount}</p>
                                </div>
                            </div>

                            {/* Balance */}
                            <div class="col-span-2 lg:col-span-1 bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                <div class="p-3 bg-amber-50 text-amber-600 rounded-lg">
                                    <LuHistory class="w-6 h-6" />
                                </div>
                                <div>
                                    <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('bot.stats.balance')}</p>
                                    <p class="text-xl font-bold text-slate-900">
                                        {wallet.wallet.balance ? Number(wallet.wallet.balance).toFixed(4) : '0.00'} <span class="text-sm font-medium text-slate-500">ETH</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Error Card (New) */}
                        {/* Error Card (New) */}
                        {lastError.value && (
                            <div class="bg-red-50 rounded-xl p-4 border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div class="flex items-start gap-3">
                                    <div class="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <h3 class="text-sm font-bold text-red-800 uppercase tracking-wide mb-1">{t('bot.logs.lastError')}</h3>
                                        <p class="text-xs text-red-700 font-mono break-words leading-relaxed">
                                            {lastError.value}
                                        </p>
                                    </div>
                                    <button
                                        onClick$={() => lastError.value = null}
                                        class="text-red-400 hover:text-red-700 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Configuration Panel */}
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h2 class="font-bold text-slate-800 flex items-center gap-2">
                                    <LuSquare class="w-4 h-4 text-slate-400" />
                                    {t('bot.config.title')}
                                </h2>
                            </div>

                            <div class="p-5 space-y-5">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-500 uppercase">{t('bot.config.walletLabel')}</label>
                                    <div class="bg-slate-100 p-2 rounded-lg text-xs font-mono text-slate-600 break-all select-all cursor-text text-center">
                                        {wallet.wallet.address}
                                    </div>
                                    <p class="text-[10px] text-slate-400 text-center">{t('bot.config.adminNotice')}</p>
                                </div>

                                <div class="space-y-3">
                                    <label class="text-xs font-semibold text-slate-500 uppercase">{t('bot.config.mode')}</label>
                                    <div class="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                                        <button
                                            onClick$={() => config.mode = 'buy'}
                                            class={`py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${isBuy
                                                ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5'
                                                : 'bg-transparent text-slate-500 hover:text-slate-700 shadow-none'
                                                }`}
                                        >
                                            {t('bot.config.buy')}
                                        </button>
                                        <button
                                            onClick$={() => config.mode = 'sell'}
                                            class={`py-2 rounded-lg text-sm font-semibold transition-all ${isSell
                                                ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5'
                                                : 'bg-transparent text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            {t('bot.config.sell')}
                                        </button>
                                        <button
                                            onClick$={() => config.mode = 'random'}
                                            class={`py-2 rounded-lg text-sm font-semibold transition-all ${isRandom
                                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                                : 'bg-transparent text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            {t('bot.config.rnd')}
                                        </button>
                                    </div>
                                </div>

                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-500 uppercase">{t('bot.config.frequency')}</label>
                                    <div class="relative">
                                        <input
                                            type="number"
                                            value={config.frequency}
                                            onInput$={(e) => config.frequency = Number((e.target as HTMLInputElement).value)}
                                            class="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
                                            min="5"
                                        />
                                        <span class="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">{t('bot.config.sec')}</span>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-1">
                                        <label class="text-xs font-semibold text-slate-500 uppercase">{t('bot.config.minAmount')}</label>
                                        <input
                                            type="number"
                                            value={config.minAmount}
                                            onInput$={(e) => config.minAmount = Number((e.target as HTMLInputElement).value)}
                                            class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
                                            min="1"
                                        />
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-xs font-semibold text-slate-500 uppercase">{t('bot.config.maxAmount')}</label>
                                        <input
                                            type="number"
                                            value={config.maxAmount}
                                            onInput$={(e) => config.maxAmount = Number((e.target as HTMLInputElement).value)}
                                            class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
                                            min="1"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Logs (8 cols) */}
                    <div class="lg:col-span-8">
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm h-[600px] flex flex-col">
                            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h2 class="font-bold text-slate-800 flex items-center gap-2">
                                    <LuHistory class="w-4 h-4 text-slate-400" />
                                    {t('bot.logs.title')}
                                </h2>
                                <button
                                    onClick$={() => logs.items = []}
                                    class="text-xs font-medium text-slate-500 hover:text-red-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-red-200 transition-colors flex items-center gap-1.5"
                                >
                                    <LuTrash2 class="w-3 h-3" />
                                    {t('bot.logs.clear')}
                                </button>
                            </div>

                            <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/30">
                                {logs.items.length === 0 ? (
                                    <div class="h-full flex flex-col items-center justify-center text-slate-300">
                                        <LuActivity class="w-16 h-16 mb-4 opacity-50" />
                                        <p class="font-medium text-slate-400">{t('bot.logs.emptyLine1')}</p>
                                        <p class="text-sm">{t('bot.logs.emptyLine2')}</p>
                                    </div>
                                ) : (
                                    logs.items.map((log) => (
                                        <div
                                            key={log.id}
                                            class={`group relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md ${log.status === 'success' ? 'bg-white border-slate-100' :
                                                log.status === 'failed' ? 'bg-red-50/50 border-red-100' :
                                                    'bg-blue-50/30 border-blue-100'
                                                }`}
                                        >
                                            <div class="flex items-center justify-between">
                                                <div class="flex items-center gap-4">
                                                    {/* Status Icon */}
                                                    <div class={`w-10 h-10 rounded-full flex items-center justify-center ${log.type === 'buy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {log.type === 'buy' ? <LuTrendingUp class="w-5 h-5" /> : <LuTrendingDown class="w-5 h-5" />}
                                                    </div>

                                                    <div>
                                                        <div class="flex items-center gap-2">
                                                            <span class={`text-sm font-bold uppercase ${log.type === 'buy' ? 'text-green-700' : 'text-red-700'
                                                                }`}>
                                                                {log.type}
                                                            </span>
                                                            <span class="text-xs text-slate-400">
                                                                {new Date(log.timestamp).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        <div class="flex items-center gap-2 mt-0.5">
                                                            <span class="font-mono font-medium text-slate-900">
                                                                {log.amountIn} {log.tokenIn}
                                                            </span>
                                                            <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                            </svg>
                                                            <span class="font-mono font-medium text-slate-900">
                                                                {Math.abs(Number(log.amountOut)).toFixed(4)} {log.tokenOut}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div class="text-right">
                                                    {log.status === 'pending' && (
                                                        <div class="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                                                            <div class="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                                            {t('bot.logs.pending')}
                                                        </div>
                                                    )}

                                                    {log.txHash && log.status !== 'pending' && (
                                                        <a
                                                            href={`https://basescan.org/tx/${log.txHash}`}
                                                            target="_blank"
                                                            class="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                        >
                                                            {t('bot.logs.viewTx')}
                                                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                        </a>
                                                    )}

                                                    {log.error && (
                                                        <div class="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-medium" title={log.error}>
                                                            <div class="w-1.5 h-1.5 bg-red-600 rounded-full" />
                                                            {t('bot.logs.failed')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

