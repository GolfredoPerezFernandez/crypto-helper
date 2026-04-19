import { type RequestHandler } from '@builder.io/qwik-city';
import { config } from '../speak-config';

export const onRequest: RequestHandler = ({ params, locale }) => {
    // Find matching locale from config to ensure correct casing (e.g. en-US)
    const lang = config.supportedLocales.find(
        (l) => l.lang.toLowerCase() === params.locale?.toLowerCase()
    )?.lang || config.defaultLocale.lang;

    console.log(`[Plugin SSR] Resolved lang: ${lang} (from param: ${params.locale})`);

    // Set Qwik locale
    locale(lang);
};
