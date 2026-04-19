import { component$, useSignal, $ } from '@builder.io/qwik';
import { useWallet } from '../../hooks/useWallet';
import { WalletConnectionStatus, WalletError } from './WalletError';
import { WalletSelectionModal } from './WalletSelectionModal';

export const ConnectWalletButton = component$(() => {
  const { wallet, connectWallet, disconnectWallet, isConnecting, openWalletModal, closeModal } = useWallet();
  const errorVisible = useSignal(true);

  // Reset error visibility when error changes
  if (wallet.error && !errorVisible.value) {
    errorVisible.value = true;
  }

  const handleConnectClick = $(() => {
    openWalletModal();
  });

  const handleSelectMetaMask = $(() => {
    closeModal();
    connectWallet(true);
  });

  return (
    <div>
      {/* Error display */}
      {wallet.error && errorVisible.value && (
        <WalletError
          error={wallet.error}
          onClose$={() => (errorVisible.value = false)}
        />
      )}

      {/* Connection loader */}
      <WalletConnectionStatus isConnecting={isConnecting.value} />

      {/* Modal */}
      {wallet.isModalOpen && (
        <WalletSelectionModal
          onClose$={closeModal}
          onSelectMetaMask$={handleSelectMetaMask}
        />
      )}

      {/* Button */}
      {wallet.connected ? (
        <div class="flex flex-col items-center gap-2">
          <span class="text-sm text-gray-500">
            Connected: {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
          </span>
          <button
            onClick$={disconnectWallet}
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <button
          onClick$={handleConnectClick}
          class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors"
        >
          Connect Wallet
        </button>
      )}

      {/* Network status indicator (optional) */}
      {wallet.connected && wallet.chainId && (
        <div class="mt-2 flex items-center justify-center">
          <div
            class={`w-3 h-3 rounded-full mr-2 ${wallet.isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'
              }`}
          ></div>
          <span class="text-sm text-gray-600">
            {wallet.isCorrectNetwork
              ? 'Connected to Base network'
              : 'Wrong network, please switch to Base'}
          </span>
        </div>
      )}
    </div>
  );
});
