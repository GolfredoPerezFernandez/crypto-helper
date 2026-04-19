import { component$, useSignal, useTask$, $ } from '@builder.io/qwik';
import { inlineTranslate, useSpeak } from 'qwik-speak';
import { Link, useLocation } from '@builder.io/qwik-city';
import { LuPlus, LuSettings2, LuSparkles, LuLoader2, LuRefreshCw, LuCopy } from '@qwikest/icons/lucide';
import { useLiquidityManager } from '~/hooks/useLiquidityManager';
import { useWallet } from '~/hooks/useWallet';

export default component$(() => {
  useSpeak({ runtimeAssets: ['positions'] });
  const t = inlineTranslate();
  const L = useLocation().params.locale || 'en-us';
  const positionsBase = `/${L}/positions`;

  const { getAllPositions } = useLiquidityManager();
  const { wallet } = useWallet();
  const positions = useSignal<any[]>([]);
  const isLoading = useSignal(false);

  const copyToClipboard = $((text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  });

  const fetchPositions = $(async () => {
    if (!wallet.address) {
      positions.value = [];
      return;
    }

    isLoading.value = true;
    try {
      const pos = await getAllPositions();
      positions.value = pos;
    } catch (e) {
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  });

  useTask$(async ({ track }) => {
    track(() => wallet.address);
    await fetchPositions();
  });

  return (
    <div class="bg-gray-50 min-h-screen text-gray-900 py-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Hero / Summary */}
        <section class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-sm text-gray-500">{t('positions.subtitle')}</p>
              <h1 class="text-4xl sm:text-5xl font-semibold tracking-tight">{t('positions.title')}</h1>
              {wallet.address && (
                <p class="text-xs text-gray-400 mt-2 font-mono flex items-center gap-2">
                  {t('positions.wallet')}{wallet.address}
                  <button
                    onClick$={() => copyToClipboard(wallet.address!)}
                    class="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                    title="Copy address"
                  >
                    <LuCopy class="w-3 h-3" />
                  </button>
                </p>
              )}
            </div>
            <div class="flex items-center gap-3">
              <button
                onClick$={fetchPositions}
                class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium hover:bg-gray-50 transition"
                disabled={isLoading.value}
              >
                <LuRefreshCw class={`w-4 h-4 text-gray-500 ${isLoading.value ? 'animate-spin' : ''}`} />
                {t('positions.refresh')}
              </button>
              <button class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium">
                <LuSettings2 class="w-4 h-4 text-gray-500" />
                {t('positions.manageAlerts')}
              </button>
              <Link
                href={`${positionsBase}/new/`}
                class="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gray-900 text-white text-sm font-semibold shadow"
              >
                <LuPlus class="w-4 h-4" />
                {t('positions.newPosition')}
              </Link>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span class="px-3 py-1 rounded-full bg-white border border-gray-200">{t('positions.tag')}</span>
          </div>
        </section>

        {isLoading.value ? (
          <div class="flex justify-center py-12">
            <LuLoader2 class="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : positions.value.length > 0 ? (
          <div class="space-y-8">
            {/* Warning if showing positions not owned by connected wallet */}
            {positions.value.some(p => !p.isOwner) && (
              <div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
                <div class="text-yellow-600 mt-0.5">
                  <LuSettings2 class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-yellow-900">{t('positions.warning.title')}</h3>
                  <div class="text-sm text-yellow-800 mt-1">
                    {t('positions.warning.desc')}
                    <div class="flex items-center gap-2 font-mono bg-yellow-100/50 px-2 py-1 rounded my-1 w-fit">
                      <strong>{positions.value.find(p => !p.isOwner)?.owner.slice(0, 6)}...{positions.value.find(p => !p.isOwner)?.owner.slice(-4)}</strong>
                      <button
                        onClick$={() => copyToClipboard(positions.value.find(p => !p.isOwner)?.owner || '')}
                        class="text-yellow-700 hover:text-yellow-900"
                        title="Copy owner address"
                      >
                        <LuCopy class="w-3 h-3" />
                      </button>
                    </div>
                    {t('positions.warning.connected')}
                    <div class="flex items-center gap-2 font-mono bg-yellow-100/50 px-2 py-1 rounded my-1 w-fit">
                      <strong>{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</strong>
                      <button
                        onClick$={() => copyToClipboard(wallet.address || '')}
                        class="text-yellow-700 hover:text-yellow-900"
                        title="Copy connected address"
                      >
                        <LuCopy class="w-3 h-3" />
                      </button>
                    </div>
                    {t('positions.warning.resolution')}
                  </div>
                </div>
              </div>
            )}

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {positions.value.map((pos) => (
                <div key={pos.tokenId} class={`bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition relative overflow-hidden ${pos.isOwner ? 'border-gray-200' : 'border-blue-200'}`}>
                  {!pos.isOwner && (
                    <div class="absolute top-0 right-0 bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded-bl-lg font-mono font-medium">
                      {t('positions.card.smartWallet')} {pos.owner.slice(0, 6)}...{pos.owner.slice(-4)}
                    </div>
                  )}
                  <div class="flex justify-between items-start mb-4 mt-2">
                    <div class="flex items-center gap-2">
                      <div class="flex -space-x-2">
                        <div class="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs overflow-hidden" title={pos.token0}>
                          {pos.token0.slice(2, 4)}
                        </div>
                        <div class="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs overflow-hidden" title={pos.token1}>
                          {pos.token1.slice(2, 4)}
                        </div>
                      </div>
                      <span class="font-semibold">{t('positions.card.position').replace('{id}', pos.tokenId)}</span>
                    </div>
                    {pos.isOwner && <span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">{t('positions.card.active')}</span>}
                  </div>
                  <div class="space-y-2 mb-6">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">{t('positions.card.liquidity')}</span>
                      <span class="font-mono">{pos.liquidity}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">{t('positions.card.token0')}</span>
                      <span class="font-mono text-xs">{pos.token0.slice(0, 6)}...</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">{t('positions.card.token1')}</span>
                      <span class="font-mono text-xs">{pos.token1.slice(0, 6)}...</span>
                    </div>
                  </div>
                  <Link href={`/positions/${pos.tokenId}`} class="block w-full py-2 text-center rounded-xl bg-gray-50 text-sm font-medium hover:bg-gray-100">
                    {t('positions.card.viewDetails')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty state */
          <section class="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p class="text-sm text-gray-500 mb-2">{t('positions.empty.title')}</p>
                <h2 class="text-2xl font-semibold mb-3">{t('positions.empty.subtitle')}</h2>
                <p class="text-gray-600 max-w-2xl">
                  {t('positions.empty.desc')}
                </p>
                {/* Debug info for user confusion */}
                <div class="mt-4 p-4 bg-blue-50 rounded-xl text-xs text-blue-800 font-mono">
                  <p><strong>{t('positions.empty.debugInfo')}</strong></p>
                  <p>{t('positions.empty.debugConnected')} {wallet.address}</p>
                  <p>{t('positions.empty.debugResolution')}</p>
                </div>
              </div>
              <div class="flex flex-col gap-3 w-full sm:w-auto">
                <button class="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#c1272d] to-[#d13238] text-white text-sm font-semibold shadow">
                  {t('positions.empty.explorePools')}
                </button>
                <Link
                  href={`${positionsBase}/new/`}
                  class="px-5 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50 text-center"
                >
                  {t('positions.empty.newPosition')}
                </Link>
              </div>
            </div>
          </section>
        )}


      </div>
    </div>
  );
});
