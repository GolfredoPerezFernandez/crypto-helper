import { component$, useSignal, $ } from '@builder.io/qwik';
import { LuKey, LuEye, LuEyeOff, LuCopy, LuCheck, LuAlertTriangle, LuLock, LuLoader2 } from '@qwikest/icons/lucide';
import { exportPrivateKey } from '~/server/auth-actions';

interface ExportPrivateKeyProps {
    walletAddress: string;
}

export const ExportPrivateKeyCard = component$<ExportPrivateKeyProps>((props) => {
    const showExportModal = useSignal(false);
    const password = useSignal('');
    const privateKey = useSignal('');
    const showKey = useSignal(false);
    const error = useSignal('');
    const loading = useSignal(false);
    const copied = useSignal(false);

    const handleExport = $(async () => {
        if (!password.value) {
            error.value = 'Please enter your password';
            return;
        }

        loading.value = true;
        error.value = '';

        try {
            const result = await exportPrivateKey({
                walletAddress: props.walletAddress,
                password: password.value
            });

            if (result.success && result.privateKey) {
                privateKey.value = result.privateKey;
            } else {
                error.value = result.message || 'Failed to export private key';
            }
        } catch (err: any) {
            error.value = err.message || 'An error occurred';
        } finally {
            loading.value = false;
        }
    });

    const handleCopy = $(async () => {
        if (privateKey.value) {
            await navigator.clipboard.writeText(privateKey.value);
            copied.value = true;
            setTimeout(() => {
                copied.value = false;
            }, 2000);
        }
    });

    const handleClose = $(() => {
        showExportModal.value = false;
        password.value = '';
        privateKey.value = '';
        showKey.value = false;
        error.value = '';
    });

    return (
        <>
            {/* Export Button Card */}
            <div class="rounded-3xl border border-white/40 bg-white/90 px-6 py-5 shadow-xl shadow-[#c1272d]/10 backdrop-blur">
                <div class="flex items-center gap-2 mb-3">
                    <LuKey class="h-5 w-5 text-[#c1272d]" />
                    <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Managed Wallet
                    </p>
                </div>
                <p class="text-sm text-gray-600 mb-4">
                    Export your private key to use in other wallets like MetaMask.
                </p>
                <button
                    onClick$={() => showExportModal.value = true}
                    class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-md transition-all"
                >
                    <LuKey class="w-4 h-4" />
                    Export Private Key
                </button>
            </div>

            {/* Export Modal */}
            {showExportModal.value && (
                <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                        {/* Close Button */}
                        <button
                            onClick$={handleClose}
                            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {!privateKey.value ? (
                            /* Password Entry */
                            <>
                                <div class="flex items-center gap-3 mb-6">
                                    <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                        <LuKey class="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                                            Export Private Key
                                        </h3>
                                        <p class="text-sm text-gray-500">
                                            Enter your password to continue
                                        </p>
                                    </div>
                                </div>

                                {/* Warning */}
                                <div class="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800 mb-4">
                                    <div class="flex items-start gap-3">
                                        <LuAlertTriangle class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div class="text-sm text-amber-800 dark:text-amber-200">
                                            <strong>Security Warning:</strong> Never share your private key with anyone. Anyone with your private key can access all your funds.
                                        </div>
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div class="mb-4">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Password
                                    </label>
                                    <div class="relative">
                                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <LuLock class="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password.value}
                                            onInput$={(e) => password.value = (e.target as HTMLInputElement).value}
                                            placeholder="Enter your password"
                                            class="block w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>

                                {/* Error */}
                                {error.value && (
                                    <div class="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800 mb-4">
                                        <p class="text-sm text-red-700 dark:text-red-400">{error.value}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div class="flex gap-3">
                                    <button
                                        onClick$={handleClose}
                                        class="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick$={handleExport}
                                        disabled={loading.value}
                                        class="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-60"
                                    >
                                        {loading.value ? (
                                            <>
                                                <LuLoader2 class="w-5 h-5 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            'Export Key'
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Show Private Key */
                            <>
                                <div class="flex items-center gap-3 mb-6">
                                    <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                        <LuCheck class="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                                            Your Private Key
                                        </h3>
                                        <p class="text-sm text-gray-500">
                                            Store this safely and never share it
                                        </p>
                                    </div>
                                </div>

                                {/* Private Key Display */}
                                <div class="relative mb-4">
                                    <div class="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 font-mono text-sm break-all">
                                        {showKey.value ? privateKey.value : '•'.repeat(66)}
                                    </div>
                                    <div class="absolute top-2 right-2 flex gap-1">
                                        <button
                                            onClick$={() => showKey.value = !showKey.value}
                                            class="p-2 rounded-lg bg-white dark:bg-gray-600 shadow hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                                        >
                                            {showKey.value ? (
                                                <LuEyeOff class="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                            ) : (
                                                <LuEye class="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                            )}
                                        </button>
                                        <button
                                            onClick$={handleCopy}
                                            class="p-2 rounded-lg bg-white dark:bg-gray-600 shadow hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                                        >
                                            {copied.value ? (
                                                <LuCheck class="w-4 h-4 text-green-500" />
                                            ) : (
                                                <LuCopy class="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Warning */}
                                <div class="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 mb-4">
                                    <div class="flex items-start gap-3">
                                        <LuAlertTriangle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div class="text-sm text-red-800 dark:text-red-200">
                                            <strong>NEVER</strong> share your private key. Anyone with access to it can steal all your funds. KNRT will never ask for your private key.
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick$={handleClose}
                                    class="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
                                >
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
});
