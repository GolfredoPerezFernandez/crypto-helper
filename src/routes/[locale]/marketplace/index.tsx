import { component$, useSignal, useTask$, useComputed$, $, useContext } from '@builder.io/qwik';
import { routeLoader$, Link, useLocation } from '@builder.io/qwik-city';
import { inlineTranslate, useSpeak } from 'qwik-speak';
import { useMarketplaceContracts } from '~/hooks/useMarketplaceContracts';
import { useWallet } from '~/hooks/useWallet';
import { DemoModeContext } from '~/contexts/demo';
import { MarketplaceConfigContext } from '~/contexts/config';

export interface NFTData {
  tokenId: string | number;
  owner: string;
  currentMode: number; // 0: None, 1: Sale, 2: Rental, 3: Power
  saleActive: boolean;
  salePrice: bigint;
  rentalListed: boolean;
  rentalBasePrice: bigint;
  rentalDuration: number;
  powerListed: boolean;
  powerDuration: number;
  powerActiveCount: number;
  rentalActiveCount: number;
  powerOffersCount: number;
  rentalOffersCount: number;
  // Metadata (on-chain/IPFS with DB fallback)
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  /** true when there is no public metadata visible (suggests private/locked metadata) */
  metadataLocked?: boolean;
  isPublic?: boolean;
}

/* =========================================================
   Helpers
========================================================= */

// Token format
const formatTokenAmount = (amount: bigint, decimals = 18): string => {
  if (amount === 0n) return '0';
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const frac = amount % base;
  // If whole is huge (like 10^18), it means we might have formatted it wrong earlier
  // but let's just format what we have.
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr ? `${whole.toString()}.${fracStr.slice(0, 6)}` : whole.toString();
};

const decimalToUnits = (val: string, decimals = 18): bigint => {
  if (!val) return 0n;
  // Robust check: if it's a very long string (>12 chars) with NO decimal point,
  // it's likely already in WEI/units.
  const trimmed = val.replace(/,/g, '').trim();
  if (trimmed.length > 12 && !trimmed.includes('.')) {
    try {
      return BigInt(trimmed);
    } catch {
      // fallback to normal parsing
    }
  }
  const base = 10n ** BigInt(decimals);
  const [i, f = ''] = trimmed.split('.');
  const intBN = BigInt(i || '0');
  const fracPadded = (f + '0'.repeat(decimals)).slice(0, decimals);
  const fracBN = BigInt(fracPadded || '0');
  return intBN * base + fracBN;
};

// formatDuration is now handled inside the component to use localized units

const ipfsToHttp = (uri: string, host = 'storacha.link') => {
  if (!uri) return '';
  if (!uri.startsWith('ipfs://')) return uri;
  const without = uri.slice('ipfs://'.length);
  const [cid, ...rest] = without.split('/');
  if (!cid) return '';
  const path = rest.join('/');
  return path ? `https://${cid}.ipfs.${host}/${path}` : `https://${cid}.ipfs.${host}`;
};

/* =========================================================
   Loader
========================================================= */

export const useNFTsLoader = routeLoader$(async (requestEvent) => {
  const nftAddress = requestEvent.env.get('PUBLIC_NFT_ADDRESS') || '';
  try {
    if (
      !nftAddress ||
      nftAddress === '0x...' ||
      nftAddress === '0xyourcontractaddresshere'
    ) {
      console.warn('Contract address not configured — demo mode will still work');
      return {
        success: true,
        nfts: [] as NFTData[],
        error: null as string | null,
        contractAddress: '',
        needsClientLoad: true, // Always true so demo mode can load on the client
      };
    }
    return {
      success: true,
      nfts: [] as NFTData[],
      error: null as string | null,
      contractAddress: nftAddress,
      needsClientLoad: true,
    };
  } catch (error) {
    console.error('Error loading NFTs:', error);
    return {
      success: false,
      nfts: [] as NFTData[],
      error: error instanceof Error ? error.message : 'Unknown error',
      contractAddress: '',
      needsClientLoad: false,
    };
  }
});

/* =========================================================
   Component
========================================================= */

