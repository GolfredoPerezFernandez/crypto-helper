import { server$ } from '@builder.io/qwik-city';
import type { LoadTranslationFn, TranslationFn } from 'qwik-speak';
import en from './i18n/en/index';
import es from './i18n/es/index';

/**
 * Load translations
 */
export const loadTranslation$: LoadTranslationFn = server$(async (lang: string, asset: string) => {
    try {
        const normalizedLang = lang.toLowerCase();
        const isEn = normalizedLang.startsWith('en');

        console.log(`[Speak Loader] Request: lang=${lang}, asset=${asset}`);

        const data: any = isEn ? en : es;

        if (!data) {
            console.warn(`[Speak Loader] Warning: No data found for lang ${lang}`);
            return null;
        }

        // Hybrid strategy for maximum robustness:
        // 1. Include the full data object (global lookup support)
        // 2. Merge the specific asset branch at the top level (asset-scoped lookup support)
        // This ensures t('home.hero.title') works regardless of how Qwik Speak scopes the call.
        const response = {
            ...data,
            ...(typeof data[asset] === 'object' ? data[asset] : {})
        };

        console.log(`[Speak Loader] Success: lang=${lang}, asset=${asset}, returning hybrid dataset`);

        return response;
    } catch (err) {
        console.error(`[Speak Loader] Error loading lang=${lang}, asset=${asset}:`, err);
        return null;
    }
});

export const translationFn: TranslationFn = {
    loadTranslation$: loadTranslation$,
};
