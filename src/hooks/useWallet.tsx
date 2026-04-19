import { $, useSignal, useStore, useVisibleTask$, useTask$, useComputed$ } from '@builder.io/qwik';
import {
  createWalletClient,
  createPublicClient,
  custom,
  http
} from 'viem';
import { getBalance, estimateGas, waitForTransactionReceipt } from 'viem/actions';
import { getNetworkConfig, parseContractError, formatEthValue } from '~/utils/blockchain';

// ================================
// NETWORK CONFIGURATION
// ================================

// Get Base network configuration from environment
// Create a clean chain configuration without formatters to avoid Qwik serialization issues
export function getBaseNetwork() {
  const config = getNetworkConfig();

  // Create a clean chain configuration without formatters or other non-serializable functions
  const cleanChain = {
    id: config.id,
    name: config.name,
    network: config.name.toLowerCase(),
    nativeCurrency: config.nativeCurrency,
    rpcUrls: {
      default: { http: [config.rpcUrl] },
      public: { http: [config.rpcUrl] }
    },
    blockExplorers: {
      default: {
        name: 'Explorer',
        url: config.explorerUrl
      }
    }
  };

  return cleanChain;
}

export const BASE_NETWORK = getBaseNetwork();

// ================================
// TYPES & INTERFACES
// ================================

export interface WalletStore {
  address?: string;
  connected: boolean;
  chainId?: number;
  error?: string;
  isCorrectNetwork?: boolean;
  balance?: string;
  isConnecting?: boolean;
  isModalOpen?: boolean;
}

export interface TransactionStatus {
  hash?: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  receipt?: any;
}

// ================================
// GLOBAL STATE
// ================================

// Create a global wallet state to be shared across components
// This prevents multiple connection instances
// NOTE: Clients are kept separate to avoid Qwik serialization issues
const globalState = {
  walletState: { connected: false, isConnecting: false, isModalOpen: false } as WalletStore,
  listeners: [] as (() => void)[]
};

// Keep clients separate from serializable state to avoid Qwik serialization errors
// Using an object allows us to reassign properties without Rollup import errors
const globalClients = {
  walletClient: undefined as any,
  publicClient: undefined as any
};

// Utility functions to access clients (not part of the hook to avoid serialization)
export const getWalletClient = () => globalClients.walletClient;
export const getPublicClient = () => globalClients.publicClient;

// Notify all listeners when wallet state changes
const notifyListeners = () => {
  globalState.listeners.forEach(listener => listener());
};

// Helper function to update global wallet state safely
const updateGlobalWalletState = (newState: Partial<WalletStore>) => {
  const updatedState = { ...globalState.walletState, ...newState };

  // If connected, automatically close the modal
  if (updatedState.connected === true) {
    updatedState.isModalOpen = false;
  }

  globalState.walletState = updatedState;
  notifyListeners();
};

// ================================
// MAIN HOOK
// ================================