export default component$(() => {
  useSpeak({ runtimeAssets: ['allNfts'] });
  const t = inlineTranslate();
  const loaderData = useNFTsLoader();

  const nftsData = useSignal<{ success: boolean; nfts: NFTData[]; error: string | null }>({
    success: true,
    nfts: [],
    error: null,
  });

  const isLoading = useSignal(true);
  const unlistedCount = useSignal(0); // Unlisted NFTs (exclusive)

  const location = useLocation();

  // Hooks
  const { wallet, connectWallet, openWalletModal } = useWallet();
  const demoMode = useContext(DemoModeContext);
  const config = useContext(MarketplaceConfigContext);

  const {
    contracts,
    actions,
    error: hookError,
  } = useMarketplaceContracts();

  // Localized duration formatter
  // Localized duration formatter
  const formatDuration = (seconds: number) => {
    if (!seconds) return t('allNfts.card.na');
    if (seconds < 3600) return `${Math.round(seconds / 60)} ${t('allNfts.units.min')}`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} ${t('allNfts.units.hrs')}`;
    return `${Math.round(seconds / 86400)} ${t('allNfts.units.days')}`;
  };

  // UI helpers
  const getListingModeText = (mode: number) => {
    switch (mode) {
      case 0: return t('allNfts.card.mode.none');
      case 1: return t('allNfts.card.mode.sale');
      case 2: return t('allNfts.card.mode.rent');
      case 3: return t('allNfts.card.mode.power');
      default: return t('allNfts.card.mode.unknown');
    }
  };

  const getListingModeColor = (mode: number) => {
    switch (mode) {
      case 0: return 'bg-gray-100 text-gray-800 dark:bg-gray-50 dark:text-gray-900';
      case 1: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 2: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 3: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-50 dark:text-gray-900';
    }
  };

  /* =========================================================
     FILTERS & SORT
  ========================================================= */

  const q = useSignal('');
  const market = useSignal<'all' | 'sale' | 'rental' | 'power' | 'none'>('all');
  const ownerContains = useSignal('');
  const saleMin = useSignal('');     // KNRT
  const saleMax = useSignal('');     // KNRT
  const rentMin = useSignal('');     // KNRT
  const rentMax = useSignal('');     // KNRT
  const durMin = useSignal('');      // seconds
  const durMax = useSignal('');      // seconds
  const traitKey = useSignal('');
  const traitValContains = useSignal('');
  const sortBy = useSignal<'recent' | 'priceAsc' | 'priceDesc' | 'tokenAsc' | 'tokenDesc'>('recent');
  const onlyWithOffers = useSignal(false);

  const clearFilters = $(() => {
    q.value = '';
    market.value = 'all';
    ownerContains.value = '';
    saleMin.value = '';
    saleMax.value = '';
    rentMin.value = '';
    rentMax.value = '';
    durMin.value = '';
    durMax.value = '';
    traitKey.value = '';
    traitValContains.value = '';
    sortBy.value = 'recent';
    onlyWithOffers.value = false;
  });

  const filtered = useComputed$(() => {
    const list = [...nftsData.value.nfts];
    const user = wallet.address?.toLowerCase();

    // 0) Visibility check: hide private NFTs unless current user is owner
    let visibleList = list.filter(n => {
      if (n.isPublic !== false) return true; // public by default
      if (user && n.owner.toLowerCase() === user) return true; // owner can see
      return false;
    });

    // 1) Market (exclusive by currentMode)
    let afterMarket = visibleList;
    switch (market.value) {
      case 'sale': afterMarket = list.filter(n => n.currentMode === 1); break;
      case 'rental': afterMarket = list.filter(n => n.currentMode === 2); break;
      case 'power': afterMarket = list.filter(n => n.currentMode === 3); break;
      case 'none': afterMarket = list.filter(n => n.currentMode === 0); break;
      default: afterMarket = list; break;
    }

    // 2) Owner contains (partial)
    const own = ownerContains.value.trim().toLowerCase();
    if (own) {
      afterMarket = afterMarket.filter(n => (n.owner || '').toLowerCase().includes(own));
    }

    // 3) Sale range (if applicable)
    const sMin = saleMin.value.trim();
    const sMax = saleMax.value.trim();
    if (sMin || sMax) {
      const sMinWei = sMin ? decimalToUnits(sMin) : null;
      const sMaxWei = sMax ? decimalToUnits(sMax) : null;
      afterMarket = afterMarket.filter(n => {
        if (!n.saleActive) return false;
        if (sMinWei && n.salePrice < sMinWei) return false;
        if (sMaxWei && n.salePrice > sMaxWei) return false;
        return true;
      });
    }

    // 4) Rental range (base price)
    const rMin = rentMin.value.trim();
    const rMax = rentMax.value.trim();
    if (rMin || rMax) {
      const rMinWei = rMin ? decimalToUnits(rMin) : null;
      const rMaxWei = rMax ? decimalToUnits(rMax) : null;
      afterMarket = afterMarket.filter(n => {
        if (!n.rentalListed) return false;
        if (rMinWei && n.rentalBasePrice < rMinWei) return false;
        if (rMaxWei && n.rentalBasePrice > rMaxWei) return false;
        return true;
      });
    }

    // 5) Duration range (applies to rental/power)
    const dMin = durMin.value.trim();
    const dMax = durMax.value.trim();
    if (dMin || dMax) {
      const dMinN = dMin ? Number(dMin) : null;
      const dMaxN = dMax ? Number(dMax) : null;
      afterMarket = afterMarket.filter(n => {
        const durations = [
          n.rentalListed ? n.rentalDuration : null,
          n.powerListed ? n.powerDuration : null,
        ].filter((x): x is number => typeof x === 'number' && x > 0);
        if (durations.length === 0) return false;
        const candidate = Math.max(...durations); // use the longest available duration
        if (dMinN !== null && candidate < dMinN) return false;
        if (dMaxN !== null && candidate > dMaxN) return false;
        return true;
      });
    }

    // 6) Trait contains
    const key = traitKey.value.trim().toLowerCase();
    const val = traitValContains.value.trim().toLowerCase();
    if (key || val) {
      afterMarket = afterMarket.filter(n => {
        const attrs = n.attributes || [];
        return attrs.some(a => {
          const k = (a.trait_type || '').toLowerCase();
          const v = String(a.value ?? '').toLowerCase();
          if (key && !k.includes(key)) return false;
          if (val && !v.includes(val)) return false;
          return true;
        });
      });
    }

    // 7) Global search (name, desc, id, traits)
    const query = q.value.trim().toLowerCase();
    if (query) {
      afterMarket = afterMarket.filter(n => {
        const inName = (n.name || '').toLowerCase().includes(query);
        const inDesc = (n.description || '').toLowerCase().includes(query);
        const inId = String(n.tokenId).includes(query);
        const inTraits = (n.attributes || []).some(a =>
          (a.trait_type || '').toLowerCase().includes(query) ||
          String(a.value ?? '').toLowerCase().includes(query)
        );
        return inName || inDesc || inId || inTraits;
      });
    }

    // 8) Only with offers
    if (onlyWithOffers.value) {
      afterMarket = afterMarket.filter(n =>
        (n.rentalOffersCount > 0) || (n.powerOffersCount > 0)
      );
    }

    // 9) Sort
    switch (sortBy.value) {
      case 'recent':
        afterMarket.sort((a, b) => String(b.tokenId).localeCompare(String(a.tokenId), undefined, { numeric: true }));
        break;
      case 'tokenAsc':
        afterMarket.sort((a, b) => String(a.tokenId).localeCompare(String(b.tokenId), undefined, { numeric: true }));
        break;
      case 'tokenDesc':
        afterMarket.sort((a, b) => String(b.tokenId).localeCompare(String(a.tokenId), undefined, { numeric: true }));
        break;
      case 'priceAsc':
        afterMarket.sort((a, b) => {
          const pa = (a.saleActive ? a.salePrice : a.rentalListed ? a.rentalBasePrice : 0n);
          const pb = (b.saleActive ? b.salePrice : b.rentalListed ? b.rentalBasePrice : 0n);
          if (pa === pb) return String(b.tokenId).localeCompare(String(a.tokenId), undefined, { numeric: true });
          return pa < pb ? -1 : 1;
        });
        break;
      case 'priceDesc':
        afterMarket.sort((a, b) => {
          const pa = (a.saleActive ? a.salePrice : a.rentalListed ? a.rentalBasePrice : 0n);
          const pb = (b.saleActive ? b.salePrice : b.rentalListed ? b.rentalBasePrice : 0n);
          if (pa === pb) return String(b.tokenId).localeCompare(String(a.tokenId), undefined, { numeric: true });
          return pa > pb ? -1 : 1;
        });
        break;
    }

    return afterMarket;
  });

  // EXCLUSIVE counters (consistent with Total)
  const counters = useComputed$(() => {
    const userAddressVal = wallet.address?.toLowerCase();
    const arr = nftsData.value.nfts.filter(n => {
      if (n.isPublic !== false) return true;
      if (userAddressVal && n.owner.toLowerCase() === userAddressVal) return true;
      return false;
    });
    const sale = arr.filter((n) => n.currentMode === 1).length;
    const rental = arr.filter((n) => n.currentMode === 2).length;
    const power = arr.filter((n) => n.currentMode === 3).length;
    const none = arr.filter((n) => n.currentMode === 0).length;
    return {
      total: arr.length,
      sale,
      rental,
      power,
      none,
    };
  });

  // Show filters only after successful load
  const showFilters = useComputed$(() => !isLoading.value && nftsData.value.success);

  /* =========================================================
     Load NFTs
  ========================================================= */

  const loadNFTsFromContract = $(async () => {
    const contractAddress = loaderData.value.contractAddress || config.nftAddress;
    const { needsClientLoad } = loaderData.value;

    // Use the reactive actions from contracts.value (switches between demo/real)
    const act = contracts.value.actions || actions;

    if (!contractAddress && !demoMode.enabled.value) {
      nftsData.value = {
        success: false,
        nfts: [],
        error: 'Contract address not available',
      };
      isLoading.value = false;
      return;
    }

    try {
      // Wait for contracts to be initialized
      let attempts = 0;
      while (!contracts.value?.nft?.address && attempts < 20) {
        await new Promise((r) => setTimeout(r, 150));
        attempts++;
      }
      if (!contracts.value?.nft?.address) {
        nftsData.value = {
          success: false,
          nfts: [],
          error: hookError.value || 'Contracts not initialized. Check PUBLIC_* variables in .env',
        };
        isLoading.value = false;
        return;
      }

      // Re-read actions after the wait (contracts.value may have changed)
      const liveActions = contracts.value.actions || act;

      // 1) Universe of tokens + active ids by market
      const [allIdsRaw, saleIdsRaw, rentalIdsRaw, powerIdsRaw] = await Promise.all([
        liveActions.getAllTokenIds().catch(() => [] as string[]),
        liveActions.getActiveSaleIds().catch(() => [] as string[]),
        liveActions.getActiveRentalTokenIds().catch(() => [] as string[]),
        liveActions.getActivePowerTokenIds().catch(() => [] as string[]),
      ]);

      const allIds = allIdsRaw.map(String);
      const saleSet = new Set(saleIdsRaw.map(String));
      const rentalSet = new Set(rentalIdsRaw.map(String));
      const powerSet = new Set(powerIdsRaw.map(String));

      if (allIds.length === 0) {
        nftsData.value = { success: true, nfts: [], error: null };
        unlistedCount.value = 0;
        isLoading.value = false;
        return;
      }

      // 3) Load details per token in batches
      const nftsArray: NFTData[] = [];
      const chunkSize = 10;

      for (let i = 0; i < allIds.length; i += chunkSize) {
        const chunk = allIds.slice(i, i + chunkSize);

        await Promise.all(
          chunk.map(async (tokenIdStr) => {
            const tokenId = String(tokenIdStr);
            try {
              // Base details + listings
              const [owner, isPublic, saleListing, rentalListing, powerListing] = await Promise.all([
                liveActions.getNFTOwner(tokenId).catch(() => ''),
                liveActions.isMetadataPublic(tokenId).catch(() => true),
                liveActions.getSaleListing(tokenId).catch(() => null),
                liveActions.getRentalListing(tokenId).catch(() => null),
                liveActions.getPowerListing(tokenId).catch(() => null),
              ]);

              // Offers/active (only if listing is active)
              const [rentalOffers, powerOffers, activeRenters, activePowerRenters] = await Promise.all([
                rentalListing?.isActive ? liveActions.getRentalOffers(tokenId).catch(() => []) : Promise.resolve([]),
                powerListing?.isActive ? liveActions.getPowerOffers(tokenId).catch(() => []) : Promise.resolve([]),
                rentalListing?.isActive ? liveActions.getActiveRenters(tokenId).catch(() => []) : Promise.resolve([]),
                powerListing?.isActive ? liveActions.getActivePowerRenters(tokenId).catch(() => []) : Promise.resolve([]),
              ]);

              // Current mode (priority: Sale > Rental > Power)
              let currentMode = 0;
              if (saleListing?.isActive) currentMode = 1;
              else if (rentalListing?.isActive) currentMode = 2;
              else if (powerListing?.isActive) currentMode = 3;

              // ---------- Metadata: IPFS first ----------
              let metaName = `NFT #${tokenId}`;
              let metaDesc = '';
              let metaImage = '';
              let metaAttrs: Array<{ trait_type: string; value: string }> = [];
              let metadataLocked = false;

              try {
                const privateJson = await liveActions.fetchPrivateJson(tokenId).catch(() => null);
                const publicJson = privateJson ? null : await liveActions.fetchTokenJson(tokenId).catch(() => null);

                const meta = privateJson || publicJson;
                if (meta && typeof meta === 'object') {
                  if (typeof meta.name === 'string' && meta.name.trim()) metaName = meta.name;
                  if (typeof meta.description === 'string') metaDesc = meta.description;
                  if (typeof meta.image === 'string' && meta.image) metaImage = ipfsToHttp(meta.image);
                  if (Array.isArray(meta.attributes)) {
                    metaAttrs = meta.attributes
                      .filter((a: any) => a && typeof a.trait_type === 'string')
                      .map((a: any) => ({ trait_type: String(a.trait_type), value: String(a.value ?? '') }));
                  }
                }
                // If no metadata available, keep default values
              } catch {
                // If IPFS fetch fails, keep default values
              }

              // Consider "locked" if there is no image, no description, and no attributes
              metadataLocked = !metaImage && !metaDesc && !(metaAttrs?.length);

              nftsArray.push({
                tokenId: tokenId,
                owner,
                currentMode,
                saleActive: Boolean(saleListing?.isActive),
                salePrice: saleListing?.price ? decimalToUnits(saleListing.price) : 0n,
                rentalListed: Boolean(rentalListing?.isActive),
                rentalBasePrice: rentalListing?.basePrice ? decimalToUnits(rentalListing.basePrice) : 0n,
                rentalDuration: rentalListing?.duration ? Number(rentalListing.duration) : 0,
                powerListed: Boolean(powerListing?.isActive),
                powerDuration: powerListing?.duration ? Number(powerListing.duration) : 0,
                powerActiveCount: activePowerRenters.length,
                rentalActiveCount: activeRenters.length,
                powerOffersCount: powerOffers.length,
                rentalOffersCount: rentalOffers.length,
                name: metaName,
                description: metaDesc,
                image: metaImage, // already http if it came as ipfs://
                attributes: metaAttrs,
                metadataLocked, // <-- new
                isPublic,
              });
            } catch (err) {
              console.error(`[Properties] Error fetching NFT state for token ${tokenId}:`, err);
            }
          })
        );
      }

      // Update list and exclusive counters (unlisted = currentMode 0)
      nftsData.value = { success: true, nfts: nftsArray, error: null };
      unlistedCount.value = nftsArray.filter((n) => n.currentMode === 0).length;
    } catch (error) {
      console.error('Error loading NFTs from contract:', error);
      nftsData.value = {
        success: false,
        nfts: [],
        error: error instanceof Error ? error.message : 'Error loading NFTs from contract',
      };
    } finally {
      isLoading.value = false;
    }
  });

  // Reload when contracts change, demo mode toggles, or the loader indicates client-side load
  useTask$(({ track }) => {
    track(() => contracts.value?.nft?.address);
    track(() => loaderData.value.needsClientLoad);
    const isDemoActive = track(() => demoMode.enabled.value);
    console.log('[marketplace] useTask$ triggered – demo:', isDemoActive, 'nft addr:', contracts.value?.nft?.address);
    // Load if we have a real contract address OR demo mode is active
    if (loaderData.value.needsClientLoad && (loaderData.value.contractAddress || isDemoActive)) {
      isLoading.value = true;
      loadNFTsFromContract();
    }
  });

  // Load on mount (first render)
  useTask$(({ track }) => {
    track(() => loaderData.value.needsClientLoad);
    if (loaderData.value.needsClientLoad) {
      loadNFTsFromContract();
    } else {
      isLoading.value = false;
    }
  });

  return (
    <div class="min-h-screen bg-gray-50 text-gray-900 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-8">
          <h1 class="text-4xl font-bold bg-gradient-to-r from-[#c1272d] to-[#d13238] bg-clip-text text-transparent">
            {t('allNfts.title')}
          </h1>
          <p class="mt-2 text-gray-600">{t('allNfts.description')}</p>
          {loaderData.value.contractAddress && (
            <p class="mt-1 text-xs font-mono text-gray-900">
              {t('allNfts.contract')} {loaderData.value.contractAddress.slice(0, 6)}...
              {loaderData.value.contractAddress.slice(-4)}
            </p>
          )}
        </div>

        {/* Optional banner if no wallet (non-blocking) */}
        {!wallet.connected && (
          <div class="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-900">
            <span>{t('allNfts.banner.text')}</span>
            <button
              onClick$={$(() => openWalletModal())}
              class="px-3 py-2 rounded bg-gradient-to-r from-[#c1272d] to-[#d13238] hover:from-[#a91f23] hover:to-[#c1272d] text-white font-medium"
            >
              {t('allNfts.banner.connect')}
            </button>
          </div>
        )}

        {/* LOADING */}
        {isLoading.value ? (
          <div class="flex justify-center items-center py-20">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-[#c1272d] border-t-transparent mx-auto mb-4"></div>
              <p class="text-gray-600">{t('allNfts.loading')}</p>
            </div>
          </div>
        ) : nftsData.value.success ? (
          <>
            {/* FILTERS PANEL: only when already loaded */}
            {showFilters.value && (
              <div class="mb-6 grid grid-cols-1 lg:grid-cols-12 gap-3 bg-white border border-gray-200 p-4 rounded-xl transition-opacity duration-300 opacity-100">
                <div class="lg:col-span-4">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.search')}</label>
                  <input
                    placeholder={t('allNfts.filters.searchPlaceholder')}
                    value={q.value}
                    onInput$={(_, el) => (q.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                  />
                </div>

                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.market')}</label>
                  <select
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                    value={market.value}
                    onChange$={(_, el) => (market.value = (el as HTMLSelectElement).value as any)}
                  >
                    <option value="all">{t('allNfts.filters.marketOptions.all')}</option>
                    <option value="sale">{t('allNfts.filters.marketOptions.sale')}</option>
                    <option value="rental">{t('allNfts.filters.marketOptions.rent')}</option>
                    <option value="power">{t('allNfts.filters.marketOptions.power')}</option>
                    <option value="none">{t('allNfts.filters.marketOptions.none')}</option>
                  </select>
                </div>

                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.owner')}</label>
                  <input
                    placeholder={t('allNfts.filters.ownerPlaceholder')}
                    value={ownerContains.value}
                    onInput$={(_, el) => (ownerContains.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                  />
                </div>

                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.saleMin')}</label>
                  <input
                    type="number"
                    placeholder="0.0"
                    value={saleMin.value}
                    onInput$={(_, el) => (saleMin.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                    min="0"
                  />
                </div>
                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.saleMax')}</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={saleMax.value}
                    onInput$={(_, el) => (saleMax.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                    min="0"
                  />
                </div>

                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.rentMin')}</label>
                  <input
                    type="number"
                    placeholder="0.0"
                    value={rentMin.value}
                    onInput$={(_, el) => (rentMin.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                    min="0"
                  />
                </div>
                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.rentMax')}</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={rentMax.value}
                    onInput$={(_, el) => (rentMax.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                    min="0"
                  />
                </div>

                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.durationMin')}</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={durMin.value}
                    onInput$={(_, el) => (durMin.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                    min="0"
                  />
                </div>
                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.durationMax')}</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={durMax.value}
                    onInput$={(_, el) => (durMax.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                    min="0"
                  />
                </div>

                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.traitKey')}</label>
                  <input
                    placeholder={t('allNfts.filters.traitKeyPlaceholder')}
                    value={traitKey.value}
                    onInput$={(_, el) => (traitKey.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                  />
                </div>
                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.traitValue')}</label>
                  <input
                    placeholder={t('allNfts.filters.traitValuePlaceholder')}
                    value={traitValContains.value}
                    onInput$={(_, el) => (traitValContains.value = (el as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                  />
                </div>

                <div class="lg:col-span-2">
                  <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.sort')}</label>
                  <select
                    class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm"
                    value={sortBy.value}
                    onChange$={(_, el) => (sortBy.value = (el as HTMLSelectElement).value as any)}
                  >
                    <option value="recent">{t('allNfts.filters.sortOptions.recent')}</option>
                    <option value="tokenAsc">{t('allNfts.filters.sortOptions.tokenAsc')}</option>
                    <option value="tokenDesc">{t('allNfts.filters.sortOptions.tokenDesc')}</option>
                    <option value="priceAsc">{t('allNfts.filters.sortOptions.priceAsc')}</option>
                    <option value="priceDesc">{t('allNfts.filters.sortOptions.priceDesc')}</option>
                  </select>
                </div>

                <div class="lg:col-span-2 flex items-end">
                  <label class="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={onlyWithOffers.value}
                      onInput$={(_, el) => (onlyWithOffers.value = (el as HTMLInputElement).checked)}
                    />
                    {t('allNfts.filters.onlyOffers')}
                  </label>
                </div>

                <div class="lg:col-span-2 flex items-end justify-end">
                  <button
                    onClick$={clearFilters}
                    class="px-3 py-2 rounded bg-gray-50 border border-gray-200 hover:bg-gray-200 text-sm"
                  >
                    {t('allNfts.filters.clear')}
                  </button>
                </div>
              </div>
            )}

            {/* Summary (exclusive) + filtered */}
            <div class="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>
                {t('allNfts.stats.total')}{' '}
                <span class="font-semibold text-gray-900">{counters.value.total}</span>
              </span>
              <span>•</span>
              <span>
                {t('allNfts.stats.sale')}{' '}
                <span class="font-semibold text-green-600">{counters.value.sale}</span>
              </span>
              <span>•</span>
              <span>
                {t('allNfts.stats.rent')}{' '}
                <span class="font-semibold text-blue-400">{counters.value.rental}</span>
              </span>
              <span>•</span>
              <span>
                {t('allNfts.stats.power')}{' '}
                <span class="font-semibold text-purple-400">{counters.value.power}</span>
              </span>
              <span>•</span>
              <span>
                {t('allNfts.stats.none')}{' '}
                <span class="font-semibold text-gray-900">{counters.value.none}</span>
              </span>
              <span>•</span>
              <span>
                {t('allNfts.stats.filtered')}{' '}
                <span class="font-semibold text-gray-900">{filtered.value.length}</span>
              </span>
            </div>

            {nftsData.value.nfts.length === 0 ? (
              <div class="text-center py-20">
                <svg
                  class="mx-auto h-16 w-16 text-gray-900 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">{t('allNfts.empty.noProperties')}</h3>
                <p class="text-gray-600">{t('allNfts.empty.noPropertiesDesc')}</p>
                <div class="mt-6">
                  <Link
                    href={`/${location.params.locale || 'en-us'}/mint/`}
                    class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#c1272d] to-[#d13238] text-white font-medium rounded-lg hover:from-[#a91f23] hover:to-[#c1272d] transition-all"
                  >
                    {t('allNfts.empty.mintBtn')}
                  </Link>
                </div>
              </div>
            ) : filtered.value.length === 0 ? (
              <div class="text-center py-16 border border-gray-200 rounded-xl bg-gray-100">
                <p class="text-gray-900">{t('allNfts.empty.noResults')}</p>
                <button
                  onClick$={clearFilters}
                  class="mt-3 px-3 py-2 rounded bg-gray-50 border border-gray-200 hover:bg-gray-200 text-sm"
                >
                  {t('allNfts.empty.clearFilters')}
                </button>
              </div>
            ) : (
              <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.value.map((nft) => (
                  <div
                    key={nft.tokenId}
                    class="bg-white border border-gray-200 overflow-hidden shadow-2xl rounded-xl hover:border-[#c1272d]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(193,39,45,0.3)]"
                  >
                    {/* Image */}
                    <div class="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                      <img
                        src={
                          nft.image
                            ? ipfsToHttp(nft.image)
                            : `https://via.placeholder.com/400x400/1a1a1a/c1272d?text=NFT+${nft.tokenId}`
                        }
                        alt={nft.name || `NFT #${nft.tokenId}`}
                        class={`w-full h-full object-cover transition-transform duration-300 ${nft.metadataLocked ? '' : 'hover:scale-110'}`}
                        loading="lazy"
                      />
                      {/* Mode Badge */}
                      <div class="absolute top-3 right-3">
                        <span
                          class={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getListingModeColor(
                            nft.currentMode
                          )}`}
                        >
                          {getListingModeText(nft.currentMode)}
                        </span>
                      </div>

                      {/* LOCK OVERLAY */}
                      {nft.metadataLocked && (
                        <div class="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-3">
                          <div class="text-center">
                            <div class="inline-flex items-center justify-center text-sm font-semibold text-gray-900 bg-black/50 border border-white/20 rounded-full px-3 py-1 mb-2">
                              {t('allNfts.card.locked')}
                            </div>
                            <p
                              class="text-xs sm:text-sm text-gray-600"
                              dangerouslySetInnerHTML={t('allNfts.card.lockedDesc')}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div class="p-6">
                      <div class="mb-4">
                        <h3 class="text-lg font-bold text-gray-900 mb-1">
                          {nft.name || `NFT #${nft.tokenId}`}
                        </h3>

                        {/* Optional CTA message under title when locked */}
                        {nft.metadataLocked && (
                          <p class="text-xs mt-1 text-amber-600">
                            {t('allNfts.card.metaUnavailable')}
                          </p>
                        )}

                        {(!nft.metadataLocked && nft.description) && (
                          <p class="text-sm text-gray-600 line-clamp-2">{nft.description}</p>
                        )}

                        {/* Link to image in gateway (only if NOT locked) */}
                        {nft.image && !nft.metadataLocked && (
                          <a
                            href={ipfsToHttp(nft.image)}
                            target="_blank"
                            rel="noreferrer"
                            class="mt-2 block text-xs text-gray-600 hover:text-gray-600 underline"
                          >
                            {t('allNfts.card.viewGateway')}
                          </a>
                        )}
                      </div>

                      <div class="space-y-3 mb-6">
                        <div>
                          <p class="text-xs text-gray-900">{t('allNfts.card.owner')}</p>
                          <p class="text-sm font-mono text-gray-900 truncate">
                            {nft.owner
                              ? `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}`
                              : t('allNfts.card.na')}
                          </p>
                        </div>

                        {/* Sale */}
                        {nft.saleActive && (
                          <div class="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 p-3 rounded-lg">
                            <h4 class="text-sm font-semibold text-green-700 mb-1">{t('allNfts.card.saleTitle')}</h4>
                            <p class="text-lg font-bold text-gray-900">
                              {formatTokenAmount(nft.salePrice)}{' '}
                              <span class="text-sm text-green-600">KNRT</span>
                            </p>
                          </div>
                        )}

                        {/* Rent */}
                        {nft.rentalListed && (
                          <div class="bg-gradient-to-r from-blue-50 to-cyan-100 border border-blue-200 p-3 rounded-lg">
                            <h4 class="text-sm font-semibold text-blue-700 mb-2">{t('allNfts.card.rentTitle')}</h4>
                            <div class="space-y-1 text-sm">
                              <div class="flex justify-between">
                                <span class="text-blue-600">{t('allNfts.card.basePrice')}</span>
                                <span class="font-semibold text-gray-900">
                                  {formatTokenAmount(nft.rentalBasePrice)} KNRT
                                </span>
                              </div>
                              <div class="flex justify-between">
                                <span class="text-blue-600">{t('allNfts.card.duration')}</span>
                                <span class="font-semibold text-gray-900">
                                  {formatDuration(nft.rentalDuration)}
                                </span>
                              </div>
                              <div class="flex justify-between pt-1 border-t border-blue-200">
                                <span class="text-blue-700">
                                  {t('allNfts.card.active')} <span class="text-gray-900">{nft.rentalActiveCount}</span>
                                </span>
                                <span class="text-blue-700">
                                  {t('allNfts.card.offers')} <span class="text-gray-900">{nft.rentalOffersCount}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Power */}
                        {nft.powerListed && (
                          <div class="bg-gradient-to-r from-purple-50 to-indigo-100 border border-purple-200 p-3 rounded-lg">
                            <h4 class="text-sm font-semibold text-purple-700 mb-2">
                              {t('allNfts.card.powerTitle')}
                            </h4>
                            <div class="space-y-1 text-sm">
                              <div class="flex justify-between">
                                <span class="text-purple-600">{t('allNfts.card.duration')}</span>
                                <span class="font-semibold text-gray-900">
                                  {formatDuration(nft.powerDuration)}
                                </span>
                              </div>
                              <div class="flex justify-between pt-1 border-t border-purple-200">
                                <span class="text-purple-700">
                                  {t('allNfts.card.active')} <span class="text-gray-900">{nft.powerActiveCount}</span>
                                </span>
                                <span class="text-purple-700">
                                  {t('allNfts.card.offers')} <span class="text-gray-900">{nft.powerOffersCount}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div class="flex gap-2">
                        <Link
                          href={`/${location.params.locale}/nft/${nft.tokenId}`}
                          class="flex-1 bg-white text-gray-700 text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        >
                          {t('allNfts.card.viewDetails')}
                        </Link>
                        {nft.saleActive && (
                          <Link
                            href={`/${location.params.locale}/nft/${nft.tokenId}`}
                            class="flex-1 bg-gradient-to-r from-[#c1272d] to-[#d13238] hover:from-[#a91f23] hover:to-[#c1272d] text-white text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
                          >
                            {t('allNfts.card.buy')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div class="bg-red-50 border border-red-200 rounded-xl p-6">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-lg font-semibold text-red-700">{t('allNfts.error.title')}</h3>
                <p class="mt-2 text-red-600">{nftsData.value.error}</p>
                <div class="mt-4">
                  <button
                    onClick$={loadNFTsFromContract}
                    class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('allNfts.error.retry')}
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
