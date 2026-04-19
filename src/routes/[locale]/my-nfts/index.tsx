import { component$, useSignal, useTask$, $, useContext } from '@builder.io/qwik';
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
  // Metadata (on-chain/IPFS or DB)
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  /** true when there is no public metadata visible (suggests private/locked metadata) */
  metadataLocked?: boolean;
  // User relationship
  isOwnedByUser?: boolean; // True if user is the owner
  isRentedByUser?: boolean; // True if user is actively renting it
  isPowerGrantedToUser?: boolean; // True if user has active power access
  rentalExpiresAt?: string; // When rental expires (if rented by user)
  powerExpiresAt?: string; // When power expires (if power granted to user)
  isPublic?: boolean;
}

// -------- Format/parse helpers --------
const formatTokenAmount = (amount: bigint, decimals = 18): string => {
  if (amount === 0n) return '0';
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const frac = amount % base;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr ? `${whole.toString()}.${fracStr.slice(0, 6)}` : whole.toString();
};

const decimalToUnits = (val: string, decimals = 18): bigint => {
  if (!val) return 0n;
  const cleaned = val.replace(/[^\d.,]/g, '').replace(/,/g, '.'); // accept comma
  const [i, f = ''] = cleaned.trim().split('.');
  const base = 10n ** BigInt(decimals);
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

// Loader: validate contract and indicate that real loading happens on the client
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

export default component$(() => {
  useSpeak({ runtimeAssets: ['myNfts'] });
  const t = inlineTranslate();
  const loaderData = useNFTsLoader();
  const loc = useLocation();
  const demoMode = useContext(DemoModeContext);
  const config = useContext(MarketplaceConfigContext);

  const nftsData = useSignal<{ success: boolean; nfts: NFTData[]; error: string | null }>({
    success: true,
    nfts: [],
    error: null,
  });

  const isLoading = useSignal(true);
  const unlistedCount = useSignal(0); // User NFTs NOT listed in any market

  // ---------- Filters ----------
  const search = useSignal('');
  const market = useSignal<'all' | 'sale' | 'rental' | 'power' | 'none'>('all');
  const relationshipFilter = useSignal<'all' | 'owned' | 'renting' | 'power'>('all');
  const ownerContains = useSignal('');
  const saleMin = useSignal(''); // KNRT decimals
  const saleMax = useSignal('');
  const rentMin = useSignal('');
  const rentMax = useSignal('');
  const durMin = useSignal('');
  const durMax = useSignal('');
  const traitKey = useSignal('');
  const traitVal = useSignal('');
  const onlyWithOffers = useSignal(false);
  const sortBy = useSignal<
    'recent' | 'oldest' | 'priceAsc' | 'priceDesc' | 'rentAsc' | 'rentDesc' | 'durAsc' | 'durDesc'
  >('recent');

  const filtered = useSignal<NFTData[]>([]);
  const filteredCount = useSignal(0);

  const clearFilters = $(() => {
    search.value = '';
    market.value = 'all';
    relationshipFilter.value = 'all';
    ownerContains.value = '';
    saleMin.value = '';
    saleMax.value = '';
    rentMin.value = '';
    rentMax.value = '';
    durMin.value = '';
    durMax.value = '';
    traitKey.value = '';
    traitVal.value = '';
    onlyWithOffers.value = false;
    sortBy.value = 'recent';
  });

  // Hooks
  const { wallet, connectWallet, openWalletModal } = useWallet();
  const {
    contracts,
    actions,
    userAddress,
    error: hookError,
  } = useMarketplaceContracts();

  // Localized duration formatter
  const formatDuration = (seconds: number) => {
    if (!seconds) return t('allNfts.card.na');
    if (seconds < 3600) return `${Math.round(seconds / 60)} ${t('myNfts.units.min')}`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} ${t('myNfts.units.hrs')}`;
    return `${Math.round(seconds / 86400)} ${t('myNfts.units.days')}`;
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

  // Load ONLY the NFTs owned by the connected user (listed or not)
  const loadNFTsFromContract = $(async () => {
    const contractAddress = loaderData.value.contractAddress || config.nftAddress;
    const { needsClientLoad } = loaderData.value;
    // Use live actions from contracts.value (switches between demo/real on toggle)
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

    // Require connected wallet
    if (!wallet.connected || !wallet.address) {
      nftsData.value = {
        success: false,
        nfts: [],
        error: 'wallet_not_connected',
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

      const addr = (wallet.address || userAddress.value) as `0x${string}`;
      console.log('[My NFTs] Fetching for address:', addr);

      // 1) Get user's owned NFTs and NFTs where user is renting/has power
      const [
        userNFTIds,
        saleListedIds,
        rentalListedIds,
        powerListedIds,
        unlistedIds,
        activeRentalTokenIds,
        activePowerTokenIds
      ] = await Promise.all([
        act.getUserNFTs(addr).then((res: string[]) => {
          console.log('[My NFTs] getUserNFTs result:', res);
          return res;
        }).catch((e: any) => {
          console.error('[My NFTs] getUserNFTs error:', e);
          return [] as string[];
        }),
        act.getUserSaleListed(addr).catch(() => [] as string[]),
        act.getUserRentalListed(addr).catch(() => [] as string[]),
        act.getUserPowerListed(addr).catch(() => [] as string[]),
        act.getUnlistedNFTs(addr).catch(() => [] as string[]),
        act.getActiveRentalTokenIds().catch(() => [] as string[]),
        act.getActivePowerTokenIds().catch(() => [] as string[]),
      ]);

      // Count of user's unlisted NFTs
      unlistedCount.value = Array.isArray(unlistedIds) ? unlistedIds.length : 0;

      // 2) Find NFTs where user is a renter (not owner)
      const rentedByUserIds: string[] = [];
      for (const tokenId of activeRentalTokenIds) {
        try {
          const activeRental = await act.getActiveRental(tokenId, addr).catch(() => null);
          if (activeRental && activeRental.active) {
            rentedByUserIds.push(tokenId);
          }
        } catch {
          // Ignore errors
        }
      }

      // 3) Find NFTs where user has power access (not owner)
      const powerGrantedToUserIds: string[] = [];
      for (const tokenId of activePowerTokenIds) {
        try {
          const powerGrant = await act.getPowerGrant(tokenId, addr).catch(() => null);
          if (powerGrant && powerGrant.active) {
            powerGrantedToUserIds.push(tokenId);
          }
        } catch {
          // Ignore errors
        }
      }

      // 4) Combine all token IDs (owned + rented + power)
      const allTokenIds = new Set([
        ...userNFTIds.map(String),
        ...rentedByUserIds,
        ...powerGrantedToUserIds
      ]);

      if (allTokenIds.size === 0) {
        nftsData.value = { success: true, nfts: [], error: null };
        isLoading.value = false;
        return;
      }

      const saleSet = new Set(saleListedIds.map(String));
      const rentalSet = new Set(rentalListedIds.map(String));
      const powerSet = new Set(powerListedIds.map(String));
      const rentedByUserSet = new Set(rentedByUserIds);
      const powerGrantedSet = new Set(powerGrantedToUserIds);

      // 5) Details for each NFT (owned, rented, or with power)
      const nftsArray: NFTData[] = [];
      for (const tokenId of Array.from(allTokenIds)) {
        try {
          // Current owner
          const [owner, isPublic] = await Promise.all([
            act.getNFTOwner(tokenId),
            act.isMetadataPublic(tokenId).catch(() => true),
          ]);
          const isOwnedByUser = owner.toLowerCase() === addr.toLowerCase();

          // Only fetch full listing details if token appears in the respective set
          const [saleListing, rentalListing, powerListing] = await Promise.all([
            saleSet.has(tokenId) ? act.getSaleListing(tokenId).catch(() => null) : Promise.resolve(null),
            rentalSet.has(tokenId) || rentedByUserSet.has(tokenId)
              ? act.getRentalListing(tokenId).catch(() => null)
              : Promise.resolve(null),
            powerSet.has(tokenId) || powerGrantedSet.has(tokenId)
              ? act.getPowerListing(tokenId).catch(() => null)
              : Promise.resolve(null),
          ]);

          // Offers/actives only if applicable
          const [powerOffers, rentalOffers, activeRenters, activePowerRenters] = await Promise.all([
            powerListing?.isActive ? act.getPowerOffers(tokenId).catch(() => []) : Promise.resolve([]),
            rentalListing?.isActive ? act.getRentalOffers(tokenId).catch(() => []) : Promise.resolve([]),
            rentalListing?.isActive ? act.getActiveRenters(tokenId).catch(() => []) : Promise.resolve([]),
            powerListing?.isActive ? act.getActivePowerRenters(tokenId).catch(() => []) : Promise.resolve([]),
          ]);

          // Current mode (priority: Sale > Rental > Power)
          let currentMode = 0;
          if (saleListing?.isActive) currentMode = 1;
          else if (rentalListing?.isActive) currentMode = 2;
          else if (powerListing?.isActive) currentMode = 3;

          // --- Metadata (private > public > DB fallback) ---
          let metaName = `NFT #${tokenId}`;
          let metaDesc = '';
          let metaImage = '';
          let metaAttrs: Array<{ trait_type: string; value: string }> = [];
          let metadataLocked = false;

          try {
            // 1) Try PRIVATE JSON (owner or whoever has access)
            const privateJson = await act.fetchPrivateJson(tokenId).catch(() => null);

            // 2) If no private access, try public tokenURI (if contract exposes it)
            const publicJson = privateJson ? null : await act.fetchTokenJson(tokenId).catch(() => null);

            const meta = privateJson || publicJson;
            if (meta && typeof meta === 'object') {
              metaName = typeof meta.name === 'string' && meta.name.trim() ? meta.name : metaName;
              metaDesc = typeof meta.description === 'string' ? meta.description : '';
              if (typeof meta.image === 'string' && meta.image) {
                metaImage = ipfsToHttp(meta.image);
              }
              if (Array.isArray(meta.attributes)) {
                metaAttrs = meta.attributes
                  .filter((a: any) => a && typeof a.trait_type === 'string')
                  .map((a: any) => ({ trait_type: String(a.trait_type), value: String(a.value ?? '') }));
              }
            } else {
              // 3) (Optional) DB fallback if you have requestEvent available
              // const dbMeta = await getNFTMetadata(requestEvent, tokenId).catch(() => null);
              // if (dbMeta) {
              //   metaName = dbMeta.name || metaName;
              //   metaDesc = dbMeta.description || '';
              //   metaImage = dbMeta.image ? ipfsToHttp(dbMeta.image) : '';
              //   metaAttrs = Array.isArray(dbMeta.attributes) ? dbMeta.attributes : [];
              // }
            }
          } catch {
            // If access is denied or call reverts, ignore
          }

          // Consider "locked" if there is no image, no description, and no attributes
          metadataLocked = !metaImage && !metaDesc && !(metaAttrs?.length);

          // Check if user is renting this NFT
          let isRentedByUser = false;
          let rentalExpiresAt = '';
          if (rentedByUserSet.has(tokenId) && !isOwnedByUser) {
            const activeRental = await act.getActiveRental(tokenId, addr).catch(() => null);
            if (activeRental && activeRental.active) {
              isRentedByUser = true;
              rentalExpiresAt = activeRental.expiresAt;
            }
          }

          // Check if user has power access to this NFT
          let isPowerGrantedToUser = false;
          let powerExpiresAt = '';
          if (powerGrantedSet.has(tokenId) && !isOwnedByUser) {
            const powerGrant = await act.getPowerGrant(tokenId, addr).catch(() => null);
            if (powerGrant && powerGrant.active) {
              isPowerGrantedToUser = true;
              powerExpiresAt = powerGrant.expiresAt;
            }
          }

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
            // Normalized metadata (HTTP image)
            name: metaName,
            description: metaDesc,
            image: metaImage,
            attributes: metaAttrs,
            metadataLocked,
            // User relationship
            isOwnedByUser,
            isRentedByUser,
            isPowerGrantedToUser,
            rentalExpiresAt,
            powerExpiresAt,
            isPublic,
          });
        } catch (err) {
          console.error(`[My NFTs] Error fetching NFT state for token ${tokenId}:`, err);
        }
      }

      nftsData.value = { success: true, nfts: nftsArray, error: null };
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
  useTask$(({ track }) => {
    const data = track(() => nftsData.value.nfts);
    track(() => search.value);
    track(() => market.value);
    track(() => relationshipFilter.value);
    track(() => ownerContains.value);
    track(() => saleMin.value);
    track(() => saleMax.value);
    track(() => rentMin.value);
    track(() => rentMax.value);
    track(() => durMin.value);
    track(() => durMax.value);
    track(() => traitKey.value);
    track(() => traitVal.value);
    track(() => onlyWithOffers.value);
    track(() => sortBy.value);

    // Track Demo Mode
    const demoEnabled = track(() => demoMode.enabled.value);

    let arr = [...data];

    // --- FILTER: DEMO vs REAL strict separation ---
    if (demoEnabled) {
      arr = arr.filter((n) => String(n.tokenId).startsWith('DEMO-'));
    } else {
      arr = arr.filter((n) => !String(n.tokenId).startsWith('DEMO-'));
    }

    // free text: name, desc, id, owner, traits
    const q = search.value.trim().toLowerCase();
    if (q) {
      arr = arr.filter((n) => {
        const inName = (n.name || '').toLowerCase().includes(q);
        const inDesc = (n.description || '').toLowerCase().includes(q);
        const inId = String(n.tokenId).includes(q);
        const inOwner = (n.owner || '').toLowerCase().includes(q);
        const inTraits = (n.attributes || []).some(
          (t) =>
            (t.trait_type || '').toLowerCase().includes(q) ||
            String(t.value ?? '').toLowerCase().includes(q)
        );
        return inName || inDesc || inId || inOwner || inTraits;
      });
    }

    // market
    if (market.value !== 'all') {
      arr = arr.filter((n) => {
        if (market.value === 'sale') return !!n.saleActive;
        if (market.value === 'rental') return !!n.rentalListed;
        if (market.value === 'power') return !!n.powerListed;
        if (market.value === 'none') return !n.saleActive && !n.rentalListed && !n.powerListed;
        return true;
      });
    }

    // relationship filter
    if (relationshipFilter.value !== 'all') {
      arr = arr.filter((n) => {
        if (relationshipFilter.value === 'owned') return !!n.isOwnedByUser;
        if (relationshipFilter.value === 'renting') return !!n.isRentedByUser;
        if (relationshipFilter.value === 'power') return !!n.isPowerGrantedToUser;
        return true;
      });
    }

    // owner contains
    if (ownerContains.value.trim()) {
      const oc = ownerContains.value.trim().toLowerCase();
      arr = arr.filter((n) => (n.owner || '').toLowerCase().includes(oc));
    }

    // sale KNRT ranges (if saleActive)
    const sMin = saleMin.value.trim() ? decimalToUnits(saleMin.value.trim()) : null;
    const sMax = saleMax.value.trim() ? decimalToUnits(saleMax.value.trim()) : null;
    if (sMin || sMax) {
      arr = arr.filter((n) => {
        if (!n.saleActive) return false;
        const p = n.salePrice || 0n;
        if (sMin && p < sMin) return false;
        if (sMax && p > sMax) return false;
        return true;
      });
    }

    // rent KNRT ranges (if rentalListed)
    const rMin = rentMin.value.trim() ? decimalToUnits(rentMin.value.trim()) : null;
    const rMax = rentMax.value.trim() ? decimalToUnits(rentMax.value.trim()) : null;
    if (rMin || rMax) {
      arr = arr.filter((n) => {
        if (!n.rentalListed) return false;
        const p = n.rentalBasePrice || 0n;
        if (rMin && p < rMin) return false;
        if (rMax && p > rMax) return false;
        return true;
      });
    }

    // durations (seconds) for rent/power, if set
    const dMin = durMin.value.trim() ? Number(durMin.value.trim()) : null;
    const dMax = durMax.value.trim() ? Number(durMax.value.trim()) : null;
    if (dMin !== null || dMax !== null) {
      arr = arr.filter((n) => {
        const rentOk =
          n.rentalListed &&
          (dMin === null || n.rentalDuration >= dMin) &&
          (dMax === null || n.rentalDuration <= dMax);
        const powerOk =
          n.powerListed &&
          (dMin === null || n.powerDuration >= dMin) &&
          (dMax === null || n.powerDuration <= dMax);
        if (!n.rentalListed && !n.powerListed) return false;
        return rentOk || powerOk;
      });
    }

    // trait key/value
    if (traitKey.value.trim() || traitVal.value.trim()) {
      const key = traitKey.value.trim().toLowerCase();
      const val = traitVal.value.trim().toLowerCase();
      arr = arr.filter((n) =>
        (n.attributes || []).some((t) => {
          const tk = (t.trait_type || '').toLowerCase();
          const tv = String(t.value ?? '').toLowerCase();
          const keyOk = key ? tk.includes(key) : true;
          const valOk = val ? tv.includes(val) : true;
          return keyOk && valOk;
        })
      );
    }

    // only with offers (rental/power)
    if (onlyWithOffers.value) {
      arr = arr.filter(
        (n) =>
          (n.rentalListed && n.rentalOffersCount > 0) ||
          (n.powerListed && n.powerOffersCount > 0)
      );
    }

    // sort
    const by = sortBy.value;
    arr.sort((a, b) => {
      switch (by) {
        case 'recent':
          // Sort string/number safely
          return String(b.tokenId).localeCompare(String(a.tokenId), undefined, { numeric: true });
        case 'oldest':
          return String(a.tokenId).localeCompare(String(b.tokenId), undefined, { numeric: true });
        case 'priceAsc': {
          const pa = a.saleActive ? a.salePrice : 0n;
          const pb = b.saleActive ? b.salePrice : 0n;
          return pa === pb ? 0 : pa < pb ? -1 : 1;
        }
        case 'priceDesc': {
          const pa = a.saleActive ? a.salePrice : 0n;
          const pb = b.saleActive ? b.salePrice : 0n;
          return pa === pb ? 0 : pa > pb ? -1 : 1;
        }
        case 'rentAsc': {
          const ra = a.rentalListed ? a.rentalBasePrice : 0n;
          const rb = b.rentalListed ? b.rentalBasePrice : 0n;
          return ra === rb ? 0 : ra < rb ? -1 : 1;
        }
        case 'rentDesc': {
          const ra = a.rentalListed ? a.rentalBasePrice : 0n;
          const rb = b.rentalListed ? b.rentalBasePrice : 0n;
          return ra === rb ? 0 : ra > rb ? -1 : 1;
        }
        case 'durAsc': {
          const da = a.rentalListed ? a.rentalDuration : a.powerListed ? a.powerDuration : 0;
          const db = b.rentalListed ? b.rentalDuration : b.powerListed ? b.powerDuration : 0;
          return da - db;
        }
        case 'durDesc': {
          const da = a.rentalListed ? a.rentalDuration : a.powerListed ? a.powerDuration : 0;
          const db = b.rentalListed ? b.rentalDuration : b.powerListed ? b.powerDuration : 0;
          return db - da;
        }
      }
      return 0;
    });

    filtered.value = arr;
    filteredCount.value = arr.length;
  });

  // Reload when wallet state changes, contracts are ready, or demo mode toggles
  useTask$(({ track }) => {
    track(() => wallet.connected);
    track(() => wallet.address);
    track(() => contracts.value?.nft?.address);
    const isDemoActive = track(() => demoMode.enabled.value);
    // Load if we have a real contract address OR demo mode is active
    if (loaderData.value.needsClientLoad && (loaderData.value.contractAddress || isDemoActive)) {
      isLoading.value = true;
      loadNFTsFromContract();
    }
  });

  // Load on mount
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
            {t('myNfts.title')}
          </h1>
          <p class="mt-2 text-gray-600">{t('myNfts.subtitle')}</p>
          {loaderData.value.contractAddress && (
            <p class="mt-1 text-xs font-mono text-gray-900">
              {t('allNfts.contract')} {loaderData.value.contractAddress.slice(0, 6)}...
              {loaderData.value.contractAddress.slice(-4)}
            </p>
          )}
        </div>

        {/* Wallet not connected (blocks loading) */}
        {!wallet.connected ? (
          <div class="flex justify-center items-center py-20">
            <div class="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-md mx-auto">
              <div class="mb-6">
                <svg
                  class="mx-auto h-16 w-16 text-[#c1272d] mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <h3 class="text-xl font-bold text-gray-900 mb-2">{t('myNfts.connectWallet.title')}</h3>
                <p class="text-gray-600 mb-6">
                  {t('myNfts.connectWallet.desc')}
                </p>
                <button
                  onClick$={$(() => openWalletModal())}
                  class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#c1272d] to-[#d13238] text-white font-semibold rounded-lg hover:from-[#a91f23] hover:to-[#c1272d] transition-all transform hover:scale-105"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  {t('myNfts.connectWallet.button')}
                </button>
              </div>
              <div class="text-xs text-gray-900">
                <p>{t('myNfts.connectWallet.hint@@We support MetaMask, WalletConnect and other compatible wallets')}</p>
              </div>
            </div>
          </div>
        ) : isLoading.value ? (
          <div class="flex justify-center items-center py-20">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-[#c1272d] border-t-transparent mx-auto mb-4"></div>
              <p class="text-gray-600">{t('allNfts.loading')}</p>
            </div>
          </div>
        ) : nftsData.value.success ? (
          <>
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
                <h3 class="text-xl font-semibold text-gray-900 mb-2">{t('myNfts.empty.title')}</h3>
                <p class="text-gray-600">{t('myNfts.empty.desc')}</p>
                <div class="mt-6">
                  <Link
                    href={`/${loc.params.locale || 'en-us'}/mint/`}
                    class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#c1272d] to-[#d13238] text-white font-medium rounded-lg hover:from-[#a91f23] hover:to-[#c1272d] transition-all"
                  >
                    {t('myNfts.empty.button')}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* FILTERS PANEL */}
                <div class="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Search */}
                    <div class="md:col-span-2">
                      <label class="block text-xs text-gray-600 mb-1">{t('myNfts.filters.search')}</label>
                      <input
                        placeholder={t('allNfts.filters.searchPlaceholder')}
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-[#c1272d]"
                        value={search.value}
                        onInput$={(_, el) => (search.value = (el as HTMLInputElement).value)}
                      />
                    </div>

                    {/* Market */}
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('myNfts.filters.market')}</label>
                      <select
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={market.value}
                        onInput$={(_, el) => (market.value = (el as HTMLSelectElement).value as any)}
                      >
                        <option value="all">{t('allNfts.filters.marketOptions.all')}</option>
                        <option value="sale">{t('allNfts.filters.marketOptions.sale')}</option>
                        <option value="rental">{t('allNfts.filters.marketOptions.rent')}</option>
                        <option value="power">{t('allNfts.filters.marketOptions.power')}</option>
                        <option value="none">{t('allNfts.filters.marketOptions.none')}</option>
                      </select>
                    </div>

                    {/* Relationship Filter */}
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('myNfts.filters.relationship')}</label>
                      <select
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={relationshipFilter.value}
                        onInput$={(_, el) => (relationshipFilter.value = (el as HTMLSelectElement).value as any)}
                      >
                        <option value="all">{t('allNfts.filters.marketOptions.all')}</option>
                        <option value="owned">{t('myNfts.filters.owned')}</option>
                        <option value="renting">{t('myNfts.filters.renting')}</option>
                        <option value="power">{t('myNfts.filters.power')}</option>
                      </select>
                    </div>

                    {/* Owner contains */}
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.owner')}</label>
                      <input
                        placeholder={t('allNfts.filters.ownerPlaceholder')}
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={ownerContains.value}
                        onInput$={(_, el) => (ownerContains.value = (el as HTMLInputElement).value)}
                      />
                    </div>

                    {/* Sale ranges */}
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.saleMin')}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.0"
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={saleMin.value}
                        onInput$={(_, el) => (saleMin.value = (el as HTMLInputElement).value)}
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.saleMax')}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="∞"
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={saleMax.value}
                        onInput$={(_, el) => (saleMax.value = (el as HTMLInputElement).value)}
                      />
                    </div>

                    {/* Rent ranges */}
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.rentMin')}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.0"
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={rentMin.value}
                        onInput$={(_, el) => (rentMin.value = (el as HTMLInputElement).value)}
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.rentMax')}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="∞"
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={rentMax.value}
                        onInput$={(_, el) => (rentMax.value = (el as HTMLInputElement).value)}
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.durationMin')}</label>
                      <input
                        type="number"
                        placeholder="0"
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={durMin.value}
                        onInput$={(_, el) => (durMin.value = (el as HTMLInputElement).value)}
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.durationMax')}</label>
                      <input
                        type="number"
                        placeholder="∞"
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={durMax.value}
                        onInput$={(_, el) => (durMax.value = (el as HTMLInputElement).value)}
                      />
                    </div>

                    {/* Trait */}
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.traitKey')}</label>
                      <input
                        placeholder={t('allNfts.filters.traitKeyPlaceholder')}
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={traitKey.value}
                        onInput$={(_, el) => (traitKey.value = (el as HTMLInputElement).value)}
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.traitValue')}</label>
                      <input
                        placeholder={t('allNfts.filters.traitValuePlaceholder')}
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={traitVal.value}
                        onInput$={(_, el) => (traitVal.value = (el as HTMLInputElement).value)}
                      />
                    </div>

                    {/* Sort & offers */}
                    <div>
                      <label class="block text-xs text-gray-600 mb-1">{t('allNfts.filters.sort')}</label>
                      <select
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                        value={sortBy.value}
                        onInput$={(_, el) => (sortBy.value = (el as HTMLSelectElement).value as any)}
                      >
                        <option value="recent">{t('myNfts.filters.sortOptions.recent')}</option>
                        <option value="oldest">{t('myNfts.filters.sortOptions.oldest')}</option>
                        <option value="priceAsc">{t('myNfts.filters.sortOptions.priceAsc')}</option>
                        <option value="priceDesc">{t('myNfts.filters.sortOptions.priceDesc')}</option>
                        <option value="rentAsc">{t('myNfts.filters.sortOptions.rentAsc')}</option>
                        <option value="rentDesc">{t('myNfts.filters.sortOptions.rentDesc')}</option>
                        <option value="durAsc">{t('myNfts.filters.sortOptions.durAsc')}</option>
                        <option value="durDesc">{t('myNfts.filters.sortOptions.durDesc')}</option>
                      </select>
                    </div>
                    <div class="flex items-end">
                      <label class="inline-flex items-center gap-2 text-sm text-gray-900">
                        <input
                          type="checkbox"
                          checked={onlyWithOffers.value}
                          onInput$={(_, el) => (onlyWithOffers.value = (el as HTMLInputElement).checked)}
                        />
                        {t('allNfts.filters.onlyOffers')}
                      </label>
                    </div>

                    {/* Summary & actions */}
                    <div class="md:col-span-4 flex justify-between items-center pt-2">
                      <div class="text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                        <span>
                          {t('allNfts.stats.total')}{' '}
                          <span class="font-semibold text-gray-900">{nftsData.value.nfts.length}</span>
                        </span>
                        <span class="text-gray-600">•</span>
                        <span>
                          {t('myNfts.filter.owned')}{' '}
                          <span class="font-semibold text-green-600">
                            {nftsData.value.nfts.filter((nft) => nft.isOwnedByUser).length}
                          </span>
                        </span>
                        <span class="text-gray-600">•</span>
                        <span>
                          {t('myNfts.filter.renting')}{' '}
                          <span class="font-semibold text-blue-400">
                            {nftsData.value.nfts.filter((nft) => nft.isRentedByUser).length}
                          </span>
                        </span>
                        <span class="text-gray-600">•</span>
                        <span>
                          {t('myNfts.filter.power')}{' '}
                          <span class="font-semibold text-purple-400">
                            {nftsData.value.nfts.filter((nft) => nft.isPowerGrantedToUser).length}
                          </span>
                        </span>
                        <span class="text-gray-600">•</span>
                        <span>
                          {t('allNfts.stats.sale')}{' '}
                          <span class="font-semibold text-green-600">
                            {nftsData.value.nfts.filter((nft) => nft.saleActive).length}
                          </span>
                        </span>
                        <span class="text-gray-600">•</span>
                        <span>
                          {t('allNfts.stats.rent')}{' '}
                          <span class="font-semibold text-blue-400">
                            {nftsData.value.nfts.filter((nft) => nft.rentalListed).length}
                          </span>
                        </span>
                        <span class="text-gray-600">•</span>
                        <span>
                          {t('allNfts.stats.power')}{' '}
                          <span class="font-semibold text-purple-400">
                            {nftsData.value.nfts.filter((nft) => nft.powerListed).length}
                          </span>
                        </span>
                        <span class="text-gray-600">•</span>
                        <span>
                          {t('myNfts.filter.unlisted')}{' '}
                          <span class="font-semibold text-gray-900">{unlistedCount.value}</span>
                        </span>
                        <span class="text-gray-600">•</span>
                        <span>
                          {t('allNfts.stats.filtered')}{' '}
                          <span class="font-semibold text-gray-900">{filteredCount.value}</span>
                        </span>
                      </div>
                      <button
                        onClick$={clearFilters}
                        class="px-3 py-2 rounded bg-gray-50 border border-gray-200 hover:bg-gray-200 text-sm"
                      >
                        {t('allNfts.filters.clear')}
                      </button>
                    </div>
                  </div>
                </div>

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
                        {/* User Relationship Badge (Top Left) */}
                        <div class="absolute top-3 left-3 flex flex-col gap-1.5">
                          {nft.isOwnedByUser && (
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/90 text-gray-900 backdrop-blur-sm">
                              {t('myNfts.badges.owned')}
                            </span>
                          )}
                          {nft.isPublic === false && (
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-900/90 text-white backdrop-blur-sm">
                              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                              </svg>
                              {t('myNfts.badges.private@@Private')}
                            </span>
                          )}
                          {nft.isRentedByUser && (
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/90 text-gray-900 backdrop-blur-sm">
                              {t('myNfts.badges.renting')}
                            </span>
                          )}
                          {nft.isPowerGrantedToUser && (
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/90 text-gray-900 backdrop-blur-sm">
                              {t('myNfts.badges.power')}
                            </span>
                          )}
                        </div>

                        {/* Mode Badge (Top Right) */}
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
                                {t('allNfts.card.metadataLocked')}
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

                          {/* Optional CTA under title when locked */}
                          {nft.metadataLocked && (
                            <p class="text-xs mt-1 text-amber-600">
                              {t('allNfts.card.metadataUnavailable')}
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

                          {/* Rental Expiration Info */}
                          {nft.isRentedByUser && nft.rentalExpiresAt && (
                            <div class="bg-gradient-to-r from-blue-50 to-cyan-100 border border-blue-200 p-3 rounded-lg">
                              <h4 class="text-sm font-semibold text-blue-700 mb-1">{t('myNfts.badges.yourRental')}</h4>
                              <div class="space-y-1 text-xs">
                                <div class="flex justify-between">
                                  <span class="text-blue-600">{t('myNfts.badges.expiresAt')}</span>
                                  <span class="font-semibold text-gray-900">
                                    {new Date(Number(nft.rentalExpiresAt) * 1000).toLocaleString()}
                                  </span>
                                </div>
                                <div class="flex justify-between">
                                  <span class="text-blue-600">{t('myNfts.badges.daysRemaining')}</span>
                                  <span class="font-semibold text-gray-900">
                                    {Math.max(0, Math.ceil((Number(nft.rentalExpiresAt) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Power Grant Expiration Info */}
                          {nft.isPowerGrantedToUser && nft.powerExpiresAt && (
                            <div class="bg-gradient-to-r from-purple-900/30 to-violet-900/30 border border-purple-700/40 p-3 rounded-lg">
                              <h4 class="text-sm font-semibold text-purple-700 mb-1">{t('myNfts.badges.yourPower')}</h4>
                              <div class="space-y-1 text-xs">
                                <div class="flex justify-between">
                                  <span class="text-purple-600">{t('myNfts.badges.expiresAt')}</span>
                                  <span class="font-semibold text-gray-900">
                                    {new Date(Number(nft.powerExpiresAt) * 1000).toLocaleString()}
                                  </span>
                                </div>
                                <div class="flex justify-between">
                                  <span class="text-purple-600">{t('myNfts.badges.daysRemaining')}</span>
                                  <span class="font-semibold text-gray-900">
                                    {Math.max(0, Math.ceil((Number(nft.powerExpiresAt) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

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
                            href={`/${loc.params.locale}/nft/${nft.tokenId}`}
                            class="flex-1 bg-white text-gray-700 text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                          >
                            {t('allNfts.card.viewDetails')}
                          </Link>
                          {nft.saleActive && (
                            <Link
                              href={`/${loc.params.locale}/nft/${nft.tokenId}`}
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
              </>
            )}
          </>
        ) : (
          <div class="flex justify-center items-center py-20">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-[#c1272d] border-t-transparent mx-auto mb-4"></div>
              <p class="text-gray-600">{t('allNfts.loading')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
