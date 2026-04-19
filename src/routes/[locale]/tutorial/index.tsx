import { component$, useStyles$ } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import {
    LuWallet,
    LuFilePlus,
    LuLayoutGrid,
    LuArrowLeftRight,
    LuSparkles,
    LuCpu,
    LuImage,
    LuMap,
    LuBuilding2,
    LuLayers,
    LuBookOpen,
    LuCheckCircle,
} from '@qwikest/icons/lucide';
import { inlineTranslate, useSpeak } from 'qwik-speak';

export default component$(() => {
    useSpeak({ runtimeAssets: ['tutorial'] });
    const t = inlineTranslate();
    const L = useLocation().params.locale || 'en-us';
    const base = `/${L}`;

    useStyles$(`
    .step-card {
      transition: all 0.3s ease;
    }
    .step-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }
  `);

    const steps = [
        {
            icon: LuWallet,
            title: t('tutorial.steps.step1.title'),
            description: t('tutorial.steps.step1.desc'),
            color: 'bg-blue-100 text-blue-600',
        },
        {
            icon: LuFilePlus,
            title: t('tutorial.steps.step2.title'),
            description: t('tutorial.steps.step2.desc'),
            color: 'bg-green-100 text-green-600',
        },
        {
            icon: LuLayoutGrid,
            title: t('tutorial.steps.step3.title'),
            description: t('tutorial.steps.step3.desc'),
            color: 'bg-purple-100 text-purple-600',
        },
    ];

    const templates = [
        {
            id: 'iot-sensor',
            name: t('tutorial.templates.list.iot.name'),
            description: t('tutorial.templates.list.iot.desc'),
            icon: LuCpu,
            accent: 'from-[#0ea5e9] to-[#2563eb]',
            tag: t('tutorial.templates.list.iot.tag'),
        },
        {
            id: 'map-cells',
            name: t('tutorial.templates.list.cells.name'),
            description: t('tutorial.templates.list.cells.desc'),
            icon: LuImage,
            accent: 'from-[#ec4899] to-[#db2777]',
            tag: t('tutorial.templates.list.cells.tag'),
        },
        {
            id: 'map-google',
            name: t('tutorial.templates.list.map.name'),
            description: t('tutorial.templates.list.map.desc'),
            icon: LuMap,
            accent: 'from-[#10b981] to-[#059669]',
            tag: t('tutorial.templates.list.map.tag'),
        },
        {
            id: 'realestate-basic',
            name: t('tutorial.templates.list.basic.name'),
            description: t('tutorial.templates.list.basic.desc'),
            icon: LuBuilding2,
            accent: 'from-[#a855f7] to-[#7c3aed]',
            tag: t('tutorial.templates.list.basic.tag'),
        },
        {
            id: 'realestate-premium',
            name: t('tutorial.templates.list.premium.name'),
            description: t('tutorial.templates.list.premium.desc'),
            icon: LuLayers,
            accent: 'from-[#facc15] to-[#f97316]',
            tag: t('tutorial.templates.list.premium.tag'),
        },
        {
            id: 'membership',
            name: t('tutorial.templates.list.membership.name'),
            description: t('tutorial.templates.list.membership.desc'),
            icon: LuSparkles,
            accent: 'from-[#f97316] to-[#fb7185]',
            tag: t('tutorial.templates.list.membership.tag'),
        },
    ];

    return (
        <div class="min-h-screen bg-gray-50 flex flex-col">
            {/* Hero Section */}
            <div class="relative bg-white border-b border-gray-200 overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-gray-50 to-white z-0" />
                <div class="absolute inset-0 opacity-30 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />

                <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
                        <LuBookOpen class="w-4 h-4" />
                        <span>{t('tutorial.hero.badge')}</span>
                    </div>
                    <h1 class="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
                        {t('tutorial.hero.title')}
                    </h1>
                    <p class="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                        {t('tutorial.hero.subtitle')}
                    </p>
                    <div class="flex gap-4 justify-center">
                        <Link
                            href={`${base}/mint/`}
                            class="px-8 py-3 rounded-xl bg-[#c1272d] text-white font-semibold hover:bg-[#a91f23] transition-colors shadow-lg shadow-red-200"
                        >
                            {t('tutorial.hero.ctaMint')}
                        </Link>
                        <Link
                            href={`${base}/marketplace/`}
                            class="px-8 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                        >
                            {t('tutorial.hero.ctaMarket')}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Steps Section */}
            <div class="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-3xl font-bold text-gray-900 mb-4">{t('tutorial.steps.title')}</h2>
                    <p class="text-gray-600 max-w-2xl mx-auto">
                        {t('tutorial.steps.subtitle')}
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, i) => (
                        <div key={i} class="step-card bg-white rounded-2xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                            <div class={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mb-6`}>
                                <step.icon class="w-7 h-7" />
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                            <p class="text-gray-600 leading-relaxed">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Templates Section */}
            <div class="py-20 bg-white border-t border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="text-center mb-16">
                        <h2 class="text-3xl font-bold text-gray-900 mb-4">{t('tutorial.templates.title')}</h2>
                        <p class="text-gray-600 max-w-2xl mx-auto">
                            {t('tutorial.templates.subtitle')}
                        </p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((tpl) => (
                            <div key={tpl.id} class="group relative bg-gray-50 rounded-2xl border border-gray-200 p-6 hover:bg-white hover:shadow-xl transition-all duration-300">
                                <div class={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                    <tpl.icon class="w-24 h-24 text-gray-900" />
                                </div>

                                <div class="relative z-10">
                                    <div class={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white mb-4 bg-gradient-to-r ${tpl.accent}`}>
                                        {tpl.tag}
                                    </div>

                                    <h3 class="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <tpl.icon class="w-5 h-5 text-gray-700" />
                                        {tpl.name}
                                    </h3>

                                    <p class="text-gray-600 text-sm mb-6 min-h-[40px]">
                                        {tpl.description}
                                    </p>

                                    <ul class="space-y-2 mb-6 text-sm text-gray-500">
                                        <li class="flex items-center gap-2">
                                            <LuCheckCircle class="w-4 h-4 text-green-500" /> {t('tutorial.templates.features.erc721')}
                                        </li>
                                        <li class="flex items-center gap-2">
                                            <LuCheckCircle class="w-4 h-4 text-green-500" /> {t('tutorial.templates.features.metadata')}
                                        </li>
                                    </ul>

                                    <Link
                                        href={`${base}/mint/?template=${tpl.id}`}
                                        class="block w-full text-center py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:border-[#c1272d] hover:text-[#c1272d] hover:bg-red-50 transition-colors"
                                    >
                                        {t('tutorial.templates.useTemplate')}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div class="bg-[#1a1a1a] text-white py-20 border-t border-gray-800">
                <div class="max-w-4xl mx-auto px-4 text-center">
                    <h2 class="text-3xl font-bold mb-6">{t('tutorial.cta.title')}</h2>
                    <p class="text-gray-400 mb-8 text-lg">
                        {t('tutorial.cta.subtitle')}
                    </p>
                    <Link
                        href={`${base}/mint/`}
                        class="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-[#c1272d] to-[#ff7a45] font-bold text-lg hover:shadow-[0_0_20px_rgba(193,39,45,0.5)] transition-shadow"
                    >
                        {t('tutorial.cta.button')}
                    </Link>
                </div>
            </div>
        </div>
    );
});
