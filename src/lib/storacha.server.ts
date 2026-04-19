// =====================================================
// Hook Qwik + viem para RentalNFT + Sale/Rental/Power markets
// ProducciÃ³n: subida a Storacha vÃ­a API (sin server$ en el hook)
// - metadata.image opcional (ipfs://<CID> si hay imagen)
// - tokenURI = ipfs://<metadataCid>
// =====================================================

import {
  useSignal,
  useTask$,
  useComputed$,
  $,
  isServer,
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
} from 'viem';
import {
  readContract,
  writeContract,
  simulateContract,
  waitForTransactionReceipt,
} from 'viem/actions';

import {
  useWallet,
  getPublicClient as getCachedPublicClient,
  getWalletClient,
} from '../hooks/useWallet';
import { baseNetworkInfo, resolveChain } from '~/lib/base-network';

import { parseContractError } from '~/utils/blockchain';

import {
  RentalNFTAbi,
  SaleMarketAbi,
  RentalMarketAbi,
  PowerMarketAbi,
  ERC20Abi,
} from '../../contracts/abi/index';

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
}

export interface MarketplaceActions {
  // ConexiÃ³n
  connect: () => Promise<void>;
  disconnect: () => void;

  // NFT (read)
  getNFTOwner: (tokenId: string) => Promise<string>;
  getNFTExists: (tokenId: string) => Promise<boolean>;
  getNFTTokenURI: (tokenId: string) => Promise<string>;
  getPrivateTokenURI: (tokenId: string) => Promise<string>;
  getUserNFTs: (userAddress: string) => Promise<string[]>;
  getUnlistedNFTs: (userAddress: string) => Promise<string[]>;
  getAllTokenIds: () => Promise<string[]>;
  getTotalSupply: () => Promise<string>;
  hasAccessToNFT: (tokenId: string, user: string) => Promise<boolean>;
  isApprovedForAll: (owner: string, operator: string) => Promise<boolean>;
  getApproved: (tokenId: string) => Promise<string>;
  balanceOf: (owner: string) => Promise<string>;
  getAccessCheckers: () => Promise<string[]>;

  // NFT (write)
  mint: (privateURI: string) => Promise<{ hash: string; tokenId: string; wait: () => Promise<any> }>;
  mintWithIPFS: (
    metadata: Record<string, any>,
    imageFile?: File | Blob | null
  ) => Promise<{ hash: string; tokenId: string; wait: () => Promise<any> }>;
  burn: (tokenId: string) => Promise<string>;
  setPrivateTokenURI: (tokenId: string, uri: string) => Promise<string>;
  approveNFT: (to: string, tokenId: string) => Promise<string>;
  transferNFT: (from: string, to: string, tokenId: string) => Promise<string>;
  setApprovalForAll: (operator: string, approved: boolean) => Promise<string>;
  marketSetMode: (tokenId: string, newMode: number) => Promise<string>;

  // Helper
  ensureAllowance: (owner: string, spender: string, neededHuman: string) => Promise<void>;

  // SALE MARKET
  getSaleListing: (tokenId: string) => Promise<{ seller: string; price: string; isActive: boolean } | null>;
  getActiveSaleIds: () => Promise<string[]>;
  getUserSaleListed: (userAddress: string) => Promise<string[]>;
  listForSale: (tokenId: string, price: string) => Promise<string>;
  cancelSale: (tokenId: string) => Promise<string>;
  buyNFT: (tokenId: string) => Promise<string>;

