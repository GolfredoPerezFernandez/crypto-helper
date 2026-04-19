import { component$, $ } from '@builder.io/qwik';
import { useNavigate, useLocation } from '@builder.io/qwik-city';
import { inlineTranslate } from 'qwik-speak';

interface WalletSelectionModalProps {
    onClose$: () => void;
    onSelectMetaMask$: () => void;
}

export const WalletSelectionModal = component$((props: WalletSelectionModalProps) => {
    const nav = useNavigate();
    const location = useLocation();
    const t = inlineTranslate();

    const handleEmailSelect = $(() => {
        props.onClose$();
        // Extract locale from URL path (e.g., /en-us/marketplace -> en-us)
        const pathParts = location.url.pathname.split('/').filter(Boolean);
        const locale = pathParts[0] || 'en-us';
        nav(`/${locale}/login/`);
    });

    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                        {t('wallet.connect@@Connect Wallet')}
                    </h3>
                    <button
                        onClick$={props.onClose$}
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Options */}
                <div class="space-y-3">

                    {/* MetaMask / Web3 */}
                    <button
                        onClick$={props.onSelectMetaMask$}
                        class="w-full flex items-center justify-between p-4 rounded-xl border-2 border-transparent bg-gray-50 dark:bg-gray-700/50 hover:border-[#c1272d] hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group"
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
                                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
                                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
                                </svg>
                            </div>
                            <div class="text-left">
                                <div class="font-semibold text-gray-900 dark:text-white group-hover:text-[#c1272d]">{t('wallet.metamask@@MetaMask / Web3')}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">{t('wallet.metamaskDesc@@Connect using browser wallet')}</div>
                            </div>
                        </div>
                        <svg class="text-gray-400 group-hover:text-[#c1272d]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>

                    {/* Email / Managed */}
                    <button
                        onClick$={handleEmailSelect}
                        class="w-full flex items-center justify-between p-4 rounded-xl border-2 border-transparent bg-gray-50 dark:bg-gray-700/50 hover:border-[#c1272d] hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group"
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                </svg>
                            </div>
                            <div class="text-left">
                                <div class="font-semibold text-gray-900 dark:text-white group-hover:text-[#c1272d]">{t('wallet.email@@Email')}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">{t('wallet.emailDesc@@Log in or create account')}</div>
                            </div>
                        </div>
                        <svg class="text-gray-400 group-hover:text-[#c1272d]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>

                </div>

                <div class="mt-6 text-center">
                    <p class="text-xs text-gray-400">
                        {t('wallet.terms@@By connecting, you agree to our Terms of Service and Privacy Policy.')}
                    </p>
                </div>
            </div>
        </div>
    );
});
