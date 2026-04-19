export type EthereumAddress = `0x${string}`;

export interface ContractAddresses {
  realEstateMarketplace: EthereumAddress;
  propertyNft: EthereumAddress;
  powerTransferMarketplace: EthereumAddress;
  propertyRentalManager: EthereumAddress;
}

export interface MarketplaceContracts {
  address?: EthereumAddress;
  chainId?: number; 
  isConnected?: boolean;
  error?: string;
  nft?: {
    address: EthereumAddress;
  };
  sale?: {
    address: EthereumAddress;
  };
  rental?: {
    address: EthereumAddress;
  };
  power?: {
    address: EthereumAddress;
  };
}

export interface RentalListing {
  owner: string;
  basePrice: string;
  duration: string;
  isActive: boolean;
  payUpfront: boolean;
}

export interface PowerListing {
  owner: string;
  basePrice: string;
  duration: string;
  isActive: boolean;
  payUpfront: boolean;
}