  // RENTAL MARKET
  getRentalListing: (tokenId: string) => Promise<{
    owner: string;
    basePrice: string;
    duration: number;
    isActive: boolean;
  } | null>;
  getActiveRenters: (tokenId: string) => Promise<string[]>;
  getUserRentalListed: (userAddress: string) => Promise<string[]>;
  getRentalOffers: (tokenId: string) => Promise<Array<{
    renter: string;
    percentage: number;
    offerTime: string;
    amountPaid: string;
    accepted: boolean;
  }>>;
  getActiveRental: (tokenId: string, renter: string) => Promise<{
    expiresAt: string;
    active: boolean;
    nextDue: string;
    graceEnd: string;
    graceSeconds: number;
    missed: number;
    pricePerPeriod: string;
    endRequestedByOwner: boolean;
    endRequestedByRenter: boolean;
    percentage: number;
  }>;
  getRentalAllocatedPct: (tokenId: string) => Promise<number>;
  getActiveRentalTokenIds: () => Promise<string[]>;
  hasRentalAccess: (tokenId: string, user: string) => Promise<boolean>;
  listForRental: (tokenId: string, basePrice: string, duration: number) => Promise<string>;
  cancelRentalListing: (tokenId: string) => Promise<string>;
  createRentalOffer: (tokenId: string, percentage: number) => Promise<string>;
  withdrawRentalOffer: (tokenId: string, offerIdx: number) => Promise<string>;
  acceptRentalOffer: (tokenId: string, offerIndex: number) => Promise<string>;
  endRental: (tokenId: string) => Promise<string>;
  renterRequestEnd: (tokenId: string) => Promise<string>;
  ownerRequestEnd: (tokenId: string, renter: string) => Promise<string>;
  processRental: (tokenId: string, renter: string) => Promise<string>;
  processMany: (tokenIds: string[], renters: string[]) => Promise<string>;

  // POWER MARKET
  getPowerListing: (tokenId: string) => Promise<{
    owner: string;
    basePrice: string;
    duration: number;
    isActive: boolean;
    payUpfront: boolean;
  } | null>;
  getPowerGrant: (tokenId: string, user: string) => Promise<{ expiresAt: string; percentage: number; active: boolean } | null>;
  getActivePowerRenters: (tokenId: string) => Promise<string[]>;
  getUserPowerListed: (userAddress: string) => Promise<string[]>;
  getPowerOffers: (tokenId: string) => Promise<Array<{
    renter: string;
    percentage: number;
    offerTime: string;
    amountPaid: string;
    accepted: boolean;
  }>>;
  hasActivePower: (tokenId: string, user: string) => Promise<boolean>;
  canUsePower: (tokenId: string, user: string) => Promise<boolean>;
  getActivePowerTokenIds: () => Promise<string[]>;
  getPowerAllocatedPct: (tokenId: string) => Promise<number>;
  hasPowerAccess: (tokenId: string, user: string) => Promise<boolean>;
  listForPower: (tokenId: string, basePrice: string, duration: number, payUpfront: boolean) => Promise<string>;
  cancelPowerListing: (tokenId: string) => Promise<string>;
  createPowerOffer: (tokenId: string, percentage: number) => Promise<string>;
  withdrawPowerOffer: (tokenId: string, offerIdx: number) => Promise<string>;
  acceptPowerOffer: (tokenId: string, offerIndex: number) => Promise<string>;

  // TOKEN
  getTokenBalance: (owner: string) => Promise<string>;
  getTokenAllowance: (owner: string, spender: string) => Promise<string>;
  approveToken: (spender: string, amount: string) => Promise<string>;
  getTokenName: () => Promise<string>;
  getTokenSymbol: () => Promise<string>;
  getTokenDecimals: () => Promise<number>;

  // IPFS / URLs helpers
  getTokenURIHttp: (tokenId: string) => Promise<string>;
  getPrivateTokenURIHttp: (tokenId: string) => Promise<string>;
  fetchTokenJson: (tokenId: string) => Promise<any | null>;
  fetchPrivateJson: (tokenId: string) => Promise<any | null>;
}

// ================================
// HELPERS: direcciones & transport
// ================================
const safeAddressOrEmpty = (addr: string | undefined) => {
  if (!addr) return '';
  try {
    return getAddress(addr);
  } catch {
    return '';
  }
};

const getContractAddresses = () => {
  const network = baseNetworkInfo;
  return {
    nft: safeAddressOrEmpty(network.contracts.nft),
    sale: safeAddressOrEmpty(network.contracts.sale),
    rental: safeAddressOrEmpty(network.contracts.rental),
    power: safeAddressOrEmpty(network.contracts.power),
    paymentToken: safeAddressOrEmpty(network.contracts.token),
  };
};

// viem transport con fallback entre RPC principal y secundario
const makeTransport = () => {
  const network = baseNetworkInfo;
  const transports = [http(network.rpcUrl)];
  if (network.fallbackRpcUrl) {
    transports.push(http(network.fallbackRpcUrl));
  }
  return transports.length > 1 ? viemFallback(transports as any) : transports[0];
};

