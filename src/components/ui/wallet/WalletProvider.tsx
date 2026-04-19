import { component$, Slot, useContextProvider, createContextId, useStore, $ } from '@builder.io/qwik';
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

export const WalletContext = createContextId<any>('wallet-context');

export const WalletProvider = component$(() => {
  const wallet = useStore<{ address?: string; connected: boolean; client?: any }>({ address: undefined, connected: false, client: undefined });

  const connectWallet = $(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const client = createWalletClient({
        chain: mainnet,
        transport: custom(window.ethereum)
      });
      client.requestAddresses().then((addresses: string[]) => {
        wallet.address = addresses[0];
        wallet.connected = true;
        wallet.client = client;
      });
    } else {
      alert('MetaMask is not installed');
    }
  });

  useContextProvider(WalletContext, { wallet, connectWallet });

  return <Slot />;
});
