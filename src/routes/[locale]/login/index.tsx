import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { inlineTranslate } from 'qwik-speak';
import {
    loginUser,
    completeMetamaskSignup,
} from '~/server/auth-actions';
import { useWallet } from '~/hooks/useWallet';
import {
    getSafeNextPath,
    hasClientSessionMarker,
    localeFromPathname,
    runWalletSiweLogin,
} from '~/utils/wallet-siwe-login';
import { LuMail, LuLock, LuLoader2, LuArrowRight, LuWallet, LuRadar, LuSparkles, LuEye, LuEyeOff } from '@qwikest/icons/lucide';

export default component$(() => {
    const t = inlineTranslate();
    const location = useLocation();
    const { wallet } = useWallet();

    const email = useSignal('');
    const password = useSignal('');
    const formError = useSignal('');
    const loading = useSignal(false);
    const metaMaskLoading = useSignal(false);
    const showPassword = useSignal(false);
    const metamaskEmailStep = useSignal(false);
    const pendingWalletForEmail = useSignal('');
    const metamaskSignupEmail = useSignal('');
    const metamaskEmailLoading = useSignal(false);
    const autoSiweStarted = useSignal(false);

    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track }) => {
        track(() => location.url.href);
        track(() => wallet.connected);
        track(() => wallet.address);

        const url = new URL(location.url.href);
        if (url.searchParams.get('session') !== 'required') return;

        const locale = localeFromPathname(location.url.pathname, location.params.locale);

        if (hasClientSessionMarker()) {
            window.location.replace(getSafeNextPath(url.searchParams, locale));
            return;
        }

        if (!wallet.connected || !wallet.address) return;
        if (autoSiweStarted.value) return;

        autoSiweStarted.value = true;
        metaMaskLoading.value = true;
        formError.value = '';

        void (async () => {
            try {
                const out = await runWalletSiweLogin();
                if (out.kind === 'needs_email') {
                    pendingWalletForEmail.value = out.address;
                    metamaskSignupEmail.value = '';
                    metamaskEmailStep.value = true;
                    return;
                }
                if (out.kind === 'fail') {
                    formError.value = out.message;
                    autoSiweStarted.value = false;
                    return;
                }
                if (out.kind === 'no_ethereum') {
                    formError.value = 'MetaMask not found';
                    autoSiweStarted.value = false;
                    return;
                }
                if (typeof window !== 'undefined') {
                    localStorage.setItem('knrt_wallet_type', 'metamask');
                    localStorage.removeItem('knrt_managed_wallet');
                }
                window.location.href = getSafeNextPath(url.searchParams, locale);
            } catch (e: any) {
                formError.value = e?.message || 'MetaMask sign-in failed';
                autoSiweStarted.value = false;
            } finally {
                metaMaskLoading.value = false;
            }
        })();
    });

    const handleSubmit = $(async (e: Event) => {
        e.preventDefault();
        loading.value = true;
        formError.value = '';

        try {
            const res = await loginUser({
                email: email.value,
                password: password.value
            });

            if (!res.success) {
                throw new Error(res.message || 'Invalid credentials');
            }

            if (res.user?.walletAddress) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('knrt_managed_wallet', res.user.walletAddress);
                    localStorage.setItem('knrt_wallet_type', 'managed');
                }
            }

            const locale = localeFromPathname(location.url.pathname, location.params.locale);
            const sp = new URL(location.url.href).searchParams;
            window.location.href = getSafeNextPath(sp, locale);

        } catch (err: any) {
            formError.value = err.message;
        } finally {
            loading.value = false;
        }
    });

    const handleMetaMask = $(async () => {
        metaMaskLoading.value = true;
        formError.value = '';
        try {
            const out = await runWalletSiweLogin();
            if (out.kind === 'needs_email') {
                pendingWalletForEmail.value = out.address;
                metamaskSignupEmail.value = '';
                metamaskEmailStep.value = true;
                return;
            }
            if (out.kind === 'fail') throw new Error(out.message);
            if (out.kind === 'no_ethereum') {
                formError.value = 'MetaMask not found';
                return;
            }
            if (typeof window !== 'undefined') {
                localStorage.setItem('knrt_wallet_type', 'metamask');
                localStorage.removeItem('knrt_managed_wallet');
            }
            const locale = localeFromPathname(location.url.pathname, location.params.locale);
            const sp = new URL(location.url.href).searchParams;
            window.location.href = getSafeNextPath(sp, locale);
        } catch (e: any) {
            formError.value = e?.message || 'MetaMask sign-in failed';
        } finally {
            metaMaskLoading.value = false;
        }
    });

    const handleCompleteMetamaskEmail = $(async () => {
        metamaskEmailLoading.value = true;
        formError.value = '';
        try {
            const res = await completeMetamaskSignup({
                address: pendingWalletForEmail.value,
                email: metamaskSignupEmail.value.trim(),
            });
            if (!res.success) throw new Error(res.message || 'Could not save email');
            if (typeof window !== 'undefined') {
                localStorage.setItem('knrt_wallet_type', 'metamask');
                localStorage.removeItem('knrt_managed_wallet');
            }
            const locale = localeFromPathname(location.url.pathname, location.params.locale);
            const sp = new URL(location.url.href).searchParams;
            window.location.href = getSafeNextPath(sp, locale);
        } catch (e: any) {
            formError.value = e?.message || 'Error';
        } finally {
            metamaskEmailLoading.value = false;
        }
    });

    const cancelMetamaskEmailStep = $(() => {
        metamaskEmailStep.value = false;
        pendingWalletForEmail.value = '';
        metamaskSignupEmail.value = '';
        formError.value = '';
    });

    const inputClass =
        'block w-full rounded-xl border border-[#043234] bg-[#000D0E]/70 py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 transition focus:border-[#04E6E6]/50 focus:outline-none focus:ring-2 focus:ring-[#04E6E6]/35';
    const passwordInputClass =
        'block w-full rounded-xl border border-[#043234] bg-[#000D0E]/70 py-3.5 pl-12 pr-12 text-white placeholder:text-slate-500 transition focus:border-[#04E6E6]/50 focus:outline-none focus:ring-2 focus:ring-[#04E6E6]/35';
    const labelClass = 'mb-2 block text-sm font-medium text-slate-400';

    return (
        <div class="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:flex lg:min-h-[min(100vh-12rem,900px)] lg:items-stretch lg:px-8 lg:py-12">
            {/* Branding — matches home / layout */}
            <div class="relative hidden overflow-hidden border-[#043234] lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:rounded-2xl lg:border lg:bg-[#001a1c]/50 lg:backdrop-blur-sm">
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
                    <div class="mb-2 inline-flex items-center gap-2 rounded-full border border-[#043234] bg-[#000D0E]/60 px-3 py-1 text-xs text-[#04E6E6]/90">
                        <LuSparkles class="h-3.5 w-3.5" />
                        Crypto Helper
                    </div>
                    <h1 class="mt-4 text-center text-3xl font-bold text-white lg:text-4xl">
                        {t('login.title')}
                    </h1>
                    <p class="mt-4 max-w-md text-center text-base text-slate-400">
                        {t('login.subtitle')}
                    </p>
                    <div class="mt-10 w-full max-w-sm space-y-3">
                        <div class="flex items-center gap-3 rounded-xl border border-[#043234] bg-[#000D0E]/40 px-4 py-3 text-slate-300">
                            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#043234] text-[#04E6E6]">
                                <LuWallet class="h-5 w-5" />
                            </span>
                            <span class="text-sm">{t('login.features.wallet')}</span>
                        </div>
                        <div class="flex items-center gap-3 rounded-xl border border-[#043234] bg-[#000D0E]/40 px-4 py-3 text-slate-300">
                            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#043234] text-[#04E6E6]">
                                <LuSparkles class="h-5 w-5" />
                            </span>
                            <span class="text-sm">{t('login.features.trade')}</span>
                        </div>
                        <div class="flex items-center gap-3 rounded-xl border border-[#043234] bg-[#000D0E]/40 px-4 py-3 text-slate-300">
                            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#043234] text-[#04E6E6]">
                                <LuLock class="h-5 w-5" />
                            </span>
                            <span class="text-sm">{t('login.features.security')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div class="flex w-full items-center justify-center lg:w-1/2 lg:pl-8 xl:pl-12">
                <div class="w-full max-w-md rounded-2xl border border-[#043234] bg-[#001a1c]/85 p-6 shadow-xl shadow-black/40 backdrop-blur-md sm:p-8">
                    <div class="mb-8 flex items-center justify-center gap-2 lg:hidden">
                        <div class="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#04E6E6] to-teal-600 shadow-md shadow-[#04E6E6]/20">
                            <LuRadar class="h-6 w-6 text-[#001a1c]" />
                        </div>
                        <span class="text-xl font-bold text-white">Crypto Helper</span>
                    </div>

                    <div class="mb-8 text-center">
                        <h2 class="text-2xl font-bold text-white sm:text-3xl">
                            {metamaskEmailStep.value ? t('login.form.metamaskEmailTitle') : t('login.form.title')}
                        </h2>
                        <p class="mt-2 text-sm text-slate-400 sm:text-base">
                            {metamaskEmailStep.value
                                ? t('login.form.metamaskEmailSubtitle')
                                : t('login.form.subtitle')}
                        </p>
                    </div>

                    {metamaskEmailStep.value ? (
                        <div class="space-y-5">
                            {formError.value && (
                                <div class="rounded-xl border border-red-500/35 bg-red-950/35 p-4">
                                    <div class="flex items-center gap-2 text-sm text-red-300">
                                        <svg class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path
                                                fill-rule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                clip-rule="evenodd"
                                            />
                                        </svg>
                                        {formError.value}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label for="metamask-email" class={labelClass}>
                                    {t('login.form.email')}
                                </label>
                                <div class="relative">
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                        <LuMail class="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        id="metamask-email"
                                        name="metamask-email"
                                        type="email"
                                        autocomplete="email"
                                        required
                                        class={inputClass}
                                        placeholder={t('login.form.emailPlaceholder')}
                                        value={metamaskSignupEmail.value}
                                        onInput$={(e) =>
                                            (metamaskSignupEmail.value = (e.target as HTMLInputElement).value)
                                        }
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick$={handleCompleteMetamaskEmail}
                                disabled={metamaskEmailLoading.value}
                                class="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#04E6E6] py-3.5 px-6 text-sm font-semibold text-[#001a1c] shadow-lg shadow-[#04E6E6]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {metamaskEmailLoading.value ? (
                                    <>
                                        <LuLoader2 class="h-5 w-5 animate-spin" />
                                        <span>{t('login.form.metamaskEmailSubmitting')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{t('login.form.metamaskEmailSubmit')}</span>
                                        <LuArrowRight class="h-5 w-5 transition group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick$={cancelMetamaskEmailStep}
                                class="w-full rounded-xl border border-[#043234] py-3 text-sm font-medium text-slate-400 transition hover:border-[#04E6E6]/40 hover:text-white"
                            >
                                {t('login.form.metamaskEmailBack')}
                            </button>
                        </div>
                    ) : null}

                    {!metamaskEmailStep.value ? (
                    <form class="space-y-5" preventdefault:submit onSubmit$={handleSubmit}>
                        <div>
                            <label for="email" class={labelClass}>
                                {t('login.form.email')}
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
                                    placeholder={t('login.form.emailPlaceholder')}
                                    value={email.value}
                                    onInput$={(e) => email.value = (e.target as HTMLInputElement).value}
                                />
                            </div>
                        </div>

                        <div>
                            <label for="password" class={labelClass}>
                                {t('login.form.password')}
                            </label>
                            <div class="relative">
                                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <LuLock class="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword.value ? 'text' : 'password'}
                                    autocomplete="current-password"
                                    required
                                    class={passwordInputClass}
                                    placeholder={t('login.form.passwordPlaceholder')}
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
                                    <span>{t('login.form.submitting')}</span>
                                </>
                            ) : (
                                <>
                                    <span>{t('login.form.submit')}</span>
                                    <LuArrowRight class="h-5 w-5 transition group-hover:translate-x-0.5" />
                                </>
                            )}
                        </button>
                    </form>
                    ) : null}

                    {!metamaskEmailStep.value ? (
                    <button
                        type="button"
                        onClick$={handleMetaMask}
                        disabled={metaMaskLoading.value}
                        class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#043234] bg-[#000D0E]/50 py-3 px-6 text-sm font-semibold text-[#04E6E6] transition hover:border-[#04E6E6]/50 hover:bg-[#04E6E6]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {metaMaskLoading.value ? t('login.form.submitting') : 'Continue with MetaMask'}
                    </button>
                    ) : null}

                    {!metamaskEmailStep.value ? (
 <>
                            <div class="relative my-8">
                                <div class="absolute inset-0 flex items-center">
                                    <div class="w-full border-t border-[#043234]" />
                                </div>
                                <div class="relative flex justify-center text-sm">
                                    <span class="bg-[#001a1c] px-4 text-slate-500">
                                        {t('login.form.noAccount')}
                                    </span>
                                </div>
                            </div>

                            <Link
                                href={`/${localeFromPathname(location.url.pathname, location.params.locale)}/register/`}
                                class="group flex w-full items-center justify-center gap-2 rounded-xl border border-[#043234] bg-[#000D0E]/40 py-3.5 px-6 text-sm font-semibold text-slate-200 transition hover:border-[#04E6E6]/40 hover:text-white"
                            >
                                <span>{t('login.form.createAccount')}</span>
                                <LuArrowRight class="h-5 w-5 transition group-hover:translate-x-0.5" />
                            </Link>

                            <p class="mt-8 text-center text-xs text-slate-500">
                                {t('login.form.terms')}{' '}
                                <a href="#" class="text-[#04E6E6] hover:underline">{t('login.form.termsLink')}</a>
                                {' '}{t('login.form.and')}{' '}
                                <a href="#" class="text-[#04E6E6] hover:underline">{t('login.form.privacyLink')}</a>
                            </p>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
});