export function useWallet() {
  // Local wallet state synchronized with global state
  const wallet = useStore<WalletStore>({
    address: globalState.walletState.address,
    connected: globalState.walletState.connected,
    chainId: globalState.walletState.chainId,
    error: globalState.walletState.error,
    isCorrectNetwork: globalState.walletState.isCorrectNetwork,
    balance: globalState.walletState.balance,
    isConnecting: globalState.walletState.isConnecting,
    isModalOpen: globalState.walletState.isModalOpen
  });

  // Transaction states
  const currentTransaction = useSignal<TransactionStatus>({ status: 'idle' });

  // Legacy support for isConnecting signal (derived from store)
  const isConnecting = useComputed$(() => !!wallet.isConnecting);

  // LEGACY: showWalletModal computed for backward compatibility if needed, 
  // but we prefer using wallet.isModalOpen directly.
  const isModalOpen = useComputed$(() => !!wallet.isModalOpen);

  // ================================
  // ALL FUNCTIONS DEFINED FIRST
  // ================================

  // CLIENT INITIALIZATION
  const initializeClients = $(async () => {
    if (typeof window === 'undefined') return;

    // Initialize public client
    if (!globalClients.publicClient) {
      globalClients.publicClient = createPublicClient({
        chain: BASE_NETWORK,
        transport: http(BASE_NETWORK.rpcUrls.default.http[0])
      });
    }

    // CHECK FOR PREFERRED WALLET TYPE
    const preferredWalletType = localStorage.getItem('knrt_wallet_type');
    const managedAddress = localStorage.getItem('knrt_managed_wallet');

    // 1. PRIORITIZE METAMASK if it was the last used type OR if managed wallet is not found
    if (window.ethereum && (preferredWalletType === 'metamask' || !managedAddress)) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const parsedChainId = parseInt(chainId, 16);

          globalClients.walletClient = createWalletClient({
            chain: BASE_NETWORK,
            transport: custom(window.ethereum)
          });

          updateGlobalWalletState({
            address: accounts[0],
            connected: true,
            chainId: parsedChainId,
            isCorrectNetwork: parsedChainId === BASE_NETWORK.id,
            error: undefined
          });

          console.log('[Wallet] MetaMask session restored:', accounts[0]);
          return;
        }
      } catch (e) {
        console.error('[Wallet] Failed to check for MetaMask accounts:', e);
      }
    }

    // 2. FALLBACK TO MANAGED WALLET if preferred or if MetaMask check skipped/failed
    if (managedAddress && preferredWalletType !== 'metamask') {
      updateGlobalWalletState({
        address: managedAddress,
        connected: true,
        chainId: BASE_NETWORK.id,
        isCorrectNetwork: true,
        error: undefined
      });

      console.log('[Wallet] Managed wallet restored:', managedAddress);
      return;
    }
  });

  const openWalletModal = $(() => {
    if (globalState.walletState.connected) return;
    updateGlobalWalletState({ isModalOpen: true });
  });

  const closeModal = $(() => {
    updateGlobalWalletState({ isModalOpen: false });
  });

  // UTILITY FUNCTIONS
  const updateBalance = $(async () => {
    if (!globalClients.publicClient || !wallet.address) return;

    try {
      const balance = await getBalance(globalClients.publicClient, {
        address: wallet.address as `0x${string}`
      });

      updateGlobalWalletState({
        balance: formatEthValue(balance)
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  });

  // EVENT HANDLERS  
  const handleAccountsChanged = $((accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      updateGlobalWalletState({
        connected: false,
        address: undefined,
        balance: undefined
      });
      globalClients.walletClient = undefined;
    } else {
      // User switched accounts - reload page to reset all state
      console.log('[Wallet] Account changed, reloading page...');

      // Store the new address before reload
      updateGlobalWalletState({
        address: accounts[0],
        connected: true,
      });

      // Force page reload to reset all contract states and UI
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  });

  const handleChainChanged = $((chainId: string) => {
    const parsedChainId = parseInt(chainId, 16);
    console.log('[Wallet] Chain changed to:', parsedChainId);

    updateGlobalWalletState({
      chainId: parsedChainId,
      isCorrectNetwork: parsedChainId === BASE_NETWORK.id
    });

    // Force page reload when chain changes to reset all contract states
    if (typeof window !== 'undefined') {
      console.log('[Wallet] Reloading page due to chain change...');
      window.location.reload();
    }
  });

  const removeEventListeners = $(() => {
    if (!window.ethereum) return;

    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
  });

  const setupEventListeners = $(() => {
    if (!window.ethereum) return;

    // Remove existing listeners first
    removeEventListeners();

    // Add new listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
  });

  // NETWORK MANAGEMENT
  const addBaseNetwork = $(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return false;
    }

    try {
      // Try to switch to Base network first
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BASE_NETWORK.id.toString(16)}` }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${BASE_NETWORK.id.toString(16)}`,
                chainName: BASE_NETWORK.name,
                rpcUrls: [BASE_NETWORK.rpcUrls.default.http[0]],
                nativeCurrency: BASE_NETWORK.nativeCurrency,
                blockExplorerUrls: [BASE_NETWORK.blockExplorers?.default?.url]
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Error adding Base network:', addError);
          return false;
        }
      }
      console.error('Error switching to Base network:', switchError);
      return false;
    }
  });

  // WALLET CONNECTION
  const performWalletConnection = $(async (addNetwork = true) => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      // Create wallet client
      const client = createWalletClient({
        chain: BASE_NETWORK,
        transport: custom(window.ethereum)
      });

      // Request account access
      const addresses = await client.requestAddresses();

      // Store wallet client globally
      globalClients.walletClient = client;

      // Get current chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const parsedChainId = parseInt(chainId, 16);

      // Check if user is on Base network
      const isCorrectNetwork = parsedChainId === BASE_NETWORK.id;

      // If not on Base and addNetwork is true, try to add/switch to Base
      if (!isCorrectNetwork && addNetwork) {
        const switched = await addBaseNetwork();
        if (switched) {
          // Re-check chain ID after network switch
          const newChainId = await window.ethereum.request({ method: 'eth_chainId' });
          const newParsedChainId = parseInt(newChainId, 16);

          updateGlobalWalletState({
            address: addresses[0],
            connected: true,
            chainId: newParsedChainId,
            isCorrectNetwork: newParsedChainId === BASE_NETWORK.id,
            error: undefined
          });
        } else {
          updateGlobalWalletState({
            address: addresses[0],
            connected: true,
            chainId: parsedChainId,
            isCorrectNetwork: false,
            error: 'Please switch to Base network manually'
          });
        }
      } else {
        updateGlobalWalletState({
          address: addresses[0],
          connected: true,
          chainId: parsedChainId,
          isCorrectNetwork,
          error: undefined
        });
      }

      // Store preferred wallet type
      localStorage.setItem('knrt_wallet_type', 'metamask');

      // Setup event listeners
      setupEventListeners();

      // Update balance
      await updateBalance();

      return true;
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);

      const errorMessage = parseContractError(error);
      updateGlobalWalletState({
        error: errorMessage,
      });
      return false;
    }
  });


  const connectWallet = $(async (addNetwork = true) => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting.value) {
      console.log('Connection already in progress, please wait...');
      return false;
    }


    if (typeof window === 'undefined' || !window.ethereum) {
      const error = 'MetaMask is not installed';
      updateGlobalWalletState({ error });

      if (typeof window !== 'undefined') {
        if (confirm('MetaMask is required to use this app. Would you like to install it?')) {
          window.open('https://metamask.io/download/', '_blank');
        }
      }
      return false;
    }

    updateGlobalWalletState({ isConnecting: true });

    try {
      // Check if already connected
      if (globalState.walletState.connected && globalState.walletState.address) {
        console.log('Wallet already connected:', globalState.walletState.address);

        // If we need to add/switch network but already connected
        if (addNetwork && globalState.walletState.chainId !== BASE_NETWORK.id) {
          await addBaseNetwork();
        }

        return true;
      }

      return await performWalletConnection(addNetwork);
    } catch (error) {
      console.error('Error in connectWallet:', error);
      return false;
    } finally {
      updateGlobalWalletState({ isConnecting: false });
    }
  });

  const disconnectWallet = $(async () => {
    // Revoke dapp permission so eth_accounts is empty on next load (MetaMask, Rabby, etc.).
    // Without this, initializeClients() would restore the connection from the injected wallet.
    if (typeof window !== "undefined" && window.ethereum?.request) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (e) {
        console.warn("[Wallet] wallet_revokePermissions unavailable or failed:", e);
      }
    }

    updateGlobalWalletState({
      connected: false,
      address: undefined,
      chainId: undefined,
      isCorrectNetwork: false,
      error: undefined,
      balance: undefined,
    });

    localStorage.removeItem("knrt_wallet_type");
    localStorage.removeItem("knrt_managed_wallet");

    globalClients.walletClient = undefined;

    removeEventListeners();
  });

  // ADVANCED TRANSACTION UTILITIES
  const estimateTransactionGas = $(async (params: {
    to: string;
    data?: string;
    value?: bigint;
  }) => {
    if (!globalClients.walletClient || !wallet.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const gasEstimate = await estimateGas(globalClients.publicClient, {
        account: wallet.address as `0x${string}`,
        to: params.to as `0x${string}`,
        data: params.data as `0x${string}`,
        value: params.value
      });

      return gasEstimate;
    } catch (error: any) {
      console.error('Gas estimation failed:', error);
      throw new Error(parseContractError(error));
    }
  });

  const waitForTransaction = $(async (hash: string) => {
    if (!globalClients.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      currentTransaction.value = {
        hash,
        status: 'pending'
      };

      const receipt = await waitForTransactionReceipt(globalClients.publicClient, {
        hash: hash as `0x${string}`,
        confirmations: parseInt(import.meta.env.PUBLIC_REQUIRED_CONFIRMATIONS || '1'),
        timeout: parseInt(import.meta.env.PUBLIC_TX_TIMEOUT || '120000')
      });

      currentTransaction.value = {
        hash,
        status: receipt.status === 'success' ? 'success' : 'error',
        receipt
      };

      return receipt;
    } catch (error: any) {
      console.error('Transaction failed:', error);
      currentTransaction.value = {
        hash,
        status: 'error',
        error: parseContractError(error)
      };
      throw error;
    }
  });

  const initWalletClient = $(async () => {
    if (!globalState.walletState.connected || !globalState.walletState.address) return null;
    if (typeof window === 'undefined' || !window.ethereum) return null;

    try {
      const client = createWalletClient({
        chain: BASE_NETWORK,
        transport: custom(window.ethereum)
      });
      globalClients.walletClient = client;
      return client;
    } catch (error) {
      console.error('Wallet client re-init failed:', error);
      return null;
    }
  });

  // ================================
  // STATE SYNCHRONIZATION
  // ================================

  // Sync with global state
  useVisibleTask$(({ cleanup }) => {
    const updateLocalState = () => {
      wallet.address = globalState.walletState.address;
      wallet.connected = globalState.walletState.connected;
      wallet.chainId = globalState.walletState.chainId;
      wallet.error = globalState.walletState.error;
      wallet.isCorrectNetwork = globalState.walletState.isCorrectNetwork;
      wallet.balance = globalState.walletState.balance;
      wallet.isConnecting = globalState.walletState.isConnecting;
      wallet.isModalOpen = globalState.walletState.isModalOpen;
    };

    // Add this component as a listener
    globalState.listeners.push(updateLocalState);

    // Initial sync
    updateLocalState();

    // Initialize clients if needed
    initializeClients();

    // Clean up listener when component unmounts
    cleanup(() => {
      globalState.listeners = globalState.listeners.filter(listener => listener !== updateLocalState);
    });
  });

  // Auto-update balance when wallet is connected
  useTask$(async ({ track }) => {
    track(() => wallet.connected);
    track(() => wallet.address);

    if (wallet.connected && wallet.address) {
      await updateBalance();
    }
  });


  // ================================
  // RETURN INTERFACE
  // ================================

  return {
    // State (only serializable values)
    wallet,
    isConnecting,
    currentTransaction,

    // Connection methods
    connectWallet,
    disconnectWallet,
    openWalletModal,
    closeModal,
    initWalletClient,

    // Network methods
    addBaseNetwork,
    BASE_NETWORK,

    // Utilities
    updateBalance,
    estimateTransactionGas,
    waitForTransaction,

    // Event management
    setupEventListeners,
    removeEventListeners,

    // Environment info
    chainId: BASE_NETWORK.id,
    chainName: BASE_NETWORK.name,
    explorerUrl: BASE_NETWORK.blockExplorers?.default?.url,
    rpcUrl: BASE_NETWORK.rpcUrls.default.http[0]
  };
}
