// src/routes/profile/index.tsx
import {
  component$,
  useSignal,
  useComputed$,
  useVisibleTask$,
  $,
} from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import {
  LuWallet,
  LuCoins,
  LuCopy,
  LuCheck,
  LuExternalLink,
  LuRefreshCw,
  LuDollarSign,
  LuActivity,
  LuNetwork,
  LuArrowUpRight,
  LuArrowDownRight,
  LuBarChart3,
  LuTrendingUp,
  LuTrendingDown,
  LuGlobe2,
  LuLayers,
  LuSparkles,
  LuChevronRight,
  LuFileCode2,
  LuLogOut,
  LuBadgeCheck,
  LuInfo,
  LuArrowLeftRight,
} from '@qwikest/icons/lucide';
import { Button } from '~/components/ui/button/button';
import { inlineTranslate, useSpeak } from 'qwik-speak';
import { useMarketplaceContracts } from '~/hooks/useMarketplaceContracts';
import { formatUnits } from 'viem';
import { ExportPrivateKeyCard } from '~/components/wallet/ExportPrivateKeyCard';
import {
  type ProfileNftCard,
  type ProfileNftTransferRow,
} from '~/server/crypto-helper-actions';
import { formatTokenUsdPrice } from '~/utils/format-market';

/* -------------------------------------------------- */
/* Moralis Config                                     */
/* -------------------------------------------------- */

const MORALIS_CHAIN = '0x2105'; // Base mainnet chainId in hex

/* -------------------------------------------------- */
/* Types                                              */
/* -------------------------------------------------- */

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  address: string;
  valueUSD?: number;
  priceChange24h?: number;
  logo?: string;
  isNative?: boolean;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number | string;
  status: 'success' | 'pending' | 'failed';
  type: 'send' | 'receive' | 'contract';
  tokenSymbol?: string;
  tokenDecimals?: number;
}

interface WalletStatsInfo {
  name: string;
  chainId: number;
  txCount?: number;
  nftCount?: number;
  tokenTransferCount?: number;
}

interface ChainActivityEntry {
  chain: string;
  chainId: string;
  firstTransaction?: string;
  lastTransaction?: string;
}

interface PnLSummary {
  total_count_of_trades: number;
  total_trade_volume: string;
  total_realized_profit_usd: string;
  total_realized_profit_percentage: number;
  total_buys: number;
  total_sells: number;
  total_sold_volume_usd: string;
  total_bought_volume_usd: string;
}

interface PnLTokenBreakdownEntry {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  countOfTrades: number;
  realizedProfitUsd: number;
  realizedProfitPercentage: number;
  totalUsdInvested: number;
  totalSoldUsd: number;
  totalBoughtUsd: number;
  totalTokensBought: string;
  totalTokensSold: string;
  possibleSpam?: boolean;
}

interface ContractDeployment {
  txHash: string;
  contractAddress: string;
  blockNumber: number;
  timestamp: string;
  gasUsed?: number;
  txFee?: number;
}

interface SwapTx {
  transactionHash: string;
  transactionType: 'buy' | 'sell';
  blockTimestamp: string;
  pairLabel?: string;
  exchangeName?: string;
  totalValueUsd?: number;
  baseQuotePrice?: string;
}

/* -------------------------------------------------- */
/* Moralis helper                                     */
/* -------------------------------------------------- */

