// =====================================================
// Hook Qwik + viem para RentalNFT + Sale/Rental/Power markets
// Producción: subida a Storacha vía endpoint SSR (/api/nft/upload)
// - metadata.image opcional (ipfs://<CID> si hay imagen)
// - tokenURI = ipfs://<metadataCid>
// Helpers "readables" para evitar crash si no hay acceso a metadata privada
// =====================================================

import {
  useSignal,
  useTask$,
  useComputed$,
  $,
  isServer,
  type QRL,
  useContext,
} from '@builder.io/qwik';
import {
  createPublicClient,
  http,
  fallback as viemFallback,
  parseUnits,
  formatUnits,
  getAddress,
  parseAbi,
  type Abi,
  encodeFunctionData,
} from 'viem';
import {
  readContract,
  writeContract,
  simulateContract,
  waitForTransactionReceipt,
} from 'viem/actions';

import {
  useWallet,
  BASE_NETWORK,
  getPublicClient as getCachedPublicClient,
  getWalletClient,
} from './useWallet';

import { parseContractError } from '~/utils/blockchain';
import { DemoModeContext } from '~/contexts/demo';
import { MarketplaceConfigContext } from '~/contexts/config';
import { signManagedTransaction } from '~/server/auth-actions';

import {
  RentalNFTAbi,
  SaleMarketAbi,
  RentalMarketAbi,
  PowerMarketAbi,


} from '../../contracts/abi/index';
import { erc20Abi } from './ERC20abi';
import {
  getDemoNft,
  getUserDemoNfts,
  mintDemoNft,
  getAllDemoNfts,
  setDemoNftVisibility,
  getDemoSaleListing,
  listDemoNftForSale,
  cancelDemoSale,
  buyDemoNft,
  getDemoRentalListing,
  listDemoNftForRental,
  getDemoRentalOffers,
  createDemoRentalOffer,
  getDemoPowerListing,
  listDemoNftForPower,
  getDemoPowerOffers,
  createDemoPowerOffer,
  getActiveDemoRentalIds,
  getActiveDemoPowerIds
} from '~/server/demo-actions';

// ================================
// TIPOS
// ================================
export interface MarketplaceContracts {
  nft: { address: string } | null;
  sale: { address: string } | null;
  rental: { address: string } | null;
  power: { address: string } | null;
  paymentToken: { address: string } | null;
  isConnected: boolean;
  chainId: number | null;
  address: string | null;
  error: string | null;
  actions?: MarketplaceActions;
}

// Tipos auxiliares para deployErc20
export type DeployErc20Params = {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  recipient: string;
};

export type DeployErc20Result = {
  txHash?: string;
  address?: string;
  contract?: any;
  wait?: () => Promise<any>;
};

export interface MarketplaceActions {
  // Conexión
  connect: QRL<() => Promise<void>>;
  disconnect: QRL<() => void>;

  // NFT (read)
  getNFTOwner: QRL<(tokenId: string) => Promise<string>>;
  getNFTExists: QRL<(tokenId: string) => Promise<boolean>>;
  getNFTTokenURI: QRL<(tokenId: string) => Promise<string>>;
  getPrivateTokenURI: QRL<(tokenId: string) => Promise<string>>;
  getUserNFTs: QRL<(userAddress: string) => Promise<string[]>>;
  getUnlistedNFTs: QRL<(userAddress: string) => Promise<string[]>>;
  getAllTokenIds: QRL<() => Promise<string[]>>;
  getTotalSupply: QRL<() => Promise<string>>;
  hasAccessToNFT: QRL<(tokenId: string, user: string) => Promise<boolean>>;
  isMetadataPublic: QRL<(tokenId: string) => Promise<boolean>>;
  isApprovedForAll: QRL<(owner: string, operator: string) => Promise<boolean>>;
  getApproved: QRL<(tokenId: string) => Promise<string>>;
  balanceOf: QRL<(owner: string) => Promise<string>>;
  getAccessCheckers: QRL<() => Promise<string[]>>;

  // NFT (write)
  mint: QRL<(privateURI: string, isPublic?: boolean) => Promise<{ hash: string; tokenId: string; wait: () => Promise<any> }>>;
  mintWithIPFS: QRL<(
    metadata: Record<string, any>,
    imageFile?: File | Blob | null
  ) => Promise<{ hash: string; tokenId: string; wait: () => Promise<any> }>>;
  burn: QRL<(tokenId: string) => Promise<string>>;
  setPrivateTokenURI: QRL<(tokenId: string, uri: string) => Promise<string>>;
  setMetadataVisibility: QRL<(tokenId: string, isPublic: boolean) => Promise<string>>;
  approveNFT: QRL<(to: string, tokenId: string) => Promise<string>>;
  transferNFT: QRL<(from: string, to: string, tokenId: string) => Promise<string>>;
  setApprovalForAll: QRL<(operator: string, approved: boolean) => Promise<string>>;

  // Helper
  ensureAllowance: QRL<(owner: string, spender: string, neededHuman: string) => Promise<void>>;

  // SALE MARKET
  getSaleListing: QRL<(tokenId: string) => Promise<{ seller: string; price: string; isActive: boolean } | null>>;
  getActiveSaleIds: QRL<() => Promise<string[]>>;
  getUserSaleListed: QRL<(userAddress: string) => Promise<string[]>>;
  listForSale: QRL<(tokenId: string, price: string) => Promise<string>>;
  cancelSale: QRL<(tokenId: string) => Promise<string>>;
  buyNFT: QRL<(tokenId: string) => Promise<string>>;

  // RENTAL MARKET
  getRentalListing: QRL<(tokenId: string) => Promise<{
    owner: string; basePrice: string; duration: number; isActive: boolean;
  } | null>>;
  getActiveRenters: QRL<(tokenId: string) => Promise<string[]>>;
  getUserRentalListed: QRL<(userAddress: string) => Promise<string[]>>;
  getRentalOffers: QRL<(tokenId: string) => Promise<Array<{
    renter: string; percentage: number; offerTime: string; amountPaid: string; amountPaidWei: string; accepted: boolean;
  }>>>;
  getActiveRental: QRL<(tokenId: string, renter: string) => Promise<{
    expiresAt: string; active: boolean; nextDue: string; graceEnd: string; graceSeconds: number;
    missed: number; pricePerPeriod: string; endRequestedByOwner: boolean; endRequestedByRenter: boolean; percentage: number;
  }>>;
  getRentalAllocatedPct: QRL<(tokenId: string) => Promise<number>>;
  getActiveRentalTokenIds: QRL<() => Promise<string[]>>;
  hasRentalAccess: QRL<(tokenId: string, user: string) => Promise<boolean>>;
  listForRental: QRL<(tokenId: string, basePrice: string, duration: number) => Promise<string>>;
  cancelRentalListing: QRL<(tokenId: string) => Promise<string>>;
  createRentalOffer: QRL<(tokenId: string, percentage: number) => Promise<string>>;
  withdrawRentalOffer: QRL<(tokenId: string, offerIdx: number) => Promise<string>>;
  withdrawRentalOfferTx: QRL<(tokenId: string, uiOfferIdx: number, renterAddress?: string, hintPercentage?: number) => Promise<{ hash: `0x${string}`; wait: () => Promise<any> }>>;
  acceptRentalOffer: QRL<(tokenId: string, offerIndex: number) => Promise<string>>;
  endRental: QRL<(tokenId: string) => Promise<string>>;
  renterRequestEnd: QRL<(tokenId: string) => Promise<string>>;
  ownerRequestEnd: QRL<(tokenId: string, renter: string) => Promise<string>>;
  processRental: QRL<(tokenId: string, renter: string) => Promise<string>>;
  processMany: QRL<(tokenIds: string[], renters: string[]) => Promise<string>>;

  // POWER MARKET
  getPowerListing: QRL<(tokenId: string) => Promise<{
    owner: string; basePrice: string; duration: number; isActive: boolean; payUpfront: boolean;
  } | null>>;
  getPowerGrant: QRL<(tokenId: string, user: string) => Promise<{ expiresAt: string; percentage: number; active: boolean } | null>>;
  getActivePowerRenters: QRL<(tokenId: string) => Promise<string[]>>;
  getUserPowerListed: QRL<(userAddress: string) => Promise<string[]>>;
  getPowerOffers: QRL<(tokenId: string) => Promise<Array<{
    renter: string; percentage: number; offerTime: string; amountPaid: string; amountPaidWei: string; accepted: boolean;
  }>>>;
  hasActivePower: QRL<(tokenId: string, user: string) => Promise<boolean>>;
  canUsePower: QRL<(tokenId: string, user: string) => Promise<boolean>>;
  getActivePowerTokenIds: QRL<() => Promise<string[]>>;
  getPowerAllocatedPct: QRL<(tokenId: string) => Promise<number>>;
  hasPowerAccess: QRL<(tokenId: string, user: string) => Promise<boolean>>;
  listForPower: QRL<(tokenId: string, basePrice: string, duration: number, payUpfront: boolean) => Promise<string>>;
  cancelPowerListing: QRL<(tokenId: string) => Promise<string>>;
  createPowerOffer: QRL<(tokenId: string, percentage: number) => Promise<string>>;
  withdrawPowerOffer: QRL<(tokenId: string, offerIdx: number) => Promise<string>>;
  withdrawPowerOfferTx: QRL<(tokenId: string, uiOfferIdx: number, renterAddress?: string, hintPercentage?: number) => Promise<{ hash: `0x${string}`; wait: () => Promise<any> }>>;
  acceptPowerOffer: QRL<(tokenId: string, offerIndex: number) => Promise<string>>;

  // TOKEN
  getTokenBalance: QRL<(owner: string) => Promise<string>>;
  getTokenAllowance: QRL<(owner: string, spender: string) => Promise<string>>;
  approveToken: QRL<(spender: string, amount: string) => Promise<string>>;
  getTokenName: QRL<() => Promise<string>>;
  getTokenSymbol: QRL<() => Promise<string>>;
  getTokenDecimals: QRL<() => Promise<number>>;

  // ERC20 deploy helper (used by UI `new-erc20` route)
  deployErc20: QRL<(params: DeployErc20Params) => Promise<DeployErc20Result>>;

  // IPFS / URLs helpers
  getTokenURIHttp: QRL<(tokenId: string) => Promise<string>>;
  getPrivateTokenURIHttp: QRL<(tokenId: string) => Promise<string>>;
  fetchTokenJson: QRL<(tokenId: string) => Promise<any | null>>;
  fetchPrivateJson: QRL<(tokenId: string) => Promise<any | null>>;

  // Helpers “readables”
  getReadableTokenURI: QRL<(tokenId: string) => Promise<string>>;
  fetchReadableJson: QRL<(tokenId: string) => Promise<any | null>>;
}

