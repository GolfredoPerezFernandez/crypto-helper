import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { inlineTranslate } from 'qwik-speak';
import { registerUser } from '~/server/auth-actions';
import { useWallet } from '~/hooks/useWallet';
import {
    getSafeNextPath,
    hasClientSessionMarker,
    localeFromPathname,
    runWalletSiweLogin,
} from '~/utils/wallet-siwe-login';
import { LuMail, LuLock, LuLoader2, LuArrowRight, LuUser, LuSparkles, LuShield, LuWallet, LuRadar, LuEye, LuEyeOff } from '@qwikest/icons/lucide';

export default component$(() => {
    const t = inlineTranslate();
    const location = useLocation();
    const { wallet } = useWallet();

    const email = useSignal('');
    const password = useSignal('');
    const name = useSignal('');
    const formError = useSignal('');
    const loading = useSignal(false);
    const showPassword = useSignal(false);
    const walletSiweStarted = useSignal(false);

    // Header "Connect" → MetaMask: after connection, SIWE + session cookie, then dashboard (same flow as login with ?session=required).
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track }) => {
        track(() => location.url.href);
        track(() => wallet.connected);
        track(() => wallet.address);

        const path = location.url.pathname;
        if (!path.toLowerCase().includes('/register')) return;

        const locale = localeFromPathname(path, location.params.locale);
        const url = new URL(location.url.href);

        if (hasClientSessionMarker()) {
            window.location.replace(getSafeNextPath(url.searchParams, locale));
            return;
        }

        if (!wallet.connected || !wallet.address) return;
        if (walletSiweStarted.value) return;

        walletSiweStarted.value = true;
        formError.value = '';

        void (async () => {
            try {
                const out = await runWalletSiweLogin();
                if (out.kind === 'needs_email') {
                    const nextDash = encodeURIComponent(`/${locale}/dashboard/home/`);
                    window.location.href = `/${locale}/login/?session=required&next=${nextDash}`;
                    return;
                }
                if (out.kind === 'fail') {
                    formError.value = out.message;
                    walletSiweStarted.value = false;
                    return;
                }
                if (out.kind === 'no_ethereum') {
                    formError.value = 'MetaMask not found';
                    walletSiweStarted.value = false;
                    return;
                }
                if (typeof window !== 'undefined') {
                    localStorage.setItem('knrt_wallet_type', 'metamask');
                    localStorage.removeItem('knrt_managed_wallet');
                }
                window.location.href = `/${locale}/dashboard/home/`;
            } catch (e: unknown) {
                formError.value = e instanceof Error ? e.message : 'MetaMask sign-in failed';
                walletSiweStarted.value = false;
            }
        })();
    });

    const handleSubmit = $(async (e: Event) => {
        e.preventDefault();
        loading.value = true;
        formError.value = '';

        try {
            const res = await registerUser({
                email: email.value,
                password: password.value,
                name: name.value
            });

            if (!res.success) {
                throw new Error(res.message || 'Error occurred');
            }

            if (res.user?.walletAddress) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('knrt_managed_wallet', res.user.walletAddress);
                    localStorage.setItem('knrt_wallet_type', 'managed');
                }
            }

            const locale = localeFromPathname(location.url.pathname, location.params.locale);
            window.location.href = `/${locale}/dashboard/home/`;

        } catch (err: any) {
            formError.value = err.message;
        } finally {
            loading.value = false;
        }
    });

    const inputClass =
        'block w-full rounded-xl border border-[#043234] bg-[#000D0E]/70 py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 transition focus:border-[#04E6E6]/50 focus:outline-none focus:ring-2 focus:ring-[#04E6E6]/35';
    const passwordInputClass =
        'block w-full rounded-xl border border-[#043234] bg-[#000D0E]/70 py-3.5 pl-12 pr-12 text-white placeholder:text-slate-500 transition focus:border-[#04E6E6]/50 focus:outline-none focus:ring-2 focus:ring-[#04E6E6]/35';
    const labelClass = 'mb-2 block text-sm font-medium text-slate-400';

    return (
        <div class="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:flex lg:min-h-[min(100vh-12rem,920px)] lg:items-stretch lg:px-8 lg:py-12">
            {/* Branding — same shell as login / home */}
            <div class="relative order-2 hidden overflow-hidden border-[#043234] lg:order-1 lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:rounded-2xl lg:border lg:bg-[#001a1c]/50 lg:backdrop-blur-sm">
                <div class="pointer-events-none absolute inset-0">
                    <div class="absolute -top-20 right-0 h-64 w-64 rounded-full bg-[#04E6E6]/10 blur-[80px]" />
                    <div class="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-teal-600/15 blur-[70px]" />
                </div>
                <div
                    class="absolute inset-0 opacity-[0.1]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(4, 230, 230, 0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(4, 230, 230, 0.35) 1px, transparent 1px)`,
                        backgroundSize: '48px 48px',
                    }}
                />
                <div class="relative z-10 flex w-full flex-col items-center px-10 py-12">
                    <div class="mb-8 flex items-center gap-3">
                        <div class="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#04E6E6] to-teal-600 shadow-lg shadow-[#04E6E6]/25">
                            <LuRadar class="h-8 w-8 text-[#001a1c]" />
                            <div class="absolute inset-0 bg-gradient-to-tr from-white/25 to-transparent" />
                        </div>
                        <span class="text-3xl font-bold tracking-tight text-white">Crypto Helper</span>
                    </div>
                    <h1 class="text-center text-3xl font-bold text-white lg:text-4xl">
                        {t('register.title')}
                    </h1>
                    <p class="mt-4 max-w-md text-center text-base text-slate-400">
                        {t('register.subtitle')}
                    </p>
                    <div class="mt-10 w-full max-w-sm space-y-3">
                        <div class="flex items-center gap-4 rounded-xl border border-[#043234] bg-[#000D0E]/40 p-4 text-slate-200">
                            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#043234] text-[#04E6E6]">
                                <LuWallet class="h-5 w-5" />
                            </span>
                            <div class="min-w-0 text-left">
                                <div class="text-sm font-semibold text-white">{t('register.features.wallet.title')}</div>
                                <div class="text-xs text-slate-400">{t('register.features.wallet.desc')}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-4 rounded-xl border border-[#043234] bg-[#000D0E]/40 p-4 text-slate-200">
                            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#043234] text-[#04E6E6]">
                                <LuShield class="h-5 w-5" />
                            </span>
                            <div class="min-w-0 text-left">
                                <div class="text-sm font-semibold text-white">{t('register.features.security.title')}</div>
                                <div class="text-xs text-slate-400">{t('register.features.security.desc')}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-4 rounded-xl border border-[#043234] bg-[#000D0E]/40 p-4 text-slate-200">
                            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#043234] text-[#04E6E6]">
                                <LuSparkles class="h-5 w-5" />
                            </span>
                            <div class="min-w-0 text-left">
                                <div class="text-sm font-semibold text-white">{t('register.features.extensions.title')}</div>
                                <div class="text-xs text-slate-400">{t('register.features.extensions.desc')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div class="order-1 flex w-full items-center justify-center lg:order-2 lg:w-1/2 lg:pr-8 xl:pr-12">
                <div class="w-full max-w-md rounded-2xl border border-[#043234] bg-[#001a1c]/85 p-6 shadow-xl shadow-black/40 backdrop-blur-md sm:p-8">
                    <div class="mb-8 flex items-center justify-center gap-2 lg:hidden">
                        <div class="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#04E6E6] to-teal-600 shadow-md shadow-[#04E6E6]/20">
                            <LuRadar class="h-6 w-6 text-[#001a1c]" />
                        </div>
                        <span class="text-xl font-bold text-white">Crypto Helper</span>
                    </div>

                    <div class="mb-8 text-center">
                        <h2 class="text-2xl font-bold text-white sm:text-3xl">
                            {t('register.form.title')}
                        </h2>
                        <p class="mt-2 text-sm text-slate-400 sm:text-base">
                            {t('register.form.subtitle')}
                        </p>
                    </div>

                    <form class="space-y-5" preventdefault:submit onSubmit$={handleSubmit}>
                        <div>
                            <label for="name" class={labelClass}>
                                {t('register.form.name')}
                            </label>
                            <div class="relative">
                                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <LuUser class="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    class={inputClass}
                                    placeholder={t('register.form.namePlaceholder')}
                                    value={name.value}
                                    onInput$={(e) => name.value = (e.target as HTMLInputElement).value}
                                />
                            </div>
                        </div>

                        <div>
                            <label for="email" class={labelClass}>
                                {t('register.form.email')}
                            </label>
                            <div class="relative">
                                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <LuMail class="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autocomplete="email"
                                    required
                                    class={inputClass}
                                    placeholder={t('register.form.emailPlaceholder')}
                                    value={email.value}
                                    onInput$={(e) => email.value = (e.target as HTMLInputElement).value}
                                />
                            </div>
                        </div>

                        <div>
                            <label for="password" class={labelClass}>
                                {t('register.form.password')}
                            </label>
                            <div class="relative">
                                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <LuLock class="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword.value ? 'text' : 'password'}
                                    autocomplete="new-password"
                                    required
                                    minLength={8}
                                    class={passwordInputClass}
                                    placeholder={t('register.form.passwordPlaceholder')}
                                    value={password.value}
                                    onInput$={(e) => password.value = (e.target as HTMLInputElement).value}
                                />
                                <button
                                    type="button"
                                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition hover:text-[#04E6E6]"
                                    onClick$={() => { showPassword.value = !showPassword.value; }}
                                    aria-label={showPassword.value ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword.value ? (
                                        <LuEyeOff class="h-5 w-5" />
                                    ) : (
                                        <LuEye class="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            <p class="mt-1.5 text-xs text-slate-500">{t('register.form.minChars')}</p>
                        </div>

                        {formError.value && (
                            <div class="rounded-xl border border-red-500/35 bg-red-950/35 p-4">
                                <div class="flex items-center gap-2 text-sm text-red-300">
                                    <svg class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                    </svg>
                                    {formError.value}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading.value}
                            class="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#04E6E6] py-3.5 px-6 text-sm font-semibold text-[#001a1c] shadow-lg shadow-[#04E6E6]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading.value ? (
                                <>
                                    <LuLoader2 class="h-5 w-5 animate-spin" />
                                    <span>{t('register.form.submitting')}</span>
                                </>
                            ) : (
                                <>
                                    <LuSparkles class="h-5 w-5" />
                                    <span>{t('register.form.submit')}</span>
                                    <LuArrowRight class="h-5 w-5 transition group-hover:translate-x-0.5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div class="relative my-8">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-[#043234]" />
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="bg-[#001a1c] px-4 text-slate-500">
                                {t('register.form.hasAccount')}
                            </span>
                        </div>
                    </div>

                    <Link
                        href={`/${localeFromPathname(location.url.pathname, location.params.locale)}/login/`}
                        class="group flex w-full items-center justify-center gap-2 rounded-xl border border-[#043234] bg-[#000D0E]/40 py-3.5 px-6 text-sm font-semibold text-slate-200 transition hover:border-[#04E6E6]/40 hover:text-white"
                    >
                        <span>{t('register.form.signIn')}</span>
                        <LuArrowRight class="h-5 w-5 transition group-hover:translate-x-0.5" />
                    </Link>

                    <p class="mt-8 text-center text-xs text-slate-500">
                        {t('register.form.terms')}{' '}
                        <a href="#" class="text-[#04E6E6] hover:underline">{t('register.form.termsLink')}</a>
                        {' '}{t('register.form.and')}{' '}
                        <a href="#" class="text-[#04E6E6] hover:underline">{t('register.form.privacyLink')}</a>
                    </p>
                </div>
            </div>
        </div>
    );
});