const moralisFetch = async (
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<any | null> => {
  const search = new URLSearchParams();
  search.set('path', path);
  search.set('chain', MORALIS_CHAIN);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) search.set(k, String(v));
  }

  try {
    const res = await fetch(`/api/crypto/profile/moralis?${search.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    const payload = (await res.json().catch(() => null)) as
      | { ok?: boolean; data?: unknown; error?: string }
      | null;
    if (!res.ok || !payload?.ok) {
      console.error('Moralis proxy error', payload?.error || res.statusText);
      return null;
    }
    return (payload.data as any) ?? null;
  } catch (err) {
    console.error('Moralis proxy network error', err);
    return null;
  }
};

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

const formatBalance = (balance: string, decimals: number = 18): string => {
  try {
    const bn = BigInt(balance || '0');
    const formatted = formatUnits(bn, decimals);
    const num = parseFloat(formatted);

    if (!isFinite(num) || num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } catch {
    return '0';
  }
};

function profileTxExplorerUrl(chain: string, txHash: string): string {
  const h = txHash.trim();
  if (!h.startsWith('0x')) return '#';
  return chain === 'base'
    ? `https://basescan.org/tx/${h}`
    : `https://etherscan.io/tx/${h}`;
}

const formatAddress = (addr: string): string => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// formatTimestamp logic is now handled inside the component to use localized strings

const formatUSD = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(num)) return '$0.00';
  if (Math.abs(num) < 0.01 && num !== 0) {
    return (num < 0 ? '-$' : '$') + Math.abs(num).toFixed(4);
  }
  return (num < 0 ? '-' : '') +
    '$' +
    Math.abs(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const formatPercent = (v: number | string | undefined): string => {
  if (v === undefined || v === null) return '0%';
  const num = typeof v === 'string' ? parseFloat(v) : v;
  if (!isFinite(num)) return '0%';
  return `${num.toFixed(2)}%`;
};

/* -------------------------------------------------- */
/* Component                                          */
/* -------------------------------------------------- */

export default component$(() => {
  useSpeak({ runtimeAssets: ['profile'] });
  const t = inlineTranslate();
  const loc = useLocation();

  /* -------------- Localized Helpers -------------- */

  const formatTimestamp = (timestamp: number | string): string => {
    let date: Date;

    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp * 1000);
    }

    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('myNfts.profile.relativeTimes.justNow');
    if (minutes < 60) return t('myNfts.profile.relativeTimes.minsAgo', { count: minutes });
    if (hours < 24) return t('myNfts.profile.relativeTimes.hrsAgo', { count: hours });
    return t('myNfts.profile.relativeTimes.daysAgo', { count: days });
  };

  /* -------------- Wallet Connection -------------- */

  const { contracts, connect, disconnect, isLoading } = useMarketplaceContracts();
  const isConnected = useComputed$(
    () => !!contracts.value.isConnected && !!contracts.value.address,
  );
  const userAddress = useComputed$(
    () => (contracts.value.address || '').toLowerCase(),
  );

  /* -------------- State -------------- */

  const nativeBalance = useSignal('0');
  const nativeValueUSD = useSignal(0);
  const tokenBalances = useSignal<TokenBalance[]>([]);
  const recentTransactions = useSignal<Transaction[]>([]);
  const isLoadingData = useSignal(false);
  const isCopied = useSignal(false);
  const isManagedWallet = useSignal(false);
  const networkInfo = useSignal<WalletStatsInfo>({
    name: 'Base',
    chainId: 8453,
  });
  const totalValueUSD = useSignal(0);

  const chainsActivity = useSignal<ChainActivityEntry[]>([]);
  const pnlSummary = useSignal<PnLSummary | null>(null);
  const pnlBreakdown = useSignal<PnLTokenBreakdownEntry[]>([]);
  const pnlDays = useSignal<'all' | '7' | '30' | '90'>('all');

  const contractDeployments = useSignal<ContractDeployment[]>([]);
  const swaps = useSignal<SwapTx[]>([]);
  const profileNfts = useSignal<ProfileNftCard[]>([]);
  const profileNftTransfers = useSignal<ProfileNftTransferRow[]>([]);
  const profileNftsError = useSignal('');

  /* -------------- Clipboard -------------- */

  const copyToClipboard = $(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      isCopied.value = true;
      setTimeout(() => {
        isCopied.value = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  });

  /* -------------- Data Fetching (Moralis) -------------- */

  // ✅ TODOS los tokens ERC-20 (verificados, no verificados, spam, etc.)
  const fetchBalancesAndPrices = $(async () => {
    if (!userAddress.value) return;

    const allResults: any[] = [];
    let cursor: string | undefined = undefined;

    // Paginamos hasta 1000 tokens por seguridad
    do {
      const page = await moralisFetch(`/wallets/${userAddress.value}/tokens`, {
        limit: 100,
        exclude_spam: false,
        exclude_unverified_contracts: false,
        exclude_native: false,
        cursor,
      });

      if (!page || !Array.isArray(page.result) || page.result.length === 0) {
        break;
      }

      allResults.push(...page.result);
      cursor = page.cursor || undefined;
    } while (cursor && allResults.length < 1000);

    if (!allResults.length) {
      nativeBalance.value = '0';
      nativeValueUSD.value = 0;
      tokenBalances.value = [];
      totalValueUSD.value = 0;
      return;
    }

    // Native token row
    const nativeRow = allResults.find(
      (r) =>
        r.native_token === true ||
        r.native_token === 'true' ||
        r.symbol === 'ETH',
    );
    if (nativeRow) {
      nativeBalance.value = nativeRow.balance || '0';
      const usdVal = nativeRow.usd_value ?? nativeRow.usd_price ?? 0;
      nativeValueUSD.value = Number(usdVal) || 0;
    } else {
      nativeBalance.value = '0';
      nativeValueUSD.value = 0;
    }

    // ERC-20 tokens
    const erc20: TokenBalance[] = allResults
      .filter((r) => !r.native_token && r.token_address)
      .map((r) => ({
        symbol: r.symbol || r.token_symbol || '',
        name: r.name || r.token_name || '',
        balance: String(r.balance ?? '0'),
        decimals: Number(r.decimals ?? r.token_decimals ?? 18),
        address: r.token_address || r.address || '',
        valueUSD: r.usd_value ? Number(r.usd_value) : undefined,
        priceChange24h: r.usd_price_24hr_percent_change
          ? Number(r.usd_price_24hr_percent_change)
          : undefined,
        logo: r.logo || r.token_logo || undefined,
        isNative: false,
      }));

    tokenBalances.value = erc20;

    const tokensValue = erc20.reduce(
      (sum, t) => sum + (t.valueUSD || 0),
      0,
    );
    totalValueUSD.value = nativeValueUSD.value + tokensValue;
  });

  const fetchWalletStats = $(async () => {
    if (!userAddress.value) return;

    const stats = await moralisFetch(
      `/wallets/${userAddress.value}/stats`,
      {},
    );
    if (!stats) return;

    const txCount = stats.transactions?.total
      ? Number(stats.transactions.total)
      : undefined;
    const nftCount = stats.nfts ? Number(stats.nfts) : undefined;
    const tokenTransferCount = stats.token_transfers?.total
      ? Number(stats.token_transfers.total)
      : undefined;

    networkInfo.value = {
      name: 'Base',
      chainId: 8453,
      txCount,
      nftCount,
      tokenTransferCount,
    };
  });

  // ✅ Historial de transacciones completo usando /wallets/:address/history
  const fetchRecentTransactions = $(async () => {
    if (!userAddress.value) return;

    const history = await moralisFetch(
      `/wallets/${userAddress.value}/history`,
      {
        limit: 40,
        order: 'DESC',
        include_internal_transactions: false,
        nft_metadata: false,
      },
    );

    if (!history || !Array.isArray(history.result)) {
      recentTransactions.value = [];
      return;
    }

    const rows = history.result as any[];
    const wallet = userAddress.value;
    const txs: Transaction[] = [];

    for (const tx of rows) {
      const baseHash = tx.hash;
      const baseTimestamp = tx.block_timestamp;
      const baseStatus =
        tx.receipt_status === '1' || tx.receipt_status === 1
          ? 'success'
          : 'failed';

      // ERC-20 transfers dentro de la tx
      if (Array.isArray(tx.erc20_transfers) && tx.erc20_transfers.length) {
        for (const tr of tx.erc20_transfers) {
          const from = (tr.from_address || tx.from_address || '').toLowerCase();
          const to = (tr.to_address || tx.to_address || '').toLowerCase();

          const type: Transaction['type'] =
            from === wallet
              ? 'send'
              : to === wallet
                ? 'receive'
                : 'contract';

          txs.push({
            hash: baseHash,
            from: tr.from_address || tx.from_address,
            to: tr.to_address || tx.to_address,
            value: String(tr.value ?? '0'),
            timestamp: baseTimestamp,
            status: baseStatus,
            type,
            tokenSymbol: tr.token_symbol || 'TOKEN',
            tokenDecimals: tr.token_decimals
              ? Number(tr.token_decimals)
              : 18,
          });
        }
        continue;
      }

      // Native transfers
      if (
        Array.isArray(tx.native_transfers) &&
        tx.native_transfers.length > 0
      ) {
        for (const nt of tx.native_transfers) {
          const from = (nt.from_address || tx.from_address || '').toLowerCase();
          const to = (nt.to_address || tx.to_address || '').toLowerCase();

          const type: Transaction['type'] =
            from === wallet
              ? 'send'
              : to === wallet
                ? 'receive'
                : 'contract';

          const val =
            typeof nt.value === 'string'
              ? nt.value
              : String(nt.value ?? '0');

          txs.push({
            hash: baseHash,
            from: nt.from_address || tx.from_address,
            to: nt.to_address || tx.to_address,
            value: val,
            timestamp: baseTimestamp,
            status: baseStatus,
            type,
            tokenSymbol: nt.token_symbol || 'ETH',
            tokenDecimals: 18,
          });
        }
        continue;
      }

      // Fallback sólo nativo
      const fromF = (tx.from_address || '').toLowerCase();
      const toF = (tx.to_address || '').toLowerCase();
      const typeF: Transaction['type'] =
        fromF === wallet
          ? 'send'
          : toF === wallet
            ? 'receive'
            : 'contract';

      txs.push({
        hash: baseHash,
        from: tx.from_address,
        to: tx.to_address,
        value: String(tx.value ?? '0'),
        timestamp: baseTimestamp,
        status: baseStatus,
        type: typeF,
        tokenSymbol: 'ETH',
        tokenDecimals: 18,
      });
    }

    recentTransactions.value = txs.slice(0, 30);
  });

  // ✅ Chain Activity (multi chain)
  const fetchWalletChains = $(async () => {
    if (!userAddress.value) return;

    const res = await moralisFetch(
      `/wallets/${userAddress.value}/chains`,
      {},
    );
    if (!res || !Array.isArray(res.active_chains)) {
      chainsActivity.value = [];
      return;
    }

    const entries: ChainActivityEntry[] = res.active_chains.map((c: any) => ({
      chain: c.chain || '',
      chainId: c.chain_id || '',
      firstTransaction: c.first_transaction || undefined,
      lastTransaction: c.last_transaction || undefined,
    }));

    chainsActivity.value = entries;
  });

  // ✅ PnL Summary
  const fetchWalletPnLSummary = $(async () => {
    if (!userAddress.value) return;

    const res = await moralisFetch(
      `/wallets/${userAddress.value}/profitability/summary`,
      {
        days: pnlDays.value,
      },
    );

    if (!res || Object.keys(res).length === 0) {
      pnlSummary.value = null;
      return;
    }

    pnlSummary.value = {
      total_count_of_trades: Number(res.total_count_of_trades ?? 0),
      total_trade_volume: String(res.total_trade_volume ?? '0'),
      total_realized_profit_usd: String(
        res.total_realized_profit_usd ?? '0',
      ),
      total_realized_profit_percentage: Number(
        res.total_realized_profit_percentage ?? 0,
      ),
      total_buys: Number(res.total_buys ?? 0),
      total_sells: Number(res.total_sells ?? 0),
      total_sold_volume_usd: String(res.total_sold_volume_usd ?? '0'),
      total_bought_volume_usd: String(res.total_bought_volume_usd ?? '0'),
    };
  });

  // ✅ PnL Breakdown por token
  const fetchWalletPnLBreakdown = $(async () => {
    if (!userAddress.value) return;

    const res = await moralisFetch(
      `/wallets/${userAddress.value}/profitability`,
      {
        days: pnlDays.value,
      },
    );

    if (!res || !Array.isArray(res.result)) {
      pnlBreakdown.value = [];
      return;
    }

    const rows = res.result as any[];

    const mapped: PnLTokenBreakdownEntry[] = rows.map((r) => ({
      tokenAddress: r.token_address || '',
      symbol: r.symbol || '',
      name: r.name || '',
      decimals: Number(r.decimals ?? 18),
      logo: r.logo || undefined,
      countOfTrades: Number(r.count_of_trades ?? 0),
      realizedProfitUsd: Number(r.realized_profit_usd ?? 0),
      realizedProfitPercentage: Number(
        r.realized_profit_percentage ?? 0,
      ),
      totalUsdInvested: Number(r.total_usd_invested ?? 0),
      totalSoldUsd: Number(r.total_sold_usd ?? 0),
      totalBoughtUsd: Number(r.total_bought_usd ?? 0),
      totalTokensBought: String(r.total_tokens_bought ?? '0'),
      totalTokensSold: String(r.total_tokens_sold ?? '0'),
      possibleSpam:
        r.possible_spam === true || r.possible_spam === 'true',
    }));

    // Orden por mayor profit realizado
    mapped.sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd);
    pnlBreakdown.value = mapped;
  });

  // ✅ Contract Deployments detectados desde transacciones nativas
  const fetchContractDeployments = $(async () => {
    if (!userAddress.value) return;

    const res = await moralisFetch(`/${userAddress.value}`, {
      limit: 50,
      order: 'DESC',
      includes: 'internal_transactions',
    });

    if (!res || !Array.isArray(res.result)) {
      contractDeployments.value = [];
      return;
    }

    const rows = res.result as any[];
    const wallet = userAddress.value;

    const deployments: ContractDeployment[] = rows
      .filter((tx) => {
        const from = (tx.from_address || '').toLowerCase();
        const receiptAddr = tx.receipt_contract_address;
        const to = tx.to_address;
        return (
          from === wallet &&
          ((receiptAddr && receiptAddr !== '0x0000000000000000000000000000000000000000') ||
            !to ||
            to === '0x0000000000000000000000000000000000000000')
        );
      })
      .map((tx) => ({
        txHash: tx.hash,
        contractAddress:
          tx.receipt_contract_address ||
          tx.to_address ||
          '0x0000000000000000000000000000000000000000',
        blockNumber: Number(tx.block_number ?? 0),
        timestamp: tx.block_timestamp,
        gasUsed: tx.receipt_gas_used
          ? Number(tx.receipt_gas_used)
          : undefined,
        txFee: tx.transaction_fee
          ? Number(tx.transaction_fee)
          : undefined,
      }));

    contractDeployments.value = deployments.slice(0, 15);
  });

  // ✅ Swaps by wallet
  const fetchSwaps = $(async () => {
    if (!userAddress.value) return;

    const res = await moralisFetch(
      `/wallets/${userAddress.value}/swaps`,
      {
        limit: 15,
        order: 'DESC',
      },
    );

    if (!res || !Array.isArray(res.result)) {
      swaps.value = [];
      return;
    }

    const rows = res.result as any[];

    swaps.value = rows.map((s) => ({
      transactionHash: s.transactionHash,
      transactionType: s.transactionType === 'sell' ? 'sell' : 'buy',
      blockTimestamp: s.blockTimestamp,
      pairLabel: s.pairLabel,
      exchangeName: s.exchangeName,
      totalValueUsd: s.totalValueUsd
        ? Number(s.totalValueUsd)
        : undefined,
      baseQuotePrice: s.baseQuotePrice,
    }));
  });

  const loadProfileNfts = $(async () => {
    profileNftsError.value = '';
    if (!userAddress.value) {
      profileNfts.value = [];
      profileNftTransfers.value = [];
      return;
    }
    try {
      const addr = encodeURIComponent(userAddress.value);
      const res = await fetch(`/api/crypto/profile/wallet/${addr}/nfts`, {
        method: 'GET',
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
      const r = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; items?: ProfileNftCard[]; transfers?: ProfileNftTransferRow[]; warnings?: string[] }
        | null;
      if (!res.ok || !r?.ok) {
        profileNfts.value = [];
        profileNftTransfers.value = [];
        profileNftsError.value = r?.error || t('profile.nfts.loadError@@Could not load NFTs.');
        return;
      }
      profileNfts.value = Array.isArray(r.items) ? r.items : [];
      profileNftTransfers.value = Array.isArray(r.transfers) ? r.transfers : [];
      if (Array.isArray(r.warnings) && r.warnings.length) {
        console.warn('[profile NFTs]', r.warnings);
      }
    } catch {
      profileNfts.value = [];
      profileNftTransfers.value = [];
      profileNftsError.value = t('profile.nfts.loadError@@Could not load NFTs.');
    }
  });

  const refreshAllData = $(async () => {
    if (!userAddress.value) return;

    isLoadingData.value = true;
    try {
      await Promise.all([
        fetchBalancesAndPrices(),
        fetchWalletStats(),
        fetchRecentTransactions(),
        fetchWalletChains(),
        fetchWalletPnLSummary(),
        fetchWalletPnLBreakdown(),
        fetchContractDeployments(),
        fetchSwaps(),
        loadProfileNfts(),
      ]);
    } finally {
      isLoadingData.value = false;
    }
  });

  /* -------------- Effects -------------- */

  useVisibleTask$(async ({ track }) => {
    track(() => userAddress.value);
    if (userAddress.value) {
      await refreshAllData();

      // Check if this is a managed wallet
      if (typeof window !== 'undefined') {
        const managedAddress = localStorage.getItem('knrt_managed_wallet');
        if (managedAddress && managedAddress.toLowerCase() === userAddress.value.toLowerCase()) {
          isManagedWallet.value = true;
        }
      }
    } else {
      profileNfts.value = [];
      profileNftTransfers.value = [];
      profileNftsError.value = '';
    }
  });

  // Recalcular PnL cuando cambie el rango de días
  useVisibleTask$(async ({ track }) => {
    track(() => pnlDays.value);
    track(() => userAddress.value);
    if (userAddress.value) {
      await Promise.all([
        fetchWalletPnLSummary(),
        fetchWalletPnLBreakdown(),
      ]);
    }
  });

  const hasPnL =
    pnlSummary.value &&
    pnlSummary.value.total_count_of_trades &&
    pnlSummary.value.total_count_of_trades > 0;

  /* -------------- UI -------------- */

  return (
    <div class="relative isolate w-full">
      {/* Background accents — match dashboard shell */}
      <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div class="absolute left-1/2 top-0 h-[420px] w-[520px] -translate-x-1/2 rounded-full bg-[#04E6E6]/8 blur-[140px]" />
        <div class="absolute bottom-0 right-0 h-[320px] w-[380px] rounded-full bg-teal-900/20 blur-[120px]" />
      </div>

      <div class="relative mx-auto max-w-6xl space-y-10">
        {/* Header */}
        <section class="space-y-4">
          <div class="inline-flex items-center gap-2 rounded-full border border-[#043234] bg-[#001318]/90 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#04E6E6] shadow-sm shadow-[#04E6E6]/10">
            <LuSparkles class="h-3 w-3" />
            <span>{t('profile.badge')}</span>
          </div>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 class="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                {t('profile.title')}
              </h1>
              <p class="mt-2 max-w-xl text-lg text-slate-300">
                {t('profile.subtitle')}
              </p>
            </div>
            {isConnected.value && (
              <div class="flex items-center gap-3">
                <span class="rounded-full border border-[#043234]/80 bg-[#001318]/90 px-4 py-2 text-xs font-medium text-slate-200 shadow-sm">
                  <span class="mr-1 align-middle text-[10px]">●</span>
                  {t('profile.connected')}
                </span>
                <Button
                  onClick$={refreshAllData}
                  disabled={isLoadingData.value}
                  class="flex items-center gap-2 rounded-full border border-[#043234] bg-[#001318]/95 px-5 py-2 text-sm font-semibold text-slate-200 shadow-sm transition-all hover:bg-[#043234]/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LuRefreshCw
                    class={`h-4 w-4 ${isLoadingData.value ? 'animate-spin' : ''
                      }`}
                  />
                  {t('profile.refresh')}
                </Button>

                <Button
                  onClick$={disconnect}
                  class="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800"
                >
                  <LuLogOut class="h-4 w-4" />
                  {t('profile.disconnect@@Disconnect')}
                </Button>
              </div>
            )}
          </div>
        </section>

        {!isConnected.value ? (
          /* Connection Prompt */
          <div class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-10 py-16 text-center shadow-lg shadow-black/25 backdrop-blur">
            <LuWallet class="mx-auto mb-5 h-16 w-16 text-[#04E6E6]" />
            <h2 class="text-2xl font-semibold text-white">
              {t('profile.connect.title')}
            </h2>
            <p class="mx-auto mt-3 max-w-md text-slate-400">
              {t('profile.connect.hint')}
            </p>
            <Button
              onClick$={connect}
              disabled={isLoading.value}
              class="mx-auto mt-6 rounded-2xl bg-gradient-to-r from-[#04E6E6] to-teal-600 px-6 py-3 font-semibold text-[#001a1c] shadow-lg shadow-[#04E6E6]/25 transition-all hover:shadow-xl hover:shadow-[#04E6E6]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LuWallet class="mr-2 inline h-4 w-4" />
              {isLoading.value ? t('profile.connect.connecting') : t('profile.connect.button')}
            </Button>
          </div>
        ) : (
          <>
            {/* Wallet Overview Cards */}
            <section class="grid gap-4 md:grid-cols-3">
              {/* Address Card */}
              <div class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <LuWallet class="h-5 w-5 text-[#04E6E6]" />
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('profile.stats.address')}
                    </p>
                  </div>
                  <button
                    onClick$={() => copyToClipboard(userAddress.value)}
                    class="rounded-lg p-1.5 transition hover:bg-[#043234]/55"
                  >
                    {isCopied.value ? (
                      <LuCheck class="h-4 w-4 text-emerald-500" />
                    ) : (
                      <LuCopy class="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                </div>
                <p class="mt-2 font-mono text-sm font-semibold text-white">
                  {formatAddress(userAddress.value)}
                </p>
                <a
                  href={`https://basescan.org/address/${userAddress.value}`}
                  target="_blank"
                  rel="noreferrer"
                  class="mt-2 inline-flex items-center gap-1 text-xs text-[#04E6E6] hover:underline"
                >
                  {t('profile.stats.viewScan')}
                  <LuExternalLink class="h-3 w-3" />
                </a>
              </div>

              {/* Network / Stats Card */}
              <div class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <LuNetwork class="h-5 w-5 text-[#04E6E6]" />
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('profile.stats.network')}
                    </p>
                  </div>
                  <span class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                    {t('profile.stats.active@@Active')}
                  </span>
                </div>
                <p class="mt-2 text-lg font-semibold text-white">
                  {networkInfo.value.name}
                </p>
                <p class="text-xs text-slate-500">
                  {t('profile.stats.chainId')}: {networkInfo.value.chainId}
                </p>
                {(networkInfo.value.txCount !== undefined ||
                  networkInfo.value.nftCount !== undefined ||
                  networkInfo.value.tokenTransferCount !== undefined) && (
                    <div class="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                      {networkInfo.value.txCount !== undefined && (
                        <span class="rounded-full bg-[#043234]/55 px-2 py-0.5">
                          {t('profile.stats.tx')}: {networkInfo.value.txCount}
                        </span>
                      )}
                      {networkInfo.value.tokenTransferCount !==
                        undefined && (
                          <span class="rounded-full bg-[#043234]/55 px-2 py-0.5">
                            {t('profile.stats.tokenTx')}: {networkInfo.value.tokenTransferCount}
                          </span>
                        )}
                      {networkInfo.value.nftCount !== undefined && (
                        <span class="rounded-full bg-[#043234]/55 px-2 py-0.5">
                          {t('profile.stats.nfts')}: {networkInfo.value.nftCount}
                        </span>
                      )}
                    </div>
                  )}
              </div>

              {/* Total Value Card */}
              <div class="rounded-3xl border border-[#043234] bg-gradient-to-br from-[#001a1c] via-[#043234] to-[#04E6E6]/30 px-6 py-5 text-white shadow-lg shadow-black/30 backdrop-blur">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <LuDollarSign class="h-5 w-5" />
                    <p class="text-xs font-semibold uppercase tracking-wide text-white/80">
                      {t('profile.stats.totalValue')}
                    </p>
                  </div>
                  <div class="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium">
                    {t('profile.stats.poweredBy')}
                  </div>
                </div>
                <p class="mt-2 text-2xl font-bold">
                  {formatUSD(totalValueUSD.value)}
                </p>
                <p class="text-xs text-white/80">
                  {t('profile.stats.estimatedValue')}
                </p>
              </div>
            </section>

            {/* NFTs (servidor: Base + Ethereum) */}
            <section class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur">
              <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
                    <LuLayers class="h-5 w-5" />
                  </div>
                  <div>
                    <h2 class="text-lg font-semibold text-white">
                      {t('profile.nfts.title@@NFTs en tu wallet')}
                    </h2>
                    <p class="mt-0.5 text-xs text-slate-500">
                      {t(
                        'profile.nfts.subtitle@@Base y Ethereum · metadatos, media, floor, listados, última venta y rareza.',
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <p class="flex items-start gap-2 text-[11px] leading-snug text-slate-500">
                <LuInfo class="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span>
                  {t(
                    'profile.nfts.cuNote@@Cada actualización consulta el servidor para NFTs por wallet y transferencias. Puede tardar unos segundos.',
                  )}
                </span>
              </p>
              {profileNftsError.value ? (
                <p class="mb-3 text-sm text-amber-700">{profileNftsError.value}</p>
              ) : null}
              {!isLoadingData.value &&
              profileNfts.value.length === 0 &&
              !profileNftsError.value ? (
                <p class="text-sm text-slate-500">
                  {t(
                    'profile.nfts.empty@@No hay NFTs en las primeras páginas de Base/Ethereum, o la API no devolvió datos.',
                  )}
                </p>
              ) : null}
              {isLoadingData.value &&
              profileNfts.value.length === 0 &&
              !profileNftsError.value ? (
                <p class="text-sm text-slate-500">
                  {t('profile.nfts.loading@@Cargando NFTs…')}
                </p>
              ) : null}
              {profileNfts.value.length > 0 ? (
                <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {profileNfts.value.map((nft) => (
                    <li key={`${nft.chain}-${nft.contract}-${nft.tokenId}`}>
                      <Link
                        href={`/${loc.params.locale ?? 'en-us'}/nfts/${nft.contract}/${encodeURIComponent(nft.tokenId)}/?chain=${encodeURIComponent(nft.chain)}`}
                        class="block overflow-hidden rounded-2xl border border-[#043234]/70 bg-[#043234]/30 shadow-sm transition hover:border-[#04E6E6]/40 hover:shadow-md"
                      >
                        <div class="aspect-square w-full overflow-hidden bg-[#043234]/50">
                          {nft.image ? (
                            <img
                              src={nft.image}
                              alt=""
                              width={200}
                              height={200}
                              class="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div class="flex h-full w-full items-center justify-center text-[10px] font-medium text-slate-500">
                              NFT
                            </div>
                          )}
                        </div>
                        <div class="space-y-0.5 p-2">
                          <p
                            class="truncate text-[11px] font-semibold text-white"
                            title={nft.name}
                          >
                            {nft.name}
                          </p>
                          {nft.symbol ? (
                            <p class="truncate text-[9px] uppercase tracking-wide text-slate-500">
                              {nft.symbol}
                            </p>
                          ) : null}
                          <div class="flex flex-wrap items-center gap-1">
                            <span class="rounded bg-[#043234]/55 px-1 py-0.5 text-[9px] font-medium uppercase text-slate-400">
                              #{nft.tokenId}
                            </span>
                            <span class="rounded bg-[#043234]/55 px-1 py-0.5 text-[9px] font-medium uppercase text-slate-400">
                              {nft.chain === 'base' ? 'Base' : 'ETH'}
                            </span>
                            {nft.contractType ? (
                              <span class="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-medium text-slate-600">
                                {nft.contractType.replace('ERC', 'ERC-')}
                              </span>
                            ) : null}
                            {nft.amount ? (
                              <span class="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-medium text-amber-200">
                                ×{nft.amount}
                              </span>
                            ) : null}
                            {nft.verifiedCollection ? (
                              <span
                                class="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-medium text-emerald-300"
                                title={t('profile.nfts.verified@@Colección verificada')}
                              >
                                <LuBadgeCheck class="h-3 w-3" />
                              </span>
                            ) : null}
                          </div>
                          {nft.rarityRank != null || nft.rarityLabel ? (
                            <p class="line-clamp-2 text-[9px] text-slate-500">
                              {nft.rarityRank != null
                                ? `${t('profile.nfts.rarity@@Rareza')} #${nft.rarityRank}`
                                : null}
                              {nft.rarityRank != null && nft.rarityLabel ? ' · ' : null}
                              {nft.rarityLabel ? nft.rarityLabel : null}
                            </p>
                          ) : null}
                          {nft.floorUsd ? (
                            <p class="text-[10px] tabular-nums text-[#04E6E6]">
                              {t('profile.nfts.floor@@Floor')}{' '}
                              {nft.floorCurrency
                                ? `${String(nft.floorCurrency).toUpperCase()} · `
                                : ''}
                              ~ ${formatTokenUsdPrice(nft.floorUsd)}
                            </p>
                          ) : null}
                          {nft.listPriceUsd ? (
                            <p class="line-clamp-2 text-[10px] tabular-nums text-violet-400">
                              {t('profile.nfts.listed@@Listado')}
                              {nft.listMarketplace ? ` ${nft.listMarketplace}` : ''}
                              {nft.listCurrency
                                ? ` (${String(nft.listCurrency).toUpperCase()})`
                                : ''}
                              : ~${formatTokenUsdPrice(nft.listPriceUsd)}
                            </p>
                          ) : null}
                          {nft.lastSaleUsd || nft.lastSaleNative ? (
                            <p class="text-[10px] tabular-nums text-slate-500">
                              {t('profile.nfts.lastSale@@Últ. venta')}
                              {nft.lastSaleNative && nft.lastSalePaySymbol
                                ? ` ${nft.lastSaleNative} ${nft.lastSalePaySymbol}`
                                : ''}
                              {nft.lastSaleUsd ? ` · $${formatTokenUsdPrice(nft.lastSaleUsd)}` : ''}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {/* NFT transfers */}
            <section class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur">
              <div class="mb-4 flex items-start gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md">
                  <LuArrowLeftRight class="h-5 w-5" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-white">
                    {t('profile.nftTransfers.title@@Transferencias NFT recientes')}
                  </h2>
                  <p class="mt-0.5 text-xs text-slate-500">
                    {t(
                      'profile.nftTransfers.subtitle@@Base y Ethereum · entradas, salidas y movimientos internos.',
                    )}
                  </p>
                </div>
              </div>
              {!isLoadingData.value &&
              profileNftTransfers.value.length === 0 &&
              !profileNftsError.value ? (
                <p class="text-sm text-slate-500">
                  {t(
                    'profile.nftTransfers.empty@@No hay transferencias recientes en estas redes o la API no devolvió filas.',
                  )}
                </p>
              ) : null}
              {profileNftTransfers.value.length > 0 ? (
                <div class="overflow-x-auto rounded-2xl border border-[#043234]/70">
                  <table class="w-full min-w-[640px] text-left text-xs text-slate-300">
                    <thead class="border-b border-[#043234]/70 bg-[#001a1c]/95 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th class="px-3 py-2">{t('profile.nftTransfers.colTime@@Fecha')}</th>
                        <th class="px-3 py-2">{t('profile.nftTransfers.colDir@@Tipo')}</th>
                        <th class="px-3 py-2">{t('profile.nftTransfers.colAsset@@Activo')}</th>
                        <th class="px-3 py-2">{t('profile.nftTransfers.colTx@@Tx')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileNftTransfers.value.map((tr, idx) => (
                        <tr
                          key={`${tr.chain}-${tr.txHash}-${tr.tokenId}-${idx}`}
                          class="border-b border-[#043234]/45 last:border-0 hover:bg-[#043234]/40"
                        >
                          <td class="whitespace-nowrap px-3 py-2 tabular-nums text-slate-400">
                            {tr.ts ? formatTimestamp(tr.ts) : '—'}
                          </td>
                          <td class="px-3 py-2">
                            <span
                              class={
                                tr.direction === 'in'
                                  ? 'rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-300'
                                  : tr.direction === 'out'
                                    ? 'rounded-full bg-rose-500/25 px-2 py-0.5 text-[10px] font-semibold text-rose-300'
                                    : 'rounded-full bg-[#043234]/55 px-2 py-0.5 text-[10px] font-semibold text-slate-300'
                              }
                            >
                              {tr.direction === 'in'
                                ? t('profile.nftTransfers.in@@Entrada')
                                : tr.direction === 'out'
                                  ? t('profile.nftTransfers.out@@Salida')
                                  : t('profile.nftTransfers.other@@Otro')}
                            </span>
                            <span class="ml-1.5 text-[10px] font-medium uppercase text-slate-500">
                              {tr.chain === 'base' ? 'Base' : 'ETH'}
                            </span>
                          </td>
                          <td class="max-w-[220px] px-3 py-2">
                            <Link
                              href={`/${loc.params.locale ?? 'en-us'}/nfts/${tr.contract}/${encodeURIComponent(tr.tokenId)}/?chain=${encodeURIComponent(tr.chain)}`}
                              class="block font-medium text-[#04E6E6] hover:underline"
                            >
                              <span class="line-clamp-2">{tr.label}</span>
                            </Link>
                            <p class="mt-0.5 font-mono text-[10px] text-slate-500">
                              #{tr.tokenId}
                              {tr.amount ? ` ×${tr.amount}` : ''}
                              {tr.contractType
                                ? ` · ${tr.contractType.replace('ERC', 'ERC-')}`
                                : ''}
                            </p>
                          </td>
                          <td class="px-3 py-2">
                            <a
                              href={profileTxExplorerUrl(tr.chain, tr.txHash)}
                              target="_blank"
                              rel="noreferrer"
                              class="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-[#04E6E6]"
                            >
                              {formatAddress(tr.txHash)}
                              <LuExternalLink class="h-3 w-3 shrink-0" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>

            {/* Export Private Key Card - Only for Managed Wallets */}
            {isManagedWallet.value && (
              <section class="grid gap-4 md:grid-cols-3">
                <ExportPrivateKeyCard walletAddress={userAddress.value} />
              </section>
            )}

            {/* Analytics Row: PnL + Chain Activity + Swaps */}
            <section class="grid gap-6 lg:grid-cols-[1.4fr_1.1fr]">
              {/* Left: PnL Summary + Breakdown */}
              <div class="space-y-4">
                {/* PnL Summary Card */}
                <div class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                        <LuBarChart3 class="h-5 w-5" />
                      </div>
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('profile.pnl.title')}
                        </p>
                        <p class="text-sm text-slate-300">
                          {t('profile.pnl.subtitle')}
                        </p>
                      </div>
                    </div>
                    {/* Range selector */}
                    <div class="flex items-center gap-1 rounded-full bg-[#043234]/55 p-1 text-[11px] font-medium text-slate-400">
                      {(['7', '30', '90', 'all'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick$={() => (pnlDays.value = d)}
                          class={`rounded-full px-2.5 py-1 transition ${pnlDays.value === d
                            ? 'bg-[#043234] text-[#04E6E6] shadow-sm'
                            : 'hover:bg-[#043234]/50'
                            }`}
                        >
                          {d === 'all' ? t('allNfts.filters.marketOptions.all') : `${d}d`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasPnL ? (
                    <>
                      <div class="grid gap-4 md:grid-cols-[1.2fr_1fr] md:items-center">
                        {/* Big profit number */}
                        <div>
                          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t('profile.pnl.realized')}
                          </p>
                          <div class="mt-1 flex items-center gap-2">
                            <p
                              class={`text-2xl font-bold ${Number(
                                pnlSummary.value
                                  ?.total_realized_profit_usd ?? 0,
                              ) >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                                }`}
                            >
                              {formatUSD(
                                pnlSummary.value
                                  ?.total_realized_profit_usd ?? 0,
                              )}
                            </p>
                            <span
                              class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${Number(
                                pnlSummary.value
                                  ?.total_realized_profit_percentage ?? 0,
                              ) >= 0
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                                }`}
                            >
                              {Number(
                                pnlSummary.value
                                  ?.total_realized_profit_percentage ?? 0,
                              ) >= 0 ? (
                                <LuTrendingUp class="h-3 w-3" />
                              ) : (
                                <LuTrendingDown class="h-3 w-3" />
                              )}
                              {formatPercent(
                                pnlSummary.value
                                  ?.total_realized_profit_percentage ?? 0,
                              )}
                            </span>
                          </div>
                          <p class="mt-1 text-xs text-slate-500">
                            {t('profile.pnl.realizedDesc')}
                          </p>
                        </div>

                        {/* Small stats */}
                        <div class="grid gap-2 text-xs text-slate-400">
                          <div class="flex items-center justify-between rounded-2xl bg-[#043234]/35 px-3 py-2">
                            <span>{t('profile.pnl.trades')}</span>
                            <span class="font-semibold text-white">
                              {pnlSummary.value?.total_count_of_trades ??
                                0}
                            </span>
                          </div>
                          <div class="flex items-center justify-between rounded-2xl bg-[#043234]/35 px-3 py-2">
                            <span>{t('profile.pnl.buysSells')}</span>
                            <span class="font-semibold text-white">
                              {pnlSummary.value?.total_buys ?? 0} /{' '}
                              {pnlSummary.value?.total_sells ?? 0}
                            </span>
                          </div>
                          <div class="flex items-center justify-between rounded-2xl bg-[#043234]/35 px-3 py-2">
                            <span>{t('profile.pnl.volume')}</span>
                            <span class="font-semibold text-white">
                              {formatUSD(
                                pnlSummary.value
                                  ?.total_trade_volume ?? 0,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div class="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#001318] to-[#001a1c] px-4 py-4 text-sm text-slate-400">
                      <div class="flex items-center gap-3">
                        <div class="flex h-9 w-9 items-center justify-center rounded-full border border-[#043234] bg-[#001318] text-slate-400 shadow-sm">
                          <LuActivity class="h-5 w-5" />
                        </div>
                        <div>
                          <p class="font-semibold text-slate-200">
                            {t('profile.pnl.emptyTitle')}
                          </p>
                          <p class="text-xs text-slate-500">
                            {t('profile.pnl.emptyDesc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PnL Breakdown (Top tokens) */}
                  <div class="mt-5 border-t border-[#043234]/70 pt-4">
                    <div class="mb-2 flex items-center justify-between">
                      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('profile.pnl.breakdown')}
                      </p>
                      {pnlBreakdown.value.length > 0 && (
                        <span class="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          {t('profile.pnl.topTokens', { count: Math.min(pnlBreakdown.value.length, 5) })}
                          <LuChevronRight class="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {pnlBreakdown.value.length === 0 ? (
                      <p class="text-xs text-slate-500">
                        {t('profile.pnl.noData')}
                      </p>
                    ) : (
                      <div class="space-y-2">
                        {pnlBreakdown.value.slice(0, 5).map((token) => (
                          <div
                            key={token.tokenAddress || token.symbol}
                            class="flex items-center justify-between rounded-2xl border border-[#043234]/70 bg-[#001318]/92 px-3 py-2.5 text-xs"
                          >
                            <div class="flex items-center gap-3">
                              {token.logo ? (
                                <img
                                  src={token.logo}
                                  alt={token.symbol}
                                  class="h-7 w-7 rounded-full border border-[#043234] object-cover"
                                />
                              ) : (
                                <div class="flex h-7 w-7 items-center justify-center rounded-full bg-[#043234]/55 text-slate-500">
                                  <LuCoins class="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <p class="text-sm font-semibold text-white">
                                  {token.symbol || 'TOKEN'}
                                </p>
                                <p class="text-[11px] text-slate-500">
                                  {token.name || token.tokenAddress}
                                </p>
                              </div>
                            </div>
                            <div class="text-right">
                              <p
                                class={`text-sm font-semibold ${token.realizedProfitUsd >= 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                                  }`}
                              >
                                {formatUSD(token.realizedProfitUsd)}
                              </p>
                              <p class="text-[11px] text-slate-500">
                                {formatPercent(
                                  token.realizedProfitPercentage,
                                )}{' '}
                                · {token.countOfTrades} {t('profile.pnl.tradesCount')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Chain Activity + Swaps mini-panel */}
              <div class="space-y-4">
                {/* Chain Activity */}
                <div class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-5 py-5 shadow-lg shadow-black/25 backdrop-blur">
                  <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                        <LuGlobe2 class="h-4 w-4" />
                      </div>
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('profile.chain.title')}
                        </p>
                        <p class="text-xs text-slate-400">
                          {t('profile.chain.subtitle')}
                        </p>
                      </div>
                    </div>
                    <span class="rounded-full bg-[#043234]/55 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      {chainsActivity.value.length || 0} {t('profile.chain.chains')}
                    </span>
                  </div>

                  {chainsActivity.value.length === 0 ? (
                    <p class="py-3 text-xs text-slate-500">
                      {t('profile.chain.empty')}
                    </p>
                  ) : (
                    <div class="space-y-2">
                      {chainsActivity.value.map((c) => (
                        <div
                          key={`${c.chain}-${c.chainId}`}
                          class="flex items-center justify-between rounded-2xl border border-[#043234]/70 bg-[#001318]/92 px-3 py-2.5 text-xs"
                        >
                          <div>
                            <p class="text-sm font-semibold text-white">
                              {(c.chain || '').toUpperCase()}{' '}
                              <span class="ml-1 text-[11px] text-slate-500">
                                ({c.chainId})
                              </span>
                            </p>
                            <p class="mt-0.5 text-[11px] text-slate-500">
                              {t('profile.chain.first')}{' '}
                              {c.firstTransaction
                                ? formatTimestamp(
                                  c.firstTransaction,
                                )
                                : '—'}
                              {' · '}{t('profile.chain.last')}{' '}
                              {c.lastTransaction
                                ? formatTimestamp(
                                  c.lastTransaction,
                                )
                                : '—'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Swaps mini-panel */}
                <div class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-5 py-5 shadow-lg shadow-black/25 backdrop-blur">
                  <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-white">
                        <LuActivity class="h-4 w-4" />
                      </div>
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('profile.swaps.title')}
                        </p>
                        <p class="text-xs text-slate-400">
                          {t('profile.swaps.subtitle')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {swaps.value.length === 0 ? (
                    <p class="py-2 text-xs text-slate-500">
                      {t('profile.swaps.empty')}
                    </p>
                  ) : (
                    <div class="space-y-2 text-xs">
                      {swaps.value.slice(0, 4).map((s) => (
                        <a
                          key={s.transactionHash}
                          href={`https://basescan.org/tx/${s.transactionHash}`}
                          target="_blank"
                          rel="noreferrer"
                          class="block rounded-2xl border border-[#043234]/70 bg-[#001318]/92 px-3 py-2 transition hover:border-[#043234] hover:bg-[#043234]/55"
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div>
                              <p class="text-[11px] font-semibold text-white">
                                {s.transactionType === 'buy'
                                  ? t('profile.swaps.bought')
                                  : t('profile.swaps.sold')}{' '}
                                <span class="text-slate-400">
                                  {s.pairLabel || ''}
                                </span>
                              </p>
                              <p class="text-[11px] text-slate-500">
                                {s.exchangeName || ''} ·{' '}
                                {formatTimestamp(s.blockTimestamp)}
                              </p>
                            </div>
                            <div class="text-right text-[11px]">
                              {s.totalValueUsd !== undefined && (
                                <p class="font-semibold text-white">
                                  {formatUSD(s.totalValueUsd)}
                                </p>
                              )}
                              {s.baseQuotePrice && (
                                <p class="text-slate-500">
                                  {t('profile.swaps.price')}: {s.baseQuotePrice}
                                </p>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Balances + History + Deployments */}
            <section class="grid gap-6 lg:grid-cols-[1.4fr_1.1fr]">
              {/* Left: Native & Token Balances */}
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-semibold text-white">
                    {t('profile.balances.title')}
                  </h2>
                  <Button
                    onClick$={refreshAllData}
                    disabled={isLoadingData.value}
                    class="flex items-center gap-2 rounded-xl border border-[#043234] bg-[#001318]/95 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-[#043234]/35 disabled:opacity-50"
                  >
                    <LuRefreshCw
                      class={`h-4 w-4 ${isLoadingData.value ? 'animate-spin' : ''
                        }`}
                    />
                    {t('profile.balances.refresh')}
                  </Button>
                </div>

                {/* Native Balance (Base ETH) */}
                <div class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <span class="text-lg font-bold">Ξ</span>
                      </div>
                      <div>
                        <p class="font-semibold text-white">
                          {t('profile.balances.native')}
                        </p>
                        <p class="text-xs text-slate-500">
                          {t('profile.balances.nativeDesc')}
                        </p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-semibold text-white">
                        {formatBalance(nativeBalance.value, 18)}
                      </p>
                      <p class="text-xs text-slate-500">
                        {formatUSD(nativeValueUSD.value)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ERC-20 Tokens (todos los balances) */}
                {tokenBalances.value.length > 0 ? (
                  <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {tokenBalances.value.map((token) => (
                      <div
                        key={token.address}
                        class="rounded-2xl border border-[#043234] bg-[#001318]/95 px-5 py-4 shadow-sm backdrop-blur"
                      >
                        <div class="flex items-center justify-between gap-3">
                          <div class="flex items-center gap-3">
                            {token.logo ? (
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                class="h-10 w-10 rounded-full border border-[#043234] object-cover"
                              />
                            ) : (
                              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#043234]/60 to-[#001a1c] text-slate-400">
                                <LuCoins class="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p class="font-semibold text-white">
                                {token.name || token.symbol || 'Token'}
                              </p>
                              <p class="text-xs text-slate-500">
                                {token.symbol}
                              </p>
                            </div>
                          </div>
                          <div class="text-right">
                            <p class="font-semibold text-white">
                              {formatBalance(
                                token.balance,
                                token.decimals,
                              )}
                            </p>
                            {token.valueUSD !== undefined && (
                              <p class="text-xs text-slate-500">
                                {formatUSD(token.valueUSD)}
                              </p>
                            )}
                            {token.priceChange24h !== undefined && (
                              <p
                                class={`mt-0.5 text-[11px] ${token.priceChange24h >= 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                                  }`}
                              >
                                {formatPercent(token.priceChange24h)} {t('myNfts.profile.relativeTimes.daysAgo', { count: 1 }).replace('1', '24h')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div class="rounded-2xl border border-[#043234] bg-[#001318]/75 px-6 py-8 text-center backdrop-blur">
                    <LuCoins class="mx-auto mb-3 h-10 w-10 text-slate-600" />
                    <p class="text-sm text-slate-500">
                      {t('profile.balances.emptyToken')}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Recent Activity + Deployments */}
              <div class="space-y-4">
                {/* Recent Activity */}
                <div class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-5 py-5 shadow-lg shadow-black/25 backdrop-blur">
                  <div class="mb-3 flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-white">
                      {t('profile.history.title')}
                    </h2>
                    <span class="text-[11px] text-slate-500">
                      {t('profile.history.lastEntries', { count: recentTransactions.value.length })}
                    </span>
                  </div>

                  {recentTransactions.value.length > 0 ? (
                    <div class="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                      {recentTransactions.value.map((tx) => (
                        <a
                          key={tx.hash + tx.tokenSymbol + tx.value}
                          href={`https://basescan.org/tx/${tx.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          class="block rounded-xl border border-[#043234]/70 bg-[#001a1c]/85 px-4 py-3 text-xs transition hover:border-[#043234] hover:bg-[#043234]/55"
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex items-start gap-3">
                              <div
                                class={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${tx.type === 'receive'
                                  ? 'bg-emerald-500/25 text-emerald-300'
                                  : tx.type === 'send'
                                    ? 'bg-sky-500/25 text-sky-300'
                                    : 'bg-[#043234]/55 text-slate-400'
                                  }`}
                              >
                                {tx.type === 'receive' ? (
                                  <LuArrowDownRight class="h-4 w-4" />
                                ) : tx.type === 'send' ? (
                                  <LuArrowUpRight class="h-4 w-4" />
                                ) : (
                                  <LuActivity class="h-4 w-4" />
                                )}
                              </div>
                              <div class="min-w-0 flex-1">
                                <p class="text-sm font-semibold text-white">
                                  {tx.type === 'receive'
                                    ? t('profile.history.received')
                                    : tx.type === 'send'
                                      ? t('profile.history.sent')
                                      : t('profile.history.contract')}
                                </p>
                                <p class="truncate text-[11px] text-slate-500">
                                  {tx.type === 'receive'
                                    ? `${t('profile.history.from')} ${formatAddress(tx.from)}`
                                    : `${t('profile.history.to')} ${formatAddress(tx.to)}`}
                                </p>
                                <p class="mt-0.5 text-[11px] text-slate-500">
                                  {tx.hash.slice(0, 10)}…
                                </p>
                              </div>
                            </div>
                            <div class="text-right text-[11px]">
                              <p class="font-semibold text-white">
                                {formatBalance(
                                  tx.value,
                                  tx.tokenDecimals ?? 18,
                                )}{' '}
                                {tx.tokenSymbol || 'ETH'}
                              </p>
                              <p class="text-slate-500">
                                {formatTimestamp(tx.timestamp)}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div class="py-8 text-center">
                      <LuActivity class="mx-auto mb-3 h-10 w-10 text-slate-600" />
                      <p class="text-sm text-slate-500">
                        {t('profile.history.empty')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Contract Deployments */}
                <div class="rounded-3xl border border-[#043234] bg-[#001318]/95 px-5 py-5 shadow-lg shadow-black/25 backdrop-blur">
                  <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <LuLayers class="h-4 w-4" />
                      </div>
                      <h2 class="text-sm font-semibold text-white">
                        {t('profile.deployments.title')}
                      </h2>
                    </div>
                    <span class="rounded-full bg-[#043234]/55 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      {contractDeployments.value.length}
                    </span>
                  </div>

                  {contractDeployments.value.length === 0 ? (
                    <p class="py-2 text-xs text-slate-500">
                      {t('profile.deployments.empty')}
                    </p>
                  ) : (
                    <div class="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {contractDeployments.value.map((d) => (
                        <a
                          key={d.txHash}
                          href={`https://basescan.org/tx/${d.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          class="block rounded-2xl border border-[#043234]/70 bg-[#001318]/92 px-4 py-3 text-xs transition hover:border-[#043234] hover:bg-[#043234]/55"
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex items-start gap-3">
                              <div class="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white">
                                <LuFileCode2 class="h-4 w-4" />
                              </div>
                              <div>
                                <p class="text-xs font-semibold text-white">
                                  {t('profile.deployments.deployed')}
                                </p>
                                <p class="text-[11px] text-slate-500">
                                  {formatAddress(d.contractAddress)}
                                </p>
                                <p class="mt-0.5 text-[11px] text-slate-500">
                                  {t('profile.deployments.block')} {d.blockNumber} ·{' '}
                                  {formatTimestamp(d.timestamp)}
                                </p>
                              </div>
                            </div>
                            <div class="text-right text-[11px] text-slate-500">
                              {d.txFee !== undefined && (
                                <p>
                                  {t('profile.deployments.fee')}{' '}
                                  {d.txFee.toLocaleString('en-US', {
                                    maximumFractionDigits: 8,
                                  })}{' '}
                                  ETH
                                </p>
                              )}
                              {d.gasUsed !== undefined && (
                                <p>{t('profile.deployments.gas')} {d.gasUsed}</p>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#043234] pt-4 text-[11px] text-slate-500">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-slate-300">
                  KNRT Property
                </span>
                <span class="hidden text-slate-500 sm:inline">·</span>
                <span>{t('profile.footer.desc')}</span>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <span>{t('profile.footer.powered')}</span>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
});
