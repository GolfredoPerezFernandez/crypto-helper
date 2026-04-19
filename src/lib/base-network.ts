import { base, baseSepolia } from 'viem/chains';
import type { Chain } from 'viem';
import { getContractAddresses, getNetworkConfig } from '~/utils/blockchain';

export type BaseNetworkKey = 'base-mainnet' | 'base-sepolia';

export interface NetworkContracts {
  nft?: string;
  sale?: string;
  rental?: string;
  power?: string;
  token?: string;
}

export interface BaseAppNetwork {
  key: BaseNetworkKey;
  label: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  fallbackRpcUrl?: string;
  contracts: NetworkContracts;
}

const BASE_CHAIN_MAP: Record<number, Chain> = {
  8453: base,
  84532: baseSepolia,
};

const createBaseNetworkInfo = (): BaseAppNetwork => {
  const config = getNetworkConfig();
  const key: BaseNetworkKey = config.id === 84532 ? 'base-sepolia' : 'base-mainnet';
  const contractAddresses = getContractAddresses();

  return {
    key,
    label: config.name,
    chainId: config.id,
    rpcUrl: config.rpcUrl,
    explorerUrl: config.explorerUrl,
    fallbackRpcUrl: import.meta.env.PUBLIC_FALLBACK_RPC_URL || undefined,
    contracts: {
      nft: contractAddresses.propertyNft,
      sale: contractAddresses.realEstateMarketplace,
      rental: contractAddresses.propertyRentalManager,
      power: contractAddresses.powerTransferMarketplace,
      token: contractAddresses.knrtToken,
    },
  };
};

export const baseNetworkInfo = createBaseNetworkInfo();

export const resolveChain = (network: BaseAppNetwork): Chain => {
  return BASE_CHAIN_MAP[network.chainId] ?? base;
};
