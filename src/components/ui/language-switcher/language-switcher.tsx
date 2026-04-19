import { component$, $, useComputed$ } from '@builder.io/qwik';
import { useSpeakConfig, useSpeakLocale, useQwikSpeak } from 'qwik-speak';
import { LuGlobe } from '@qwikest/icons/lucide';

export const LanguageSwitcher = component$(() => {
    const loc = useSpeakLocale();
    const config = useSpeakConfig();

    const otherLocale = useComputed$(() => {
        return config.supportedLocales.find((l) => l.lang !== loc.lang) || config.supportedLocales[0];
    });

    const changeLocale = $(async () => {
        const newLang = otherLocale.value.lang;
        const segments = window.location.pathname.split('/').filter(Boolean);
        const localeIdx = segments.findIndex((seg) =>
            config.supportedLocales.some((l) => l.lang.toLowerCase() === seg.toLowerCase()),
        );

        if (localeIdx !== -1) {
            segments[localeIdx] = newLang;
            const next = `/${segments.join('/')}${window.location.search}${window.location.hash}`;
            window.location.assign(next);
        } else {
            window.location.assign(`/${newLang}/` + window.location.search + window.location.hash);
        }
    });

    return (
        <button
            onClick$={changeLocale}
            class="flex items-center gap-2 rounded-full border border-[#043234] bg-[#043234]/40 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-[#04E6E6]/40 hover:bg-[#043234] hover:text-white"
        >
            <LuGlobe class="w-3 h-3" />
            <span>{loc.lang.toLowerCase().startsWith('en') ? 'EN' : 'ES'}</span>
        </button>
    );
});
