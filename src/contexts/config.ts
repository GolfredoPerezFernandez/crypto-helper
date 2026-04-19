import { createContextId } from '@builder.io/qwik';

export interface MarketplaceConfig {
    nftAddress: string;
    saleMarketAddress: string;
    rentalMarketAddress: string;
    powerMarketAddress: string;
    paymentTokenAddress: string;
    rpcUrl: string;
    fallbackRpcUrl: string;
}

export const MarketplaceConfigContext = createContextId<MarketplaceConfig>('knrt.marketplace.config');
