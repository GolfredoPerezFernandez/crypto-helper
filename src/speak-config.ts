import type { SpeakConfig } from 'qwik-speak';

export const config: SpeakConfig = {
    defaultLocale: { lang: 'en-US', currency: 'USD', timeZone: 'America/Los_Angeles' },
    supportedLocales: [
        { lang: 'en-US', currency: 'USD', timeZone: 'America/Los_Angeles' },
        { lang: 'es-ES', currency: 'EUR', timeZone: 'Europe/Madrid' },
    ],
    assets: [
        'app',
        'dashboard',
        'docs',
        'bot',
        'tokenPage',
        'home',
        'mint',
        'tutorial',
        'swapPage',
        'newPosition',
        'positions',
        'deployErc20',
        'profile',
        'myNfts',
        'allNfts',
        'nftDetails'
    ],
    // runtimeAssets enables client-side translation loading during SPA navigation
    runtimeAssets: [
        'app',
        'dashboard',
        'docs',
        'bot',
        'tokenPage',
        'home',
        'mint',
        'tutorial',
        'swapPage',
        'newPosition',
        'positions',
        'deployErc20',
        'profile',
        'myNfts',
        'allNfts',
        'nftDetails'
    ],
};