// ================================
// HELPERS de módulo
// ================================
const ZERO = '0x0000000000000000000000000000000000000000';
const safeLower = (s?: string) => String(s || '').toLowerCase();
const toWei = (val: number) => BigInt(Math.floor(val * 1e18));
const demoMeta = (id: string) => ({
  name: `Demo Property ${id}`,
  description: 'Simulated NFT for demo mode',
  image: '',
  attributes: [
    { trait_type: 'Location', value: 'Demo City' },
    { trait_type: 'Type', value: 'Property' },
  ],
});

// ================================
// HELPERS: direcciones & transport
// ================================
const safeAddressOrEmpty = (addr: string | undefined) => {
  if (!addr) return '';
  try { return getAddress(addr); } catch { return ''; }
};

const safeBigInt = (v: any): bigint => {
  if (v === null || v === undefined || v === '' || v === 'PENDING') return 0n;
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
};

const getContractAddresses = (config?: any) => {
  const addresses = {
    nft: safeAddressOrEmpty(config?.nftAddress || import.meta.env.PUBLIC_NFT_ADDRESS),
    sale: safeAddressOrEmpty(config?.saleMarketAddress || import.meta.env.PUBLIC_SALE_MARKET_ADDRESS),
    rental: safeAddressOrEmpty(config?.rentalMarketAddress || import.meta.env.PUBLIC_RENTAL_MARKET_ADDRESS),
    power: safeAddressOrEmpty(config?.powerMarketAddress || import.meta.env.PUBLIC_POWER_MARKET_ADDRESS),
    paymentToken: safeAddressOrEmpty(config?.paymentTokenAddress || import.meta.env.PUBLIC_KNRT_TOKEN_ADDRESS),
  };
  return addresses;
};

// viem transport con fallback
const makeTransport = (config?: any) => {
  const primary = config?.rpcUrl || import.meta.env.PUBLIC_RPC_URL;
  const fallbackUrl = config?.fallbackRpcUrl || import.meta.env.PUBLIC_FALLBACK_RPC_URL;
  const transports = [
    ...(primary ? [http(primary)] : []),
    ...(fallbackUrl ? [http(fallbackUrl)] : []),
    ...(BASE_NETWORK?.rpcUrls?.default?.http?.length
      ? [http(BASE_NETWORK.rpcUrls.default.http[0])]
      : []),
  ];
  return transports.length > 1 ? viemFallback(transports as any) : transports[0]!;
};

// ================================
// ABIs por nombre
// ================================
const ABI_MAP = {
  nft: RentalNFTAbi,
  sale: SaleMarketAbi,
  rental: RentalMarketAbi,
  power: PowerMarketAbi,
  paymentToken: erc20Abi,
} as const;

type ContractName = keyof typeof ABI_MAP;

const normalizeAbi = (abiLike: any): Abi => {
  if (Array.isArray(abiLike) && abiLike.length && typeof abiLike[0] === 'string') {
    return parseAbi(abiLike as readonly string[]);
  }
  return abiLike as Abi;
};

// ================================
// IPFS helpers (gateway)
// ================================
const STORACHA_GATEWAY_HOST =
  import.meta.env.PUBLIC_STORACHA_GATEWAY_HOST || 'storacha.link';

const ipfsToHttp = (uri: string, host = STORACHA_GATEWAY_HOST) => {
  if (!uri) return '';
  if (!uri.startsWith('ipfs://')) return uri;
  const without = uri.slice('ipfs://'.length);
  const [cid, ...rest] = without.split('/');
  if (!cid) return '';
  const path = rest.join('/');
  return path ? `https://${cid}.ipfs.${host}/${path}` : `https://${cid}.ipfs.${host}`;
};

// ================================
// HOOK PRINCIPAL
// ================================
// Minimal demo dataset
// Minimal demo dataset (deprecated, using DB exclusively)
// const demoIds = ['DEMO-1001', 'DEMO-1002', 'DEMO-1003'];

// Demo helpers (Module Scope for Qwik Serialization)
const getDemoStore = () => {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('knrt_demo_market_v1') || '{}');
  } catch { return {}; }
};

const saveDemoStore = (data: any) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('knrt_demo_market_v1', JSON.stringify(data));
  }
};