// ================================
// ABIs por nombre
// ================================
const ABI_MAP = {
  nft: RentalNFTAbi,
  sale: SaleMarketAbi,
  rental: RentalMarketAbi,
  power: PowerMarketAbi,
  paymentToken: ERC20Abi,
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
export const useMarketplaceContracts = () => {
  const { wallet, connectWallet } = useWallet();

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

  const ensurePublicClient = $(async () => {
    const cached = getCachedPublicClient();
    if (cached) {
      return cached;
    }
    const chain = resolveChain(baseNetworkInfo);
    return createPublicClient({
      chain,
      transport: makeTransport(),
    });
  });

  const initializeContracts = $(async () => {
    try {
      isLoading.value = true;
      const addresses = getContractAddresses();

      if (
        !addresses.nft ||
        !addresses.sale ||
        !addresses.rental ||
        !addresses.power ||
        !addresses.paymentToken
      ) {
        throw new Error('Missing or invalid contract addresses (env)');
      }

      contracts.value = {
        nft: { address: addresses.nft },
        sale: { address: addresses.sale },
        rental: { address: addresses.rental },
        power: { address: addresses.power },
        paymentToken: { address: addresses.paymentToken },
        isConnected: wallet.connected,
        chainId: wallet.chainId ?? null,
        address: wallet.address ?? null,
        error: null,
      };

      try {
        const pc = await ensurePublicClient();
        const erc20Abi = normalizeAbi(ERC20Abi);
        const dec = (await readContract(pc, {
          address: addresses.paymentToken as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals',
        })) as number;
        tokenDecimals.value = dec ?? 18;
      } catch (e) {
        console.warn('[init] ERC20.decimals() fallÃ³; usando 18 por defecto', e);
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
    track(() => wallet.connected);
    track(() => wallet.address);
    track(() => wallet.chainId);
    await initializeContracts();
  });

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
      if (isServer) throw new Error('Contract writes can only run on the client');

      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Wallet client unavailable');

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
      if (isServer) throw new Error('Contract writes can only run on the client');

      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Wallet client unavailable');

      const abiRaw = (ABI_MAP as any)[contractName];
      const abi = normalizeAbi(abiRaw);
      const publicClient = await ensurePublicClient();

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
  const ZERO = '0x0000000000000000000000000000000000000000';

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
    } catch (e1) {
      try {
        const r = (await readContractCall('sale', 'saleListings', [BigInt(tokenId)])) as any;
        const seller = Array.isArray(r) ? r[0] : r?.seller;
        const priceRaw = Array.isArray(r) ? (r[1] as bigint) : (r?.price as bigint);
        const isActive = Array.isArray(r) ? r[2] : r?.isActive;
        if (!seller && !priceRaw && typeof isActive === 'undefined') {
          return { seller: ZERO, price: '0', isActive: false };
        }
        return {
          seller: seller ?? ZERO,
          price: formatUnits(priceRaw ?? 0n, tokenDecimals.value),
          isActive: Boolean(isActive),
        };
      } catch (e2) {
        try {
          const ids = (await readContractCall('sale', 'getActiveSaleIds', [])) as Array<bigint | string>;
          const active = ids.some((id) => id.toString() === tokenId);
          return { seller: ZERO, price: '0', isActive: active };
        } catch (e3) {
          console.warn('[getSaleListingSafe] no se pudo leer por ningÃºn mÃ©todo', { e1, e2, e3 });
          return { seller: ZERO, price: '0', isActive: false };
        }
      }
    }
  });

  const ensureAllowanceFn = $(async (owner: string, spender: string, neededHuman: string) => {
    const allowance = (await readContractCall('paymentToken', 'allowance', [
      getAddress(owner) as `0x${string}`,
      getAddress(spender) as `0x${string}`,
    ])) as bigint;

    const current = Number(formatUnits(allowance, tokenDecimals.value));
    const needed = Number(neededHuman);
    if (current < needed) {
      await writeContractCall('paymentToken', 'approve', [
        getAddress(spender) as `0x${string}`,
        parseUnits(neededHuman, tokenDecimals.value),
      ]);
    }
  });

  // ---------- NFT (WRITE) ----------
  const mintFn = $(async (privateURI: string) => {
    if (!privateURI || privateURI.length < 10) throw new Error('Private URI invÃ¡lido');
    const ref = contracts.value.nft?.address;
    const account = contracts.value.address;
    if (!ref || !account) throw new Error('NFT contract unavailable or wallet disconnected');

    const publicClient = await ensurePublicClient();
    const nftAbi = normalizeAbi(RentalNFTAbi);

    const { request, result } = await simulateContract(publicClient, {
      address: ref as `0x${string}`,
      abi: nftAbi,
      functionName: 'mint',
      args: [privateURI],
      account: account as `0x${string}`,
    });

    const walletClient = getWalletClient();
    if (!walletClient) throw new Error('Wallet client unavailable');

    const hash = await writeContract(walletClient, {
      ...request,
      gas: BigInt(300_000),
      account: account as `0x${string}`,
      chain: resolveChain(baseNetworkInfo),
    });

    return {
      hash,
      tokenId: (result as bigint).toString(),
      wait: async () => {
        const receipt = await waitForTransactionReceipt(publicClient, { hash, confirmations: 1 });
        return {
          ...receipt,
          status: receipt.status === 'success' ? 1 : 0,
          tokenId: (result as bigint).toString(),
        };
      },
    };
  });

  // ---------- NFT + IPFS (cliente vÃ­a API) ----------
  async function mintWithIPFS(
    metadata: Record<string, any>,
    imageFile?: File | Blob | null
  ): Promise<{ hash: string; tokenId: string; wait: () => Promise<any> }> {
    // 1) Asegurar serializaciÃ³n
    const safeMetadata = JSON.parse(JSON.stringify(metadata ?? {}));

    // 2) Preparar FormData para la API
    const form = new FormData();
    form.set('metadata', JSON.stringify(safeMetadata));
    if (imageFile) {
      const asFile =
        imageFile instanceof File
          ? imageFile
          : new File([imageFile], 'image.bin', {
              type: (imageFile as any).type || 'application/octet-stream',
            });
      form.set('image', asFile, asFile.name || 'image.bin');
    }

    // 3) POST a tu endpoint que sube a Storacha -> { tokenURI }
    const r = await fetch('/api/storacha/upload', {
      method: 'POST',
      body: form,
    });
    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      throw new Error(`Fallo al subir a IPFS: ${msg || r.statusText}`);
    }
    const data = (await r.json()) as { tokenURI?: string };
    const tokenURI = data?.tokenURI;
    if (!tokenURI) throw new Error('tokenURI was not returned when uploading to Storacha');

    // 4) Mint on-chain
    return await mintFn(tokenURI);
  }

  // ================================
  // ACCIONES
  // ================================
  const connect = $(async () => {
    await connectWallet();
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

  const actions: MarketplaceActions = {
    // ConexiÃ³n
    connect,
    disconnect,

    // ---------- SALE MARKET ----------
    getActiveSaleIds: $(async () => {
      const ids = await readContractCall('sale', 'getActiveSaleIds', []);
      return (ids as Array<bigint | string>).map((id) => id.toString());
    }),

    getSaleListing: $(async (tokenId: string) => {
      return await getSaleListingSafe(tokenId);
    }),

    getUserSaleListed: $(async (userAddress: string) => {
      const result = (await readContractCall('sale', 'getUserSaleListed', [
        getAddress(userAddress) as `0x${string}`,
      ])) as bigint[];
      return result.map((id) => id.toString());
    }),

    listForSale: $(async (tokenId: string, price: string) => {
      const saleAddr = contracts.value.sale?.address;
      const owner = contracts.value.address;
      if (!saleAddr || !owner) throw new Error('Sale contract or wallet unavailable');

      const approvedAll = (await readContractCall('nft', 'isApprovedForAll', [
        getAddress(owner) as `0x${string}`,
        getAddress(saleAddr) as `0x${string}`,
      ])) as boolean;

      if (!approvedAll) {
        const currentApproved = (await readContractCall('nft', 'getApproved', [
          BigInt(tokenId),
        ])) as string;

        if (currentApproved.toLowerCase() !== saleAddr.toLowerCase()) {
          await writeContractCall('nft', 'approve', [
            getAddress(saleAddr) as `0x${string}`,
            BigInt(tokenId),
          ]);
        }
      }

      return await writeContractCall('sale', 'listNFTForSale', [
        BigInt(tokenId),
        parseUnits(price, tokenDecimals.value),
      ]);
    }),

    cancelSale: $(async (tokenId: string) => {
      return await writeContractCall('sale', 'cancelNFTSale', [BigInt(tokenId)]);
    }),

    buyNFT: $(async (tokenId: string) => {
      const buyer = contracts.value.address;
      const saleAddr = contracts.value.sale?.address;
      if (!buyer || !saleAddr) throw new Error('Wallet or sale contract unavailable');

      const listing = await getSaleListingSafe(tokenId);
      if (!listing || !listing.isActive) {
        throw new Error('Este NFT no estÃ¡ listado para venta.');
      }

      await ensureAllowanceFn(getAddress(buyer), getAddress(saleAddr), listing.price);
      return await writeContractCall('sale', 'buyNFT', [BigInt(tokenId)]);
    }),

    // ---------- NFT (READ) ----------
    getNFTOwner: $(async (tokenId: string) => {
      return (await readContractCall('nft', 'ownerOf', [BigInt(tokenId)])) as string;
    }),

    getNFTExists: $(async (tokenId: string) => {
      try {
        await readContractCall('nft', 'ownerOf', [BigInt(tokenId)]);
        return true;
      } catch {
        return false;
      }
    }),

    getNFTTokenURI: $(async (tokenId: string) => {
      return (await readContractCall('nft', 'tokenURI', [BigInt(tokenId)], { quiet: true })) as string;
    }),

    getPrivateTokenURI: $(async (tokenId: string) => {
      return (await readContractCall('nft', 'getPrivateTokenURI', [BigInt(tokenId)], { quiet: true })) as string;
    }),

    getUserNFTs: $(async (userAddress: string) => {
      const result = (await readContractCall('nft', 'getUserOwnedNow', [
        getAddress(userAddress) as `0x${string}`,
      ])) as bigint[];
      return result.map((id) => id.toString());
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
    mintWithIPFS, // ahora vÃ­a API, sin server$ en el hook

    burn: $(async (tokenId: string) => {
      return await writeContractCall('nft', 'burn', [BigInt(tokenId)]);
    }),

    setPrivateTokenURI: $(async (tokenId: string, uri: string) => {
      return await writeContractCall('nft', 'setPrivateTokenURI', [BigInt(tokenId), uri]);
    }),

    approveNFT: $(async (to: string, tokenId: string) => {
      return await writeContractCall('nft', 'approve', [getAddress(to) as `0x${string}`, BigInt(tokenId)]);
    }),

    transferNFT: $(async (from: string, to: string, tokenId: string) => {
      return await writeContractCall('nft', 'transferFrom', [
        getAddress(from) as `0x${string}`,
        getAddress(to) as `0x${string}`,
        BigInt(tokenId),
      ]);
    }),

    hasAccessToNFT: $(async (tokenId: string, user: string) => {
      return (await readContractCall('nft', 'hasAccess', [
        BigInt(tokenId),
        getAddress(user) as `0x${string}`,
      ])) as boolean;
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
      return (await readContractCall('nft', 'getApproved', [BigInt(tokenId)])) as string;
    }),

    balanceOf: $(async (owner: string) => {
      const result = (await readContractCall('nft', 'balanceOf', [
        getAddress(owner) as `0x${string}`,
      ])) as bigint;
      return result.toString();
    }),

    marketSetMode: $(async (tokenId: string, newMode: number) => {
      return await writeContractCall('nft', 'marketSetMode', [BigInt(tokenId), Number(newMode)]);
    }),

    getAccessCheckers: $(async () => {
      return (await readContractCall('nft', 'getAccessCheckers', [])) as string[];
    }),

    // ---------- Helper ----------
    ensureAllowance: ensureAllowanceFn,

    // ---------- RENTAL MARKET ----------
    getRentalListing: $(async (tokenId: string) => {
      try {
        const r = (await readContractCall('rental', 'rentalListings', [BigInt(tokenId)])) as any;
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
      return (await readContractCall('rental', 'getActiveRenters', [BigInt(tokenId)])) as string[];
    }),

    getUserRentalListed: $(async (userAddress: string) => {
      const result = (await readContractCall('rental', 'getUserRentalListed', [
        getAddress(userAddress) as `0x${string}`,
      ])) as bigint[];
      return result.map((id) => id.toString());
    }),

    getRentalOffers: $(async (tokenId: string) => {
      const arr = (await readContractCall('rental', 'getRentalOffers', [BigInt(tokenId)])) as any[];
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
          accepted: Boolean(accepted),
        };
      });
    }),

    getActiveRental: $(async (tokenId: string, renter: string) => {
      const r = (await readContractCall('rental', 'activeRentals', [
        BigInt(tokenId),
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
      return Number(await readContractCall('rental', 'getRentalAllocatedPct', [BigInt(tokenId)]));
    }),

    getActiveRentalTokenIds: $(async () => {
      const result = (await readContractCall('rental', 'getActiveRentalTokenIds', [])) as bigint[];
      return result.map((id) => id.toString());
    }),

    hasRentalAccess: $(async (tokenId: string, user: string) => {
      return (await readContractCall('rental', 'hasAccess', [
        BigInt(tokenId),
        getAddress(user) as `0x${string}`,
      ])) as boolean;
    }),

    listForRental: $(async (tokenId: string, basePrice: string, duration: number) => {
      return await writeContractCall('rental', 'listNFTForRental', [
        BigInt(tokenId),
        parseUnits(basePrice, tokenDecimals.value),
        BigInt(duration),
      ]);
    }),

    cancelRentalListing: $(async (tokenId: string) => {
      return await writeContractCall('rental', 'cancelRentalListing', [BigInt(tokenId)]);
    }),

    createRentalOffer: $(async (tokenId: string, percentage: number) => {
      return await writeContractCall('rental', 'createRentalOffer', [BigInt(tokenId), Number(percentage)]);
    }),

    withdrawRentalOffer: $(async (tokenId: string, offerIdx: number) => {
      return await writeContractCall('rental', 'withdrawRentalOffer', [BigInt(tokenId), BigInt(offerIdx)]);
    }),

    acceptRentalOffer: $(async (tokenId: string, offerIndex: number) => {
      return await writeContractCall('rental', 'acceptRentalOffer', [BigInt(tokenId), BigInt(offerIndex)]);
    }),

    endRental: $(async (tokenId: string) => {
      return await writeContractCall('rental', 'endRental', [BigInt(tokenId)]);
    }),

    renterRequestEnd: $(async (tokenId: string) => {
      return await writeContractCall('rental', 'renterRequestEnd', [BigInt(tokenId)]);
    }),

    ownerRequestEnd: $(async (tokenId: string, renter: string) => {
      return await writeContractCall('rental', 'ownerRequestEnd', [
        BigInt(tokenId),
        getAddress(renter) as `0x${string}`,
      ]);
    }),

    processRental: $(async (tokenId: string, renter: string) => {
      return await writeContractCall('rental', 'processRental', [
        BigInt(tokenId),
        getAddress(renter) as `0x${string}`,
      ]);
    }),

    processMany: $(async (tokenIds: string[], renters: string[]) => {
      const tokenIdsBigInt = tokenIds.map((id) => BigInt(id));
      const rentersAddresses = renters.map((r) => getAddress(r) as `0x${string}`);
      return await writeContractCall('rental', 'processMany', [tokenIdsBigInt, rentersAddresses]);
    }),

    // ---------- POWER MARKET ----------
    getPowerListing: $(async (tokenId: string) => {
      try {
        const r = (await readContractCall('power', 'powerListings', [BigInt(tokenId)])) as any;
        const owner = Array.isArray(r) ? r[0] : r?.owner;
        const basePriceRaw = Array.isArray(r) ? (r[1] as bigint) : (r?.basePrice as bigint);
        const durationRaw = Array.isArray(r) ? r[2] : r?.duration;
        const isActive = Array.isArray(r) ? r[3] : r?.isActive;
        const payUpfront = Array.isArray(r) ? r[4] : r?.payUpfront;
        if (!owner && !basePriceRaw && typeof isActive === 'undefined') return null;
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
      try {
        const r = (await readContractCall('power', 'powerGrants', [
          BigInt(tokenId),
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
      return (await readContractCall('power', 'getActivePowerRenters', [BigInt(tokenId)])) as string[];
    }),

    getUserPowerListed: $(async (userAddress: string) => {
      const result = (await readContractCall('power', 'getUserPowerListed', [
        getAddress(userAddress) as `0x${string}`,
      ])) as bigint[];
      return result.map((id) => id.toString());
    }),

    getPowerOffers: $(async (tokenId: string) => {
      const arr = (await readContractCall('power', 'getPowerOffers', [BigInt(tokenId)])) as any[];
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
          accepted: Boolean(accepted),
        };
      });
    }),

    hasActivePower: $(async (tokenId: string, user: string) => {
      return (await readContractCall('power', 'hasAccess', [
        BigInt(tokenId),
        getAddress(user) as `0x${string}`,
      ])) as boolean;
    }),

    canUsePower: $(async (tokenId: string, user: string) => {
      try {
        return (await readContractCall('power', 'canUsePower', [
          BigInt(tokenId),
          getAddress(user) as `0x${string}`,
        ])) as boolean;
      } catch {
        return (await readContractCall('power', 'hasAccess', [
          BigInt(tokenId),
          getAddress(user) as `0x${string}`,
        ])) as boolean;
      }
    }),

    getActivePowerTokenIds: $(async () => {
      const result = (await readContractCall('power', 'getActivePowerTokenIds', [])) as bigint[];
      return result.map((id) => id.toString());
    }),

    getPowerAllocatedPct: $(async (tokenId: string) => {
      return Number(await readContractCall('power', 'getPowerAllocatedPct', [BigInt(tokenId)]));
    }),

    hasPowerAccess: $(async (tokenId: string, user: string) => {
      return (await readContractCall('power', 'hasAccess', [
        BigInt(tokenId),
        getAddress(user) as `0x${string}`,
      ])) as boolean;
    }),

    listForPower: $(async (tokenId: string, basePrice: string, duration: number, payUpfront: boolean) => {
      return await writeContractCall('power', 'listNFTForPower', [
        BigInt(tokenId),
        parseUnits(basePrice, tokenDecimals.value),
        BigInt(duration),
        Boolean(payUpfront),
      ]);
    }),

    cancelPowerListing: $(async (tokenId: string) => {
      return await writeContractCall('power', 'cancelPowerListing', [BigInt(tokenId)]);
    }),

    createPowerOffer: $(async (tokenId: string, percentage: number) => {
      return await writeContractCall('power', 'createPowerOffer', [BigInt(tokenId), Number(percentage)]);
    }),

    withdrawPowerOffer: $(async (tokenId: string, offerIdx: number) => {
      return await writeContractCall('power', 'withdrawPowerOffer', [BigInt(tokenId), BigInt(offerIdx)]);
    }),

    acceptPowerOffer: $(async (tokenId: string, offerIndex: number) => {
      return await writeContractCall('power', 'acceptPowerOffer', [BigInt(tokenId), BigInt(offerIndex)]);
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

    // ---------- IPFS / URLs helpers ----------
    getTokenURIHttp: $(async (tokenId: string) => {
      const uri = (await readContractCall('nft', 'tokenURI', [BigInt(tokenId)], { quiet: true })) as string;
      return ipfsToHttp(uri);
    }),

    getPrivateTokenURIHttp: $(async (tokenId: string) => {
      const uri = (await readContractCall('nft', 'getPrivateTokenURI', [BigInt(tokenId)], { quiet: true })) as string;
      return ipfsToHttp(uri);
    }),

    fetchTokenJson: $(async (tokenId: string) => {
      const uri = (await readContractCall('nft', 'tokenURI', [BigInt(tokenId)], { quiet: true })) as string;
      const url = ipfsToHttp(uri);
      if (!url) return null;
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    }),

    fetchPrivateJson: $(async (tokenId: string) => {
      const uri = (await readContractCall('nft', 'getPrivateTokenURI', [BigInt(tokenId)], { quiet: true })) as string;
      const url = ipfsToHttp(uri);
      if (!url) return null;
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    }),
  };

  return {
    contracts,
    actions,
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