export const useMarketplaceContracts = () => {
  const demoMode = useContext(DemoModeContext);
  const runtimeConfig = useContext(MarketplaceConfigContext);
  const demoEnabled = demoMode.enabled.value;

  const { wallet, connectWallet, openWalletModal } = useWallet();

  const contracts = useSignal<MarketplaceContracts>({
    nft: null,
    sale: null,
    rental: null,
    power: null,
    paymentToken: null,
    isConnected: false,
    chainId: null,
    address: null,
    error: null,
  });

  const isLoading = useSignal(false);
  const tokenDecimals = useSignal<number>(18);

  const ensurePublicClient = $(async () =>
    getCachedPublicClient() ??
    createPublicClient({
      chain: BASE_NETWORK,
      transport: makeTransport(runtimeConfig),
    })
  );



  const demoActions: MarketplaceActions = {
    connect: $(async () => { }),
    disconnect: $(() => { }),

    // NFT (read)
    // NFT (read)
    getNFTOwner: $(async (tokenId: string) => {
      const nft = await getDemoNft(tokenId);
      return nft?.ownerId || '0xDEMO_USER';
    }),
    getNFTExists: $(async () => true),
    getNFTTokenURI: $(async (tokenId: string) => {
      console.log('[HOOK] getNFTTokenURI called for:', tokenId);
      // Static match?
      if (['DEMO-11', 'DEMO-22', 'DEMO-33'].includes(tokenId)) return '';
      const nft = await getDemoNft(tokenId);
      console.log('[HOOK] getDemoNft response:', nft ? 'Object found' : 'Null');
      return nft?.metadataUrl || '';
    }),
    getPrivateTokenURI: $(async () => ''),
    getUserNFTs: $(async (userAddress: string) => {
      const user = userAddress || contracts.value.address || '0xDEMO_USER';
      const dbIds = await getUserDemoNfts(user);
      return dbIds;
    }),
    getUnlistedNFTs: $(async (userAddress: string) => {
      const all = await getAllDemoNfts();
      return all.filter(n => n.ownerId?.toLowerCase() === userAddress.toLowerCase() && n.isListed === 0).map(n => n.id);
    }),
    getAllTokenIds: $(async () => {
      const nfts = await getAllDemoNfts();
      return nfts.map(n => n.id);
    }),
    getTotalSupply: $(async () => '3'),
    hasAccessToNFT: $(async (tokenId: string, user: string) => {
      // In demo mode, check if user is owner OR if NFT is public
      const nft = await getDemoNft(tokenId);
      if (!nft) return false;
      const isOwner = nft.ownerId?.toLowerCase() === user?.toLowerCase();
      const isPublicNft = nft.isPublic === 1;
      return isOwner || isPublicNft;
    }),
    isMetadataPublic: $(async (tokenId: string) => {
      const nft = await getDemoNft(tokenId);
      return nft?.isPublic === 1;
    }),
    isApprovedForAll: $(async () => true),
    getApproved: $(async () => ZERO),
    balanceOf: $(async () => '3'),
    getAccessCheckers: $(async () => []),

    // NFT (write)
    mint: $(async (tokenURI: string, isPublic?: boolean) => {
      const tokenId = `DEMO-${Date.now()}`;
      const owner = contracts.value.address || '0xDEMO_USER';
      await mintDemoNft(tokenId, owner, { name: 'Minted NFT', description: 'Direct mint', image: '' });
      return { hash: '0x-demo-tx', tokenId, wait: async () => ({ status: 1 }) };
    }),
    mintWithIPFS: $(async (metadata: Record<string, any>, imageFile?: File | Blob | null) => {
      const tokenId = `DEMO-${Date.now()}`;
      const owner = contracts.value.address || '0xDEMO_USER';
      const isPublic = metadata.isPublic !== false; // Default to public unless explicitly set to false
      await mintDemoNft(tokenId, owner, metadata, isPublic);
      return { hash: '0x-demo-tx', tokenId, wait: async () => ({ status: 1 }) };
    }),
    burn: $(async () => '0x-demo-tx'),
    setPrivateTokenURI: $(async () => '0x-demo-tx'),
    setMetadataVisibility: $(async (tokenId: string, isPublic: boolean) => {
      await setDemoNftVisibility(tokenId, isPublic);
      return '0x-demo-tx';
    }),
    approveNFT: $(async () => '0x-demo-tx'),
    transferNFT: $(async () => '0x-demo-tx'),
    setApprovalForAll: $(async () => '0x-demo-tx'),

    // Helper
    ensureAllowance: $(async () => { }),

    // SALE MARKET
    getSaleListing: $(async (tokenId: string) => {
      console.log('[Demo] getSaleListing:', tokenId);
      const res = await getDemoSaleListing(tokenId);
      console.log('[Demo] getSaleListing result:', res);
      return res;
    }),
    getActiveSaleIds: $(async () => {
      const nfts = await getAllDemoNfts();
      return nfts.filter(n => n.isListed === 1 && n.listingType === 'sale').map(n => n.id);
    }),
    getUserSaleListed: $(async (userAddress: string) => {
      const nfts = await getAllDemoNfts();
      return nfts.filter(n => n.ownerId?.toLowerCase() === userAddress.toLowerCase() && n.isListed === 1).map(n => n.id);
    }),
    listForSale: $(async (tokenId: string, price: string) => {
      const seller = contracts.value.address || '0xDEMO_USER';
      console.log('[Demo] listForSale:', { tokenId, price, seller });
      await listDemoNftForSale(tokenId, seller, price);
      return '0x-demo-tx';
    }),
    cancelSale: $(async (tokenId: string) => {
      await cancelDemoSale(tokenId);
      return '0x-demo-tx';
    }),
    buyNFT: $(async (tokenId: string) => {
      const buyer = contracts.value.address || '0xDEMO_USER';
      await buyDemoNft(tokenId, buyer);
      return '0x-demo-tx';
    }),

    // RENTAL MARKET
    getRentalListing: $(async (tokenId: string) => {
      return await getDemoRentalListing(tokenId);
    }),
    getActiveRenters: $(async () => []),
    getUserRentalListed: $(async (userAddress?: string) => {
      if (!userAddress) return [];
      const all = await getAllDemoNfts();
      return all.filter(n => n.ownerId?.toLowerCase() === userAddress.toLowerCase() && n.isListed === 1 && n.listingType === 'rental').map(n => n.id);
    }),
    getRentalOffers: $(async (tokenId: string) => {
      return await getDemoRentalOffers(tokenId);
    }),
    getActiveRental: $(async (tokenId: string, renter: string) => {
      const offers = await getDemoRentalOffers(tokenId);
      const accepted = offers.find(o => o.accepted && o.renter.toLowerCase() === renter.toLowerCase());
      if (accepted) {
        return {
          expiresAt: (Math.floor(Date.now() / 1000) + 86400 * 30).toString(), // mock 30 days
          active: true,
          nextDue: '0',
          graceEnd: '0',
          graceSeconds: 0,
          missed: 0,
          pricePerPeriod: '1',
          endRequestedByOwner: false,
          endRequestedByRenter: false,
          percentage: accepted.percentage
        };
      }
      return {
        expiresAt: '0', active: false, nextDue: '0', graceEnd: '0', graceSeconds: 0,
        missed: 0, pricePerPeriod: '0', endRequestedByOwner: false, endRequestedByRenter: false, percentage: 0
      };
    }),
    getRentalAllocatedPct: $(async () => 0),
    getActiveRentalTokenIds: $(async () => {
      return await getActiveDemoRentalIds();
    }),
    hasRentalAccess: $(async (tokenId: string, user: string) => {
      const offers = await getDemoRentalOffers(tokenId);
      return offers.some(o => o.accepted && o.renter.toLowerCase() === user.toLowerCase());
    }),
    listForRental: $(async (tokenId: string, basePrice: string, duration: number) => {
      const owner = contracts.value.address || '0xDEMO_USER';
      await listDemoNftForRental(tokenId, owner, basePrice, duration);
      return '0x-demo-tx';
    }),
    cancelRentalListing: $(async (tokenId: string) => {
      await cancelDemoSale(tokenId);
      return '0x-demo-tx';
    }),
    createRentalOffer: $(async (tokenId: string, percentage: number) => {
      const listing = await getDemoRentalListing(tokenId);
      const basePrice = Number(listing?.basePrice || '0');
      const amountHuman = (basePrice * percentage) / 100;
      const offerer = contracts.value.address || '0xDEMO_USER';
      await createDemoRentalOffer(tokenId, offerer, percentage, amountHuman.toString());
      return '0x-demo-tx';
    }),
    withdrawRentalOffer: $(async () => '0x-demo-tx'),
    withdrawRentalOfferTx: $(async () => ({ hash: '0x-demo-tx', wait: async () => ({ status: 1 }) })),
    acceptRentalOffer: $(async () => '0x-demo-tx'),
    endRental: $(async () => '0x-demo-tx'),
    renterRequestEnd: $(async () => '0x-demo-tx'),
    ownerRequestEnd: $(async () => '0x-demo-tx'),
    processRental: $(async () => '0x-demo-tx'),
    processMany: $(async () => '0x-demo-tx'),

    // POWER MARKET
    getPowerListing: $(async (tokenId: string) => {
      return await getDemoPowerListing(tokenId);
    }),
    getPowerGrant: $(async (tokenId: string, user: string) => {
      const offers = await getDemoPowerOffers(tokenId);
      const accepted = offers.find(o => o.accepted && o.renter.toLowerCase() === user.toLowerCase());
      if (accepted) {
        return {
          expiresAt: (Math.floor(Date.now() / 1000) + 86400 * 30).toString(),
          percentage: accepted.percentage,
          active: true
        };
      }
      return null;
    }),
    getActivePowerRenters: $(async (_tokenId: string) => []),
    getUserPowerListed: $(async (userAddress?: string) => {
      if (!userAddress) return [];
      const all = await getAllDemoNfts();
      return all.filter(n => n.ownerId?.toLowerCase() === userAddress.toLowerCase() && n.isListed === 1 && n.listingType === 'power').map(n => n.id);
    }),
    getPowerOffers: $(async (tokenId: string) => {
      return await getDemoPowerOffers(tokenId);
    }),
    hasActivePower: $(async (_tokenId: string, _user: string) => false),
    canUsePower: $(async () => true),
    getActivePowerTokenIds: $(async () => {
      return await getActiveDemoPowerIds();
    }),
    getPowerAllocatedPct: $(async () => 0),
    hasPowerAccess: $(async () => true),
    listForPower: $(async (tokenId: string, basePrice: string, duration: number, payUpfront: boolean) => {
      const owner = contracts.value.address || '0xDEMO_USER';
      await listDemoNftForPower(tokenId, owner, basePrice, duration, payUpfront);
      return '0x-demo-tx';
    }),
    cancelPowerListing: $(async (tokenId: string) => {
      await cancelDemoSale(tokenId);
      return '0x-demo-tx';
    }),
    createPowerOffer: $(async (tokenId: string, percentage: number) => {
      const listing = await getDemoPowerListing(tokenId);
      const basePrice = Number(listing?.basePrice || '0');
      const amountHuman = (basePrice * percentage) / 100;
      const offerer = contracts.value.address || '0xDEMO_USER';
      await createDemoPowerOffer(tokenId, offerer, percentage, amountHuman.toString());
      return '0x-demo-tx';
    }),
    withdrawPowerOffer: $(async () => '0x-demo-tx'),
    withdrawPowerOfferTx: $(async () => ({ hash: '0x-demo-tx', wait: async () => ({ status: 1 }) })),
    acceptPowerOffer: $(async () => '0x-demo-tx'),

    // TOKEN
    getTokenBalance: $(async () => toWei(1000).toString()),
    getTokenAllowance: $(async () => toWei(1000).toString()),
    approveToken: $(async () => '0x-demo-tx'),
    getTokenName: $(async () => 'Demo Token'),
    getTokenSymbol: $(async () => 'DEMO'),
    getTokenDecimals: $(async () => 18),

    // ERC20 deploy helper
    deployErc20: $(async () => ({ address: '0xDEMO_TOKEN', txHash: '0x-demo-tx', wait: async () => ({ status: 1 }) })),

    // IPFS / URLs helpers
    getTokenURIHttp: $(async () => ''),
    getPrivateTokenURIHttp: $(async () => ''),
    fetchTokenJson: $(async (tokenId: string) => {
      const nft = await getDemoNft(tokenId);
      if (!nft || !nft.metadataUrl) return null;

      try {
        if (nft.metadataUrl.startsWith('data:application/json;base64,')) {
          const base64 = nft.metadataUrl.split(',')[1];
          const jsonStr = typeof atob === 'function'
            ? atob(base64)
            : (typeof Buffer !== 'undefined' ? Buffer.from(base64, 'base64').toString('utf-8') : '');
          return jsonStr ? JSON.parse(jsonStr) : null;
        }
        return null;
      } catch (e) {
        console.warn('Error parsing demo token JSON', e);
        return null;
      }
    }),
    fetchPrivateJson: $(async (tokenId: string) => {
      // Re-use same logic for demo (it's all "public" effectively)
      const nft = await getDemoNft(tokenId);
      if (!nft || !nft.metadataUrl) return null;
      try {
        if (nft.metadataUrl.startsWith('data:application/json;base64,')) {
          const base64 = nft.metadataUrl.split(',')[1];
          const jsonStr = typeof atob === 'function' ? atob(base64) : (typeof Buffer !== 'undefined' ? Buffer.from(base64, 'base64').toString('utf-8') : '');
          return jsonStr ? JSON.parse(jsonStr) : null;
        }
      } catch { }
      return null;
    }),
    getReadableTokenURI: $(async () => ''),
    fetchReadableJson: $(async (tokenId: string) => demoMeta(tokenId)),
  };


  // ========== READ/WRITE CORE ==========
  const readContractCall = $(
    async (
      contractName: ContractName,
      functionName: string,
      args: any[] = [],
      opts?: { quiet?: boolean }
    ) => {
      const ref = contracts.value[contractName] as { address: string } | null;
      if (!ref) throw new Error(`Contrato ${String(contractName)} no inicializado`);
      const abi = normalizeAbi((ABI_MAP as any)[contractName]);
      const publicClient = await ensurePublicClient();

      try {
        const result = await readContract(publicClient, {
          address: ref.address as `0x${string}`,
          abi,
          functionName,
          args,
          ...(contracts.value.address ? { account: contracts.value.address as `0x${string}` } : {}),
        });
        return result;
      } catch (error) {
        if (!opts?.quiet) {
          console.error(`[readContractCall] ${String(contractName)}.${functionName} ->`, error);
        }
        throw new Error(parseContractError(error));
      }
    }
  );

  const writeContractCall = $(
    async (
      contractName: ContractName,
      functionName: string,
      args: any[] = [],
      value?: bigint,
    ) => {
      const ref = contracts.value[contractName] as { address: string } | null;
      if (!ref || !contracts.value.address) {
        throw new Error(`Contrato ${String(contractName)} no inicializado o wallet desconectado`);
      }
      if (isServer) throw new Error('La escritura de contratos solo puede ejecutarse en el cliente');

      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Wallet client no disponible');

      const abiRaw = (ABI_MAP as any)[contractName];
      const abi = normalizeAbi(abiRaw);
      const publicClient = await ensurePublicClient();

      try {
        const { request } = await simulateContract(publicClient, {
          address: ref.address as `0x${string}`,
          abi,
          functionName,
          args,
          value,
          account: contracts.value.address as `0x${string}`,
        });

        const hash = await writeContract(walletClient, { ...request });
        await waitForTransactionReceipt(publicClient, { hash, confirmations: 1 });
        return hash;
      } catch (error) {
        console.error(`[writeContractCall] ${String(contractName)}.${functionName} ->`, error);
        throw new Error(parseContractError(error));
      }
    }
  );

  const writeContractWithReceipt = $(
    async (
      contractName: ContractName,
      functionName: string,
      args: any[] = [],
      gasLimit?: bigint,
      value?: bigint,
    ) => {
      const ref = contracts.value[contractName] as { address: string } | null;
      if (!ref || !contracts.value.address) {
        throw new Error(`Contrato ${String(contractName)} no inicializado o wallet desconectado`);
      }
      if (isServer) throw new Error('La escritura de contratos solo puede ejecutarse en el cliente');

      const abiRaw = (ABI_MAP as any)[contractName];
      const abi = normalizeAbi(abiRaw);
      const publicClient = await ensurePublicClient();

      // CHECK FOR MANAGED WALLET
      let isManaged = false;
      if (typeof localStorage !== 'undefined') {
        const managed = localStorage.getItem('knrt_managed_wallet');
        if (managed && contracts.value.address && managed.toLowerCase() === contracts.value.address.toLowerCase()) {
          isManaged = true;
        }
      }

      if (isManaged) {
        console.log('[useMarketplaceContracts] Executing managed transaction:', contractName, functionName);

        try {
          // Encode transaction data
          const data = encodeFunctionData({
            abi,
            functionName,
            args
          });

          // Execute server-side signing
          const result = await signManagedTransaction({
            walletAddress: contracts.value.address!,
            to: ref.address,
            data,
            value: value ? value.toString() : undefined,
            gas: gasLimit ? gasLimit.toString() : undefined
          });

          if (!result.success || !result.txHash) {
            throw new Error(result.message || 'Failed to sign managed transaction');
          }

          const hash = result.txHash as `0x${string}`;

          return {
            hash,
            wait: async () => {
              const receipt = await waitForTransactionReceipt(publicClient, {
                hash,
                confirmations: 1
              });
              return { ...receipt, status: receipt.status === 'success' ? 1 : 0 };
            },
          };

        } catch (error: any) {
          console.error(`[writeContractWithReceipt] Managed ${String(contractName)}.${functionName} error:`, error);
          throw new Error(parseContractError(error));
        }
      }

      // STANDARD WALLET FLOW (MetaMask)
      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Wallet client no disponible');

      try {
        const { request, result } = await simulateContract(publicClient, {
          address: ref.address as `0x${string}`,
          abi,
          functionName,
          args,
          value,
          account: contracts.value.address as `0x${string}`,
        });

        const hash = await writeContract(walletClient, {
          ...request,
          ...(gasLimit ? { gas: gasLimit } : {}),
        });

        return {
          hash,
          wait: async () => {
            const receipt = await waitForTransactionReceipt(publicClient, { hash, confirmations: 1 });
            return { ...receipt, status: receipt.status === 'success' ? 1 : 0, result };
          },
        };
      } catch (error) {
        console.error(`[writeContractWithReceipt] ${String(contractName)}.${functionName} ->`, error);
        throw new Error(parseContractError(error));
      }
    }
  );

  // =====================================================
  // HELPERS
  // =====================================================
  const getSaleListingSafe = $(async (tokenId: string) => {
    try {
      const r = (await readContractCall('sale', 'getSaleListing', [BigInt(tokenId)])) as any;
      const seller = Array.isArray(r) ? r[0] : r?.seller;
      const priceRaw = Array.isArray(r) ? (r[1] as bigint) : (r?.price as bigint);
      const isActive = Array.isArray(r) ? r[2] : r?.isActive;
      return {
        seller: seller ?? ZERO,
        price: formatUnits(priceRaw ?? 0n, tokenDecimals.value),
        isActive: Boolean(isActive),
      };
    } catch {
      return { seller: ZERO, price: '0', isActive: false };
    }
  });

  const ensureAllowance = $(async (owner: string, spender: string, neededHuman: string) => {
    const allowance = (await readContractCall('paymentToken', 'allowance', [
      getAddress(owner) as `0x${string}`,
      getAddress(spender) as `0x${string}`,
    ])) as bigint;

    const needed = parseUnits(neededHuman || '0', tokenDecimals.value);
    if (allowance < needed) {
      await writeContractCall('paymentToken', 'approve', [
        getAddress(spender) as `0x${string}`,
        needed,
      ]);
    }
  });

  const ensureAllowanceBigint = $(async (owner: string, spender: string, needed: bigint) => {
    const allowance = (await readContractCall('paymentToken', 'allowance', [
      getAddress(owner) as `0x${string}`,
      getAddress(spender) as `0x${string}`,
    ])) as bigint;

    if (allowance < needed) {
      await writeContractCall('paymentToken', 'approve', [
        getAddress(spender) as `0x${string}`,
        needed,
      ]);
    }
  });

  // ---------- Búsqueda de índice real ----------
  const findRentalOfferIndex = $(async (tokenId: string, renter: string, hintPercentage?: number) => {
    const arr = (await readContractCall('rental', 'getRentalOffers', [BigInt(tokenId)])) as any[];
    let fallbackIdx: number | null = null;

    for (let i = 0; i < arr.length; i++) {
      const o = arr[i];
      const _renter = Array.isArray(o) ? o[0] : o?.renter;
      const _pct = Number(Array.isArray(o) ? o[1] : o?.percentage ?? 0);
      const _amountPaid: bigint = Array.isArray(o) ? (o[3] as bigint) : (o?.amountPaid as bigint);
      const _accepted = Boolean(Array.isArray(o) ? o[4] : o?.accepted);

      const sameRenter = safeLower(_renter) === safeLower(renter);
      const open = (!_accepted) && !!_amountPaid && _amountPaid > 0n;

      if (sameRenter && open) {
        if (typeof hintPercentage === 'number' && hintPercentage > 0) {
          if (_pct === hintPercentage) return i;
          if (fallbackIdx === null) fallbackIdx = i;
        } else {
          return i;
        }
      }
    }
    return fallbackIdx;
  });

  const findPowerOfferIndex = $(async (tokenId: string, renter: string, hintPercentage?: number) => {
    const arr = (await readContractCall('power', 'getPowerOffers', [BigInt(tokenId)])) as any[];
    let fallbackIdx: number | null = null;

    for (let i = 0; i < arr.length; i++) {
      const o = arr[i];
      const _renter = Array.isArray(o) ? o[0] : o?.renter;
      const _pct = Number(Array.isArray(o) ? o[1] : o?.percentage ?? 0);
      const _amountPaid: bigint = Array.isArray(o) ? (o[3] as bigint) : (o?.amountPaid as bigint);
      const _accepted = Boolean(Array.isArray(o) ? o[4] : o?.accepted);

      const sameRenter = safeLower(_renter) === safeLower(renter);
      const open = (!_accepted) && !!_amountPaid && _amountPaid > 0n;

      if (sameRenter && open) {
        if (typeof hintPercentage === 'number' && hintPercentage > 0) {
          if (_pct === hintPercentage) return i;
          if (fallbackIdx === null) fallbackIdx = i;
        } else {
          return i;
        }
      }
    }
    return fallbackIdx;
  });

  // ---------- NFT (WRITE) ----------
  const mintFn = $(async (privateURI: string, isPublic = true) => {
    if (!privateURI || privateURI.length < 10) throw new Error('Private URI inválido');

    // Use writeContractWithReceipt to support both MetaMask and Managed Wallets
    const tx = await writeContractWithReceipt('nft', 'mint', [privateURI, isPublic]);

    return {
      hash: tx.hash,
      tokenId: 'PENDING', // Will be resolved in wait()
      wait: async () => {
        const receipt = await tx.wait();

        // Determine tokenId
        // 1. Try from simulation result (MetaMask only)
        let tokenId = (receipt as any).result?.toString();

        // 2. If managed wallet (no simulation result), extract from Transfer event logs
        if (!tokenId && receipt.logs) {
          // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
          // Topic 0: Transfer signature hash
          const transferSig = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

          for (const log of receipt.logs) {
            // Check signature and 'from' address (should be 0x0 for mints)
            if (log.topics[0] === transferSig &&
              log.topics[1] &&
              BigInt(log.topics[1]) === 0n) {

              // TokenId is the 3rd indexed parameter (topics[3])
              if (log.topics[3]) {
                tokenId = BigInt(log.topics[3]).toString();
                break;
              }
            }
          }
        }

        return {
          ...receipt,
          status: receipt.status,
          tokenId: tokenId || '0',
        };
      },
    };
  });

  const mintWithIPFS = $(async function mintWithIPFS(
    metadata: Record<string, any>,
    imageFile?: File | Blob | null
  ): Promise<{ hash: string; tokenId: string; wait: () => Promise<any> }> {
    const safeMetadata = JSON.parse(JSON.stringify(metadata ?? {}));

    const payload: any = { metadata: safeMetadata };

    if (imageFile) {
      const asFile =
        imageFile instanceof File
          ? imageFile
          : new File([imageFile], 'image.bin', {
            type: (imageFile as any).type || 'application/octet-stream',
          });

      const buf = await asFile.arrayBuffer();
      const bytes = new Uint8Array(buf);
      payload.image = {
        bytes: Array.from(bytes),
        name: asFile.name || 'image.bin',
        type: asFile.type || 'application/octet-stream',
      };
    }

    const r = await fetch('/api/nft/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      throw new Error(`Fallo al subir a IPFS: ${msg || r.statusText}`);
    }
    const data = (await r.json()) as { ok?: boolean; tokenURI?: string; error?: string };
    if (!data.ok || !data.tokenURI) throw new Error(data.error || 'No se obtuvo tokenURI al subir a Storacha');

    return await mintFn(data.tokenURI);
  });

  // ===== Helpers "readables" =====
  const getReadableTokenURIImpl = $(async (tokenId: string) => {
    const user = (contracts.value.address || '') as `0x${string}` | '';

    if (user) {
      try {
        const uri = (await readContractCall('nft', 'getPrivateTokenURIFor', [BigInt(tokenId), user], { quiet: true })) as string;
        if (uri && uri.length) return ipfsToHttp(uri);
      } catch { /* ignore */ }
      try {
        const uri = (await readContractCall('nft', 'tokenURIFor', [BigInt(tokenId), user], { quiet: true })) as string;
        if (uri && uri.length) return ipfsToHttp(uri);
      } catch { /* ignore */ }
    }

    try {
      const uri = (await readContractCall('nft', 'getPrivateTokenURI', [safeBigInt(tokenId)], { quiet: true })) as string;
      if (uri && uri.length) return ipfsToHttp(uri);
    } catch { /* ignore */ }

    try {
      const uri = (await readContractCall('nft', 'tokenURI', [safeBigInt(tokenId)], { quiet: true })) as string;
      if (uri && uri.length) return ipfsToHttp(uri);
    } catch { /* ignore */ }

    return '';
  });

  const fetchReadableJsonImpl = $(async (tokenId: string) => {
    const url = await getReadableTokenURIImpl(tokenId);
    if (!url) return null;
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  });

  // ================================
  // ACCIONES
  // ================================
  const connect = $(async () => {
    openWalletModal();
  });

  const disconnect = $(() => {
    contracts.value = {
      nft: null,
      sale: null,
      rental: null,
      power: null,
      paymentToken: null,
      isConnected: false,
      chainId: null,
      address: null,
      error: null,
    };
  });

  const realActions: MarketplaceActions = {
    // Conexión
    connect,
    disconnect,

    // ---------- SALE MARKET ----------
    getActiveSaleIds: $(async () => {
      const ids = await readContractCall('sale', 'getActiveSaleIds', []);
      return (ids as Array<bigint | string>).map((id) => id.toString());
    }),

    getSaleListing: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        return await getDemoSaleListing(tokenId);
      }
      try {
        const l = (await readContractCall('sale', 'saleListings', [safeBigInt(tokenId)])) as any;
        const seller = Array.isArray(l) ? l[0] : l?.seller;
        const price = Array.isArray(l) ? (l[1] as bigint) : l?.price;
        const isActive = Array.isArray(l) ? l[2] : l?.isActive;
        if (!seller || !price) return null;
        return {
          seller,
          price: formatUnits(price, tokenDecimals.value),
          isActive: Boolean(isActive),
        };
      } catch {
        return null;
      }
    }),

    getUserSaleListed: $(async (userAddress: string) => {
      const result = (await readContractCall('sale', 'getUserSaleListed', [
        getAddress(userAddress) as `0x${string}`,
      ])) as bigint[];
      return result.map((id) => id.toString());
    }),

    listForSale: $(async (tokenId: string, price: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        // Fallback to demo logic if accidentally called with demo ID
        console.warn('Redirecting to demo listForSale');
        const seller = contracts.value.address || '0xDEMO_USER';
        await listDemoNftForSale(tokenId, seller, price);
        return '0x-demo-redirection';
      }

      const saleAddr = contracts.value.sale?.address;
      const owner = contracts.value.address;
      if (!saleAddr || !owner) throw new Error('Sale contract o wallet no disponible');

      const approvedAll = (await readContractCall('nft', 'isApprovedForAll', [
        getAddress(owner) as `0x${string}`,
        getAddress(saleAddr) as `0x${string}`,
      ])) as boolean;

      if (!approvedAll) {
        const currentApproved = (await readContractCall('nft', 'getApproved', [
          safeBigInt(tokenId),
        ])) as string;

        if (safeLower(currentApproved) !== safeLower(saleAddr)) {
          await writeContractCall('nft', 'approve', [
            getAddress(saleAddr) as `0x${string}`,
            safeBigInt(tokenId),
          ]);
        }
      }

      return await writeContractCall('sale', 'listNFTForSale', [
        safeBigInt(tokenId),
        parseUnits(price, tokenDecimals.value),
      ]);
    }),

    cancelSale: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        console.warn('Redirecting to demo cancelSale');
        await cancelDemoSale(tokenId);
        return '0x-demo-redirection';
      }
      return await writeContractCall('sale', 'cancelNFTSale', [safeBigInt(tokenId)]);
    }),

    buyNFT: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        console.warn('Redirecting to demo buyNFT');
        const buyer = contracts.value.address || '0xDEMO_USER';
        await buyDemoNft(tokenId, buyer);
        return '0x-demo-redirection';
      }

      const buyer = contracts.value.address;
      const saleAddr = contracts.value.sale?.address;
      if (!buyer || !saleAddr) throw new Error('Wallet o Sale contract no disponible');

      const listing = await getSaleListingSafe(tokenId);
      if (!listing || !listing.isActive) {
        throw new Error('Este NFT no está listado para venta.');
      }

      await ensureAllowance(getAddress(buyer), getAddress(saleAddr), listing.price);
      return await writeContractCall('sale', 'buyNFT', [safeBigInt(tokenId)]);
    }),

    // ---------- NFT (READ) ----------
    getNFTOwner: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        const nft = await getDemoNft(tokenId);
        return nft?.ownerId || '0xDEMO_USER';
      }
      return (await readContractCall('nft', 'ownerOf', [safeBigInt(tokenId)])) as string;
    }),

    getNFTExists: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return true;
      try {
        await readContractCall('nft', 'ownerOf', [safeBigInt(tokenId)]);
        return true;
      } catch {
        return false;
      }
    }),

    // endurecidos: devuelven '' si no hay acceso
    getNFTTokenURI: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        const nft = await getDemoNft(tokenId);
        return nft?.metadataUrl || '';
      }
      try {
        const uri = (await readContractCall('nft', 'tokenURI', [safeBigInt(tokenId)], { quiet: true })) as string;
        return uri ?? '';
      } catch { return ''; }
    }),

    getPrivateTokenURI: $(async (tokenId: string) => {
      try {
        const uri = (await readContractCall('nft', 'getPrivateTokenURI', [safeBigInt(tokenId)], { quiet: true })) as string;
        return uri ?? '';
      } catch { return ''; }
    }),

    getUserNFTs: $(async (userAddress: string) => {
      const result = (await readContractCall('nft', 'getUserOwnedNow', [
        getAddress(userAddress) as `0x${string}`,
      ]).catch(() => [])) as bigint[];
      const realIds = result.map((id) => id.toString());

      // Merge with Demo NFTs
      const demoIds = await getUserDemoNfts(userAddress);
      return [...realIds, ...demoIds];
    }),

    getUnlistedNFTs: $(async (userAddress: string) => {
      const result = (await readContractCall('nft', 'getUserUnlistedOwned', [
        getAddress(userAddress) as `0x${string}`,
      ])) as bigint[];
      return result.map((id) => id.toString());
    }),

    getAllTokenIds: $(async () => {
      const result = (await readContractCall('nft', 'getAllTokenIds', [])) as bigint[];
      return result.map((id) => id.toString());
    }),

    getTotalSupply: $(async () => {
      const result = (await readContractCall('nft', 'totalSupply', [])) as bigint;
      return result.toString();
    }),

    // ---------- NFT (WRITE) ----------
    mint: mintFn,
    mintWithIPFS,

    burn: $(async (tokenId: string) => {
      return await writeContractCall('nft', 'burn', [safeBigInt(tokenId)]);
    }),

    setPrivateTokenURI: $(async (tokenId: string, uri: string) => {
      return await writeContractCall('nft', 'setPrivateTokenURI', [safeBigInt(tokenId), uri]);
    }),

    setMetadataVisibility: $(async (tokenId: string, isPublic: boolean) => {
      return await writeContractCall('nft', 'setMetadataVisibility', [safeBigInt(tokenId), isPublic]);
    }),

    approveNFT: $(async (to: string, tokenId: string) => {
      return await writeContractCall('nft', 'approve', [getAddress(to) as `0x${string}`, safeBigInt(tokenId)]);
    }),

    transferNFT: $(async (from: string, to: string, tokenId: string) => {
      return await writeContractCall('nft', 'transferFrom', [
        getAddress(from) as `0x${string}`,
        getAddress(to) as `0x${string}`,
        safeBigInt(tokenId),
      ]);
    }),

    // FIX: silenciar y devolver false si la view revierte
    hasAccessToNFT: $(async (tokenId: string, user: string) => {
      try {
        return (await readContractCall(
          'nft',
          'hasAccess',
          [safeBigInt(tokenId), getAddress(user) as `0x${string}`],
          { quiet: true }
        )) as boolean;
      } catch {
        return false;
      }
    }),

    isMetadataPublic: $(async (tokenId: string) => {
      try {
        return (await readContractCall(
          'nft',
          'isMetadataPublic',
          [safeBigInt(tokenId)],
          { quiet: true }
        )) as boolean;
      } catch {
        return true; // Default to public if error
      }
    }),

    setApprovalForAll: $(async (operator: string, approved: boolean) => {
      return await writeContractCall('nft', 'setApprovalForAll', [getAddress(operator) as `0x${string}`, approved]);
    }),

    isApprovedForAll: $(async (owner: string, operator: string) => {
      return (await readContractCall('nft', 'isApprovedForAll', [
        getAddress(owner) as `0x${string}`,
        getAddress(operator) as `0x${string}`,
      ])) as boolean;
    }),

    getApproved: $(async (tokenId: string) => {
      return (await readContractCall('nft', 'getApproved', [safeBigInt(tokenId)])) as string;
    }),

    balanceOf: $(async (owner: string) => {
      const result = (await readContractCall('nft', 'balanceOf', [
        getAddress(owner) as `0x${string}`,
      ])) as bigint;
      return result.toString();
    }),

    getAccessCheckers: $(async () => {
      return (await readContractCall('nft', 'getAccessCheckers', [])) as string[];
    }),

    // ---------- Helper ----------
    ensureAllowance,

    // ---------- RENTAL MARKET ----------
    getRentalListing: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        const s = getDemoStore();
        const item = s[`rental_${tokenId}`];
        console.log('[realActions] getRentalListing DEMO:', tokenId, item);
        if (item && item.isActive) return item;
        return null;
      }
      try {
        const r = (await readContractCall('rental', 'rentalListings', [safeBigInt(tokenId)])) as any;
        const owner = Array.isArray(r) ? r[0] : r?.owner;
        const basePriceRaw = Array.isArray(r) ? (r[1] as bigint) : (r?.basePrice as bigint);
        const durationRaw = Array.isArray(r) ? r[2] : r?.duration;
        const isActive = Array.isArray(r) ? r[3] : r?.isActive;
        if (!owner && !basePriceRaw && typeof isActive === 'undefined') return null;
        return {
          owner: owner ?? ZERO,
          basePrice: formatUnits(basePriceRaw ?? 0n, tokenDecimals.value),
          duration: Number(durationRaw ?? 0),
          isActive: Boolean(isActive),
        };
      } catch {
        return null;
      }
    }),

    getActiveRenters: $(async (tokenId: string) => {
      return (await readContractCall('rental', 'getActiveRenters', [safeBigInt(tokenId)])) as string[];
    }),

    getUserRentalListed: $(async (userAddress: string) => {
      const result = (await readContractCall('rental', 'getUserRentalListed', [
        getAddress(userAddress) as `0x${string}`,
      ])) as bigint[];
      return result.map((id) => id.toString());
    }),

    getRentalOffers: $(async (tokenId: string) => {
      const arr = (await readContractCall('rental', 'getRentalOffers', [safeBigInt(tokenId)])) as any[];
      return arr.map((o: any) => {
        const renter = Array.isArray(o) ? o[0] : o?.renter;
        const pct = Array.isArray(o) ? o[1] : o?.percentage;
        const offerTime = Array.isArray(o) ? o[2] : o?.offerTime;
        const amountPaidRaw = Array.isArray(o) ? (o[3] as bigint) : (o?.amountPaid as bigint);
        const accepted = Array.isArray(o) ? o[4] : o?.accepted;
        return {
          renter,
          percentage: Number(pct ?? 0),
          offerTime: String(offerTime ?? '0'),
          amountPaid: formatUnits(amountPaidRaw ?? 0n, tokenDecimals.value),
          amountPaidWei: String(amountPaidRaw ?? 0n),
          accepted: Boolean(accepted),
        };
      });
    }),

    getActiveRental: $(async (tokenId: string, renter: string) => {
      const r = (await readContractCall('rental', 'activeRentals', [
        safeBigInt(tokenId),
        getAddress(renter) as `0x${string}`,
      ])) as any;

      const v = Array.isArray(r)
        ? {
          expiresAt: r[0] as bigint,
          active: r[1] as boolean,
          nextDue: r[2] as bigint,
          graceEnd: r[3] as bigint,
          graceSeconds: r[4] as number,
          missed: r[5] as number,
          pricePerPeriod: r[6] as bigint,
          endRequestedByOwner: r[7] as boolean,
          endRequestedByRenter: r[8] as boolean,
          percentage: r[9] as number,
        }
        : r;

      return {
        expiresAt: (v.expiresAt ?? 0n).toString(),
        active: Boolean(v.active),
        nextDue: (v.nextDue ?? 0n).toString(),
        graceEnd: (v.graceEnd ?? 0n).toString(),
        graceSeconds: Number(v.graceSeconds ?? 0),
        missed: Number(v.missed ?? 0),
        pricePerPeriod: formatUnits((v.pricePerPeriod as bigint) ?? 0n, tokenDecimals.value),
        endRequestedByOwner: Boolean(v.endRequestedByOwner),
        endRequestedByRenter: Boolean(v.endRequestedByRenter),
        percentage: Number(v.percentage ?? 0),
      };
    }),

    getRentalAllocatedPct: $(async (tokenId: string) => {
      return Number(await readContractCall('rental', 'getRentalAllocatedPct', [safeBigInt(tokenId)]));
    }),

    getActiveRentalTokenIds: $(async () => {
      const result = (await readContractCall('rental', 'getActiveRentalTokenIds', [])) as bigint[];
      return result.map((id) => id.toString());
    }),

    // FIX: silenciar y devolver false si revierte
    hasRentalAccess: $(async (tokenId: string, user: string) => {
      try {
        return (await readContractCall(
          'rental',
          'hasAccess',
          [safeBigInt(tokenId), getAddress(user) as `0x${string}`],
          { quiet: true }
        )) as boolean;
      } catch {
        return false;
      }
    }),

    listForRental: $(async (tokenId: string, basePrice: string, duration: number) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        console.log('[realActions] listForRental DEMO:', tokenId, basePrice, duration);
        const s = getDemoStore();
        s[`rental_${tokenId}`] = {
          owner: contracts.value.address || '0xDEMO_USER',
          basePrice: basePrice,
          duration,
          isActive: true
        };
        saveDemoStore(s);
        console.log('[realActions] listForRental Saved:', `rental_${tokenId}`, s[`rental_${tokenId}`]);
        return '0x-demo-rental-tx';
      }
      return await writeContractCall('rental', 'listNFTForRental', [
        safeBigInt(tokenId),
        parseUnits(basePrice, tokenDecimals.value),
        BigInt(duration),
      ]);
    }),

    cancelRentalListing: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        console.log('[realActions] cancelRentalListing DEMO:', tokenId);
        const s = getDemoStore();
        if (s[`rental_${tokenId}`]) {
          s[`rental_${tokenId}`].isActive = false;
          saveDemoStore(s);
          console.log('[realActions] cancelRentalListing Done:', s[`rental_${tokenId}`]);
        }
        return '0x-demo-cancel-rental-tx';
      }
      return await writeContractCall('rental', 'cancelRentalListing', [safeBigInt(tokenId)]);
    }),

    createRentalOffer: $(async (tokenId: string, percentage: number) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return '0x-demo-mixed-mode-ignored';

      if (percentage <= 0 || percentage > 100) {
        throw new Error('Porcentaje inválido (1..100).');
      }

      const r = (await readContractCall('rental', 'rentalListings', [safeBigInt(tokenId)])) as any;
      const owner = Array.isArray(r) ? r[0] : r?.owner;
      const basePriceRaw: bigint = Array.isArray(r) ? (r[1] as bigint) : (r?.basePrice as bigint);
      const durationRaw = Array.isArray(r) ? r[2] : r?.duration;
      const isActive = Array.isArray(r) ? r[3] : r?.isActive;

      if (!owner || !basePriceRaw || !durationRaw || !isActive) {
        throw new Error('The NFT is not listed for rent.');
      }

      const escrowRaw = (basePriceRaw * BigInt(Math.trunc(percentage))) / 100n;

      const rentalAddr = contracts.value.rental?.address;
      const userAddr = contracts.value.address;
      if (!rentalAddr || !userAddr) throw new Error('Wallet o Rental contract no disponible.');

      await ensureAllowanceBigint(getAddress(userAddr), getAddress(rentalAddr), escrowRaw);

      return await writeContractCall('rental', 'createRentalOffer', [
        safeBigInt(tokenId),
        Number(percentage),
      ]);
    }),

    withdrawRentalOffer: $(async (tokenId: string, offerIdx: number) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return '0x-demo-mixed-mode-ignored';
      return await writeContractCall('rental', 'withdrawRentalOffer', [safeBigInt(tokenId), BigInt(offerIdx)]);
    }),

    withdrawRentalOfferTx: $(async (tokenId: string, uiOfferIdx: number, renterAddress?: string, hintPercentage?: number) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return { hash: '0x-demo-mixed-mode-ignored', wait: async () => ({ status: 1 }) };
      const user = contracts.value.address;
      const renter = renterAddress || user;
      if (!renter) throw new Error('Wallet no conectada.');

      const arr = (await readContractCall('rental', 'getRentalOffers', [safeBigInt(tokenId)])) as any[];
      const o = arr[uiOfferIdx];

      const getFields = (x: any) => {
        const renter = Array.isArray(x) ? x[0] : x?.renter;
        const pct = Number(Array.isArray(x) ? x[1] : x?.percentage ?? 0);
        const offerTime = Array.isArray(x) ? x[2] : x?.offerTime;
        const amountPaid: bigint = Array.isArray(x) ? (x[3] as bigint) : (x?.amountPaid as bigint);
        const accepted = Boolean(Array.isArray(x) ? x[4] : x?.accepted);
        return { renter, pct, offerTime, amountPaid, accepted };
      };

      let realIdx = uiOfferIdx;
      let reason: string | null = null;

      if (!o) {
        reason = 'The offer no longer exists at that index.';
      } else {
        const f = getFields(o);
        const sameRenter = safeLower(f.renter) === safeLower(renter);
        const open = (!f.accepted) && !!f.amountPaid && f.amountPaid > 0n;

        if (!sameRenter || !open) {
          reason = `The UI index does not match your open offer.`;
        }
      }

      if (reason) {
        const found = await findRentalOfferIndex(tokenId, renter!, hintPercentage);
        if (typeof found !== 'number') {
          throw new Error('No open offer found to withdraw (possibly already accepted or refunded).');
        }
        realIdx = found;
      }

      const tx = await writeContractWithReceipt('rental', 'withdrawRentalOffer', [safeBigInt(tokenId), BigInt(realIdx)]);
      return tx;
    }),

    acceptRentalOffer: $(async (tokenId: string, offerIndex: number) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return '0x-demo-mixed-mode-ignored';
      return await writeContractCall('rental', 'acceptRentalOffer', [safeBigInt(tokenId), BigInt(offerIndex)]);
    }),

    endRental: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return '0x-demo-mixed-mode-ignored';
      return await writeContractCall('rental', 'endRental', [safeBigInt(tokenId)]);
    }),

    renterRequestEnd: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return '0x-demo-mixed-mode-ignored';
      return await writeContractCall('rental', 'renterRequestEnd', [safeBigInt(tokenId)]);
    }),

    ownerRequestEnd: $(async (tokenId: string, renter: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return '0x-demo-mixed-mode-ignored';
      return await writeContractCall('rental', 'ownerRequestEnd', [
        safeBigInt(tokenId),
        getAddress(renter) as `0x${string}`,
      ]);
    }),

    processRental: $(async (tokenId: string, renter: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return '0x-demo-mixed-mode-ignored';
      return await writeContractCall('rental', 'processRental', [
        safeBigInt(tokenId),
        getAddress(renter) as `0x${string}`,
      ]);
    }),

    processMany: $(async (tokenIds: string[], renters: string[]) => {
      // Filter out demo IDs if they sneak in
      const validIndices = tokenIds.map((id, i) => (!id.startsWith('DEMO-')) ? i : -1).filter(i => i !== -1);
      if (validIndices.length === 0) return '0x-demo-mixed-mode-ignored';

      const tokenIdsBigInt = validIndices.map(i => BigInt(tokenIds[i]));
      const rentersAddresses = validIndices.map(i => getAddress(renters[i]) as `0x${string}`);
      return await writeContractCall('rental', 'processMany', [tokenIdsBigInt, rentersAddresses]);
    }),

    // ---------- POWER MARKET ----------
    getPowerListing: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        const s = getDemoStore();
        const item = s[`power_${tokenId}`];
        console.log('[realActions] getPowerListing DEMO:', tokenId, item);
        if (item && item.isActive) return item;
        return null;
      }
      try {
        const r = (await readContractCall('power', 'powerListings', [safeBigInt(tokenId)])) as any;
        const owner = Array.isArray(r) ? r[0] : r?.owner;
        const basePriceRaw = Array.isArray(r) ? (r[1] as bigint) : r?.basePrice;
        const durationRaw = Array.isArray(r) ? r[2] : r?.minDuration;
        const isActive = Array.isArray(r) ? r[3] : r?.isActive;
        const payUpfront = Array.isArray(r) ? r[4] : r?.payUpfront;

        if (!owner && !basePriceRaw) return null;

        return {
          owner: owner ?? ZERO,
          basePrice: formatUnits(basePriceRaw ?? 0n, tokenDecimals.value),
          duration: Number(durationRaw ?? 0),
          isActive: Boolean(isActive),
          payUpfront: Boolean(payUpfront),
        };
      } catch {
        return null;
      }
    }),

    getPowerGrant: $(async (tokenId: string, user: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return null;
      try {
        const r = (await readContractCall('power', 'powerGrants', [
          safeBigInt(tokenId),
          getAddress(user) as `0x${string}`,
        ])) as any;
        const expiresAt = Array.isArray(r) ? r[0] : r?.expiresAt;
        const percentage = Array.isArray(r) ? r[1] : r?.percentage;
        const active = Array.isArray(r) ? r[2] : r?.active;
        return {
          expiresAt: String(expiresAt ?? '0'),
          percentage: Number(percentage ?? 0),
          active: Boolean(active),
        };
      } catch {
        return null;
      }
    }),

    getActivePowerRenters: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return [];
      return (await readContractCall('power', 'getActivePowerRenters', [safeBigInt(tokenId)])) as string[];
    }),

    getUserPowerListed: $(async (userAddress: string) => {
      const result = (await readContractCall('power', 'getUserPowerListed', [
        getAddress(userAddress) as `0x${string}`,
      ])) as bigint[];
      return result.map((id) => id.toString());
    }),

    getPowerOffers: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return [];
      const arr = (await readContractCall('power', 'getPowerOffers', [safeBigInt(tokenId)])) as any[];
      return arr.map((o: any) => {
        const renter = Array.isArray(o) ? o[0] : o?.renter;
        const pct = Array.isArray(o) ? o[1] : o?.percentage;
        const offerTime = Array.isArray(o) ? o[2] : o?.offerTime;
        const amountPaidRaw = Array.isArray(o) ? (o[3] as bigint) : (o?.amountPaid as bigint);
        const accepted = Array.isArray(o) ? o[4] : o?.accepted;
        return {
          renter,
          percentage: Number(pct ?? 0),
          offerTime: String(offerTime ?? '0'),
          amountPaid: formatUnits(amountPaidRaw ?? 0n, tokenDecimals.value),
          amountPaidWei: String(amountPaidRaw ?? 0n),
          accepted: Boolean(accepted),
        };
      });
    }),

    hasActivePower: $(async (tokenId: string, user: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return false;
      return (await readContractCall('power', 'hasAccess', [
        safeBigInt(tokenId),
        getAddress(user) as `0x${string}`,
      ])) as boolean;
    }),

    canUsePower: $(async (tokenId: string, user: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return true;
      try {
        return (await readContractCall('power', 'canUsePower', [
          safeBigInt(tokenId),
          getAddress(user) as `0x${string}`,
        ])) as boolean;
      } catch {
        return (await readContractCall('power', 'hasAccess', [
          safeBigInt(tokenId),
          getAddress(user) as `0x${string}`,
        ])) as boolean;
      }
    }),

    getActivePowerTokenIds: $(async () => {
      const result = (await readContractCall('power', 'getActivePowerTokenIds', [])) as bigint[];
      return result.map((id) => id.toString());
    }),

    getPowerAllocatedPct: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return 0;
      return Number(await readContractCall('power', 'getPowerAllocatedPct', [safeBigInt(tokenId)]));
    }),

    // FIX: silenciar y devolver false si revierte
    hasPowerAccess: $(async (tokenId: string, user: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return true;
      try {
        return (await readContractCall(
          'power',
          'hasAccess',
          [safeBigInt(tokenId), getAddress(user) as `0x${string}`],
          { quiet: true }
        )) as boolean;
      } catch {
        return false;
      }
    }),

    listForPower: $(async (tokenId: string, basePrice: string, duration: number, payUpfront: boolean) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        console.log('[realActions] listForPower DEMO:', tokenId, basePrice, duration, payUpfront);
        const s = getDemoStore();
        s[`power_${tokenId}`] = {
          owner: contracts.value.address || '0xDEMO_USER',
          basePrice: basePrice,
          duration,
          isActive: true,
          payUpfront
        };
        saveDemoStore(s);
        console.log('[realActions] listForPower Saved:', `power_${tokenId}`, s[`power_${tokenId}`]);
        return '0x-demo-power-tx';
      }
      return await writeContractCall('power', 'listNFTForPower', [
        safeBigInt(tokenId),
        parseUnits(basePrice, tokenDecimals.value),
        BigInt(duration),
        Boolean(payUpfront),
      ]);
    }),

    cancelPowerListing: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        console.log('[realActions] cancelPowerListing DEMO:', tokenId);
        const s = getDemoStore();
        if (s[`power_${tokenId}`]) {
          s[`power_${tokenId}`].isActive = false;
          saveDemoStore(s);
          console.log('[realActions] cancelPowerListing Done:', s[`power_${tokenId}`]);
        }
        return '0x-demo-cancel-power-tx';
      }
      return await writeContractCall('power', 'cancelPowerListing', [safeBigInt(tokenId)]);
    }),

    createPowerOffer: $(async (tokenId: string, percentage: number) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) return '0x-demo-mixed-mode-ignored';
      if (percentage <= 0 || percentage > 100) throw new Error('Porcentaje inválido (1..100).');

      const listing = (await readContractCall('power', 'powerListings', [safeBigInt(tokenId)])) as any;
      const owner = Array.isArray(listing) ? listing[0] : listing?.owner;
      const basePriceRaw: bigint = Array.isArray(listing) ? (listing[1] as bigint) : (listing?.basePrice as bigint);
      const durationRaw = Array.isArray(listing) ? listing[2] : listing?.duration;
      const isActive = Array.isArray(listing) ? listing[3] : listing?.isActive;

      if (!owner || !basePriceRaw || !durationRaw || !isActive) {
        throw new Error('The NFT is not listed for power.');
      }

      const escrowRaw = (basePriceRaw * BigInt(Math.trunc(percentage))) / 100n;
      if (escrowRaw <= 0n) throw new Error('El monto de escrow calculado es 0. Revisa basePrice y porcentaje.');

      const powerAddr = contracts.value.power?.address;
      const userAddr = contracts.value.address;
      if (!powerAddr || !userAddr) throw new Error('Wallet o Power contract no disponible.');

      const userBal: bigint = (await readContractCall('paymentToken', 'balanceOf', [
        getAddress(userAddr) as `0x${string}`,
      ])) as bigint;
      if (userBal < escrowRaw) throw new Error('Saldo insuficiente del token de pago para cubrir el escrow.');

      try {
        await ensureAllowanceBigint(getAddress(userAddr), getAddress(powerAddr), escrowRaw);
      } catch (e: any) {
        const msg = String(e?.message || e || '');
        if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied')) {
          throw new Error('Firma de “approve” cancelada por el usuario.');
        }
        throw e;
      }

      try {
        return await writeContractCall('power', 'createPowerOffer', [
          safeBigInt(tokenId),
          Number(percentage),
        ]);
      } catch (e: any) {
        const msg = String(e?.message || e || '');
        if (msg.includes('0xe450d38c')) {
          throw new Error(
            'The transaction was reverted by the payment token (possible insufficient allowance/balance). ' +
            'Verifica que aprobaste el contrato PowerMarket y que tienes saldo suficiente.'
          );
        }
        throw e;
      }
    }),

    withdrawPowerOffer: $(async (tokenId: string, offerIdx: number) => {
      return await writeContractCall('power', 'withdrawPowerOffer', [safeBigInt(tokenId), BigInt(offerIdx)]);
    }),

    withdrawPowerOfferTx: $(async (tokenId: string, uiOfferIdx: number, renterAddress?: string, hintPercentage?: number) => {
      const user = contracts.value.address;
      const renter = renterAddress || user;
      if (!renter) throw new Error('Wallet no conectada.');

      const arr = (await readContractCall('power', 'getPowerOffers', [safeBigInt(tokenId)])) as any[];
      const o = arr[uiOfferIdx];

      const getFields = (x: any) => {
        const renter = Array.isArray(x) ? x[0] : x?.renter;
        const pct = Number(Array.isArray(x) ? x[1] : x?.percentage ?? 0);
        let offerTime = Array.isArray(x) ? x[2] : x?.offerTime;
        const amountPaid: bigint = Array.isArray(x) ? (x[3] as bigint) : (x?.amountPaid as bigint);
        const accepted = Boolean(Array.isArray(x) ? x[4] : x?.accepted);
        return { renter, pct, offerTime, amountPaid, accepted };
      };

      let realIdx = uiOfferIdx;
      let reason: string | null = null;

      if (!o) {
        reason = 'The offer no longer exists at that index.';
      } else {
        const f = getFields(o);
        const sameRenter = safeLower(f.renter) === safeLower(renter);
        const open = (!f.accepted) && !!f.amountPaid && f.amountPaid > 0n;

        if (!sameRenter || !open) {
          reason = `The UI index does not match your open offer.`;
        }
      }

      if (reason) {
        const found = await findPowerOfferIndex(tokenId, renter!, hintPercentage);
        if (typeof found !== 'number') {
          throw new Error('No open offer found to withdraw (possibly already accepted or refunded).');
        }
        realIdx = found;
      }

      const tx = await writeContractWithReceipt('power', 'withdrawPowerOffer', [safeBigInt(tokenId), BigInt(realIdx)]);
      return tx;
    }),

    acceptPowerOffer: $(async (tokenId: string, offerIndex: number) => {
      return await writeContractCall('power', 'acceptPowerOffer', [safeBigInt(tokenId), BigInt(offerIndex)]);
    }),

    // ---------- TOKEN ----------
    getTokenBalance: $(async (owner: string) => {
      const result = (await readContractCall('paymentToken', 'balanceOf', [
        getAddress(owner) as `0x${string}`,
      ])) as bigint;
      return formatUnits(result, tokenDecimals.value);
    }),

    getTokenAllowance: $(async (owner: string, spender: string) => {
      const result = (await readContractCall('paymentToken', 'allowance', [
        getAddress(owner) as `0x${string}`,
        getAddress(spender) as `0x${string}`,
      ])) as bigint;
      return formatUnits(result, tokenDecimals.value);
    }),

    approveToken: $(async (spender: string, amount: string) => {
      return await writeContractCall('paymentToken', 'approve', [
        getAddress(spender) as `0x${string}`,
        parseUnits(amount, tokenDecimals.value),
      ]);
    }),

    getTokenName: $(async () => {
      return (await readContractCall('paymentToken', 'name', [])) as string;
    }),

    getTokenSymbol: $(async () => {
      return (await readContractCall('paymentToken', 'symbol', [])) as string;
    }),

    getTokenDecimals: $(async () => {
      try {
        const dec = (await readContractCall('paymentToken', 'decimals', [])) as number;
        tokenDecimals.value = dec ?? 18;
      } catch {
        // ignore
      }
      return tokenDecimals.value;
    }),

    // Deploy ERC20 helper used by the `new-erc20` route
    deployErc20: $(async (params: { name: string; symbol: string; decimals: number; initialSupply: bigint; recipient: string }) => {
      if (isServer) throw new Error('Deployment must run in the browser');

      const { name, symbol, decimals, initialSupply, recipient } = params;
      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Wallet client no disponible');

      const publicClient = await ensurePublicClient();

      // Factory address: prefer explicit env var, then contracts value
      const factoryEnv = safeAddressOrEmpty((import.meta as any).env?.PUBLIC_ERC20_FACTORY_ADDRESS);
      const factoryFromContracts = (contracts.value as any)?.erc20Factory || (contracts.value as any)?.addresses?.erc20Factory;
      const factoryAddr = factoryEnv || (factoryFromContracts ? safeAddressOrEmpty(factoryFromContracts) : '');

      // ABI variants (match UI attempts)
      const FACTORY_ABI_A = [
        {
          inputs: [
            { internalType: 'string', name: 'name', type: 'string' },
            { internalType: 'string', name: 'symbol', type: 'string' },
            { internalType: 'uint8', name: 'decimals', type: 'uint8' },
            { internalType: 'uint256', name: 'initialSupply', type: 'uint256' },
            { internalType: 'address', name: 'recipient', type: 'address' },
          ],
          name: 'deployERC20',
          outputs: [{ internalType: 'address', name: 'token', type: 'address' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
          name: 'isTokenFromFactory',
          outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
          stateMutability: 'view',
          type: 'function',
        },
      ];

      const FACTORY_ABI_B = [
        {
          inputs: [
            { internalType: 'string', name: 'name', type: 'string' },
            { internalType: 'string', name: 'symbol', type: 'string' },
            { internalType: 'address', name: 'recipient', type: 'address' },
            { internalType: 'uint256', name: 'initialSupply', type: 'uint256' },
            { internalType: 'uint8', name: 'decimals', type: 'uint8' },
          ],
          name: 'deployERC20',
          outputs: [{ internalType: 'address', name: 'token', type: 'address' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ];

      // If a factory is available, try calling it (ABI A then B)
      if (factoryAddr) {
        try {
          // try ABI A
          try {
            const { request, result } = await simulateContract(publicClient, {
              address: factoryAddr as `0x${string}`,
              abi: normalizeAbi(FACTORY_ABI_A),
              functionName: 'deployERC20',
              args: [name, symbol, Number(decimals), initialSupply, getAddress(recipient) as `0x${string}`],
              account: contracts.value.address as `0x${string}`,
            });

            const hash = await writeContract(walletClient, { ...request, account: contracts.value.address as `0x${string}` });
            return {
              txHash: hash,
              address: result ? String(result) : undefined,
              wait: async () => {
                const receipt = await waitForTransactionReceipt(publicClient, { hash, confirmations: 1 });
                return { ...receipt, status: receipt.status === 'success' ? 1 : 0, result };
              },
            };
          } catch (eA) {
            // try ABI B
            const { request, result } = await simulateContract(publicClient, {
              address: factoryAddr as `0x${string}`,
              abi: normalizeAbi(FACTORY_ABI_B),
              functionName: 'deployERC20',
              args: [name, symbol, getAddress(recipient) as `0x${string}`, initialSupply, Number(decimals)],
              account: contracts.value.address as `0x${string}`,
            });

            const hash = await writeContract(walletClient, { ...request, account: contracts.value.address as `0x${string}` });
            return {
              txHash: hash,
              address: result ? String(result) : undefined,
              wait: async () => {
                const receipt = await waitForTransactionReceipt(publicClient, { hash, confirmations: 1 });
                return { ...receipt, status: receipt.status === 'success' ? 1 : 0, result };
              },
            };
          }
        } catch (e) {
          console.error('[deployErc20] factory call failed', e);
          // fallthrough to direct deploy if bytecode present
        }
      }

      // Fallback: deploy bytecode directly from env var
      const bytecode = (import.meta as any).env?.PUBLIC_ERC20_BYTECODE || '';
      if (!bytecode) {
        throw new Error('No hay ERC20 factory configurada y no se encontró PUBLIC_ERC20_BYTECODE en el entorno');
      }

      // Use walletClient.deployContract when available
      try {
        const account = contracts.value.address as `0x${string}`;
        const abi = normalizeAbi(erc20Abi);

        // Try to deploy with provided args first. If ABI doesn't declare a constructor
        // viem will throw AbiConstructorNotFoundError — in that case retry without args.
        // @ts-ignore - walletClient type may be flexible
        let txHash: string;
        try {
          txHash = await (walletClient as any).deployContract({
            abi,
            bytecode: bytecode as `0x${string}`,
            account,
            args: [getAddress(recipient) as `0x${string}`],
          });
        } catch (innerErr: any) {
          const msg = String(innerErr?.message || innerErr || '');
          if (msg.includes('constructor') || msg.includes('AbiConstructorNotFoundError')) {
            // retry without args
            txHash = await (walletClient as any).deployContract({
              abi,
              bytecode: bytecode as `0x${string}`,
              account,
            });
          } else {
            throw innerErr;
          }
        }

        // Wait for receipt and try to read contract address
        const receipt = await waitForTransactionReceipt(publicClient, { hash: txHash as `0x${string}`, confirmations: 1 });
        const address = (receipt as any)?.contractAddress || (receipt as any)?.contractAddress || undefined;

        return {
          txHash,
          address,
          wait: async () => {
            const r = await waitForTransactionReceipt(publicClient, { hash: txHash as `0x${string}`, confirmations: 1 });
            const addr = (r as any)?.contractAddress || (r as any)?.contractAddress || undefined;
            return { ...r, status: r.status === 'success' ? 1 : 0, contractAddress: addr };
          },
        };
      } catch (e) {
        console.error('[deployErc20] direct deploy failed', e);
        throw new Error(parseContractError(e));
      }
    }),

    // ---------- IPFS / URLs helpers ----------
    getTokenURIHttp: $(async (tokenId: string) => {
      try {
        const uri = (await readContractCall('nft', 'tokenURI', [safeBigInt(tokenId)], { quiet: true })) as string;
        return ipfsToHttp(uri || '');
      } catch { return ''; }
    }),

    getPrivateTokenURIHttp: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        try {
          const nft = await getDemoNft(tokenId);
          if (!nft || !nft.metadataUrl) return '';
          return nft.metadataUrl;
        } catch (e) {
          console.error('Error fetching Demo Private URI:', e);
          return '';
        }
      }
      try {
        const uri = (await readContractCall('nft', 'getPrivateTokenURI', [safeBigInt(tokenId)], { quiet: true })) as string;
        return ipfsToHttp(uri || '');
      } catch { return ''; }
    }),

    fetchTokenJson: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        try {
          const nft = await getDemoNft(tokenId);
          if (!nft || !nft.metadataUrl) return null;
          // Decode data URI
          const res = await fetch(nft.metadataUrl);
          return await res.json();
        } catch (e) {
          console.error('Error fetching Demo JSON:', e);
          return null;
        }
      }
      try {
        const uri = (await readContractCall('nft', 'tokenURI', [safeBigInt(tokenId)], { quiet: true })) as string;
        const url = ipfsToHttp(uri || '');
        if (!url) return null;
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      } catch { return null; }
    }),

    fetchPrivateJson: $(async (tokenId: string) => {
      if (typeof tokenId === 'string' && tokenId.startsWith('DEMO-')) {
        // Re-use public demo metadata for "private"
        try {
          const nft = await getDemoNft(tokenId);
          if (!nft || !nft.metadataUrl) return null;
          const res = await fetch(nft.metadataUrl);
          return await res.json();
        } catch { return null; }
      }
      try {
        const uri = (await readContractCall('nft', 'getPrivateTokenURI', [BigInt(tokenId)], { quiet: true })) as string;
        const url = ipfsToHttp(uri || '');
        if (!url) return null;
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      } catch { return null; }
    }),

    // ---------- Helpers “readables” ----------
    getReadableTokenURI: getReadableTokenURIImpl,
    fetchReadableJson: fetchReadableJsonImpl,
  };

  const initializeContracts = $(async (params: {
    connected: boolean;
    address: string | null | undefined;
    chainId: number | null | undefined;
    demoEnabled: boolean;
  }) => {
    const { connected, address, chainId, demoEnabled } = params;
    console.log('[useMarketplaceContracts] initializeContracts called with:', params);

    try {
      if (demoEnabled) {
        contracts.value = {
          nft: { address: '0xDEMO_NFT' },
          sale: { address: '0xDEMO_SALE' },
          rental: { address: '0xDEMO_RENTAL' },
          power: { address: '0xDEMO_POWER' },
          paymentToken: { address: '0xDEMO_TOKEN' },
          isConnected: true, // In demo mode, we always want to be "connected" to explore
          chainId: chainId || 8453,
          address: address || '0xDEMO_USER',
          error: null,
          actions: demoActions,
        };
        isLoading.value = false;
        return;
      }

      isLoading.value = true;
      const addresses = getContractAddresses(runtimeConfig);

      const missing = Object.entries(addresses)
        .filter(([_, addr]) => !addr)
        .map(([name]) => name);

      if (missing.length > 0) {
        console.warn('[initializeContracts] Missing addresses:', JSON.stringify(addresses, null, 2));
        // Don't throw — set a user-friendly error and let the app work in demo mode
        contracts.value = {
          ...contracts.value,
          isConnected: connected,
          chainId: chainId ?? null,
          address: address ?? null,
          error: `Contract addresses not configured: ${missing.join(', ')}. Enable Demo Mode to explore the platform.`,
          actions: realActions,
        };
        isLoading.value = false;
        return;
      }

      contracts.value = {
        nft: { address: addresses.nft },
        sale: { address: addresses.sale },
        rental: { address: addresses.rental },
        power: { address: addresses.power },
        paymentToken: { address: addresses.paymentToken },
        isConnected: connected,
        chainId: chainId ?? null,
        address: address ?? null,
        error: null,
        actions: realActions,
      };

      try {
        const pc = await ensurePublicClient();
        const erc20AbiNormalized = normalizeAbi(erc20Abi);
        const dec = (await readContract(pc, {
          address: addresses.paymentToken as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals',
        })) as number;
        tokenDecimals.value = dec ?? 18;
      } catch (e) {
        console.warn('[init] ERC20.decimals() failed; using 18 by default', e);
        tokenDecimals.value = 18;
      }
    } catch (err: any) {
      console.error('[initializeContracts] error:', err);
      contracts.value = { ...contracts.value, error: parseContractError(err) };
    } finally {
      isLoading.value = false;
    }
  });

  useTask$(async ({ track }) => {
    const connected = track(() => wallet.connected);
    const address = track(() => wallet.address);
    const chainId = track(() => wallet.chainId);
    const demoEnabled = track(() => demoMode.enabled.value);
    const config = track(() => JSON.stringify(runtimeConfig));

    console.log('[useMarketplaceContracts] track triggered:', { connected, address, demoEnabled, config });
    await initializeContracts({ connected, address, chainId, demoEnabled });
  });


  // NOTE: `actions` is a snapshot taken at hook-init time.
  // When demo mode toggles, `initializeContracts` updates `contracts.value.actions`.
  // Routes that need reactivity should read `contracts.value.actions` inside their
  // loading functions (e.g. `const act = contracts.value.actions || actions;`).
  const actions: MarketplaceActions = contracts.value.actions || (demoMode.enabled.value ? demoActions : realActions);

  return {
    contracts,
    actions,
    demoActions,
    realActions,
    connect,
    disconnect,
    isLoading,
    isConnected: useComputed$(() => contracts.value.isConnected),
    userAddress: useComputed$(() => contracts.value.address),
    chainId: useComputed$(() => contracts.value.chainId),
    error: useComputed$(() => contracts.value.error),
  };
};

export type UseMarketplaceContracts = ReturnType<typeof useMarketplaceContracts>;



