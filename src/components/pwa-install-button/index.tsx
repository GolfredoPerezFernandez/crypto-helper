import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { LuDownload } from "@qwikest/icons/lucide";

/** True when the app runs as an installed PWA (no install promo needed). */
export const useIsStandalone = () => {
  const isStandalone = useSignal(true);
  useVisibleTask$(() => {
    isStandalone.value =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone ===
        true);
  });
  return isStandalone;
};

export const PWAInstallButton = component$(() => {
  const showButton = useSignal(false);
  const deferredPrompt = useSignal<InstallPromptEvent | null>(null);
  const isIOS = useSignal(false);
  const isStandalone = useSignal(false);
  const showIOSGuide = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    isIOS.value = iosDevice;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);
    isStandalone.value = !!standalone;

    if (iosDevice && !standalone) {
      showButton.value = true;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const bip = e as InstallPromptEvent;
      deferredPrompt.value = bip;
      (window as unknown as { deferredPWAInstallPrompt?: InstallPromptEvent }).deferredPWAInstallPrompt =
        bip;
      showButton.value = true;
    };

    window.addEventListener("beforeinstallprompt", handler);

    cleanup(() => {
      window.removeEventListener("beforeinstallprompt", handler);
    });
  });

  const handleInstallClick = $(async () => {
    if (isIOS.value && !isStandalone.value) {
      showIOSGuide.value = true;
      return;
    }

    const w = window as unknown as { deferredPWAInstallPrompt?: InstallPromptEvent };
    const promptEvent = deferredPrompt.value || w.deferredPWAInstallPrompt;

    if (!promptEvent || typeof promptEvent.prompt !== "function") {
      window.alert(
        "Tu navegador ya tiene la app instalada o no muestra instalación automática. Busca «Instalar app» o «Añadir a la pantalla de inicio» en el menú del navegador.",
      );
      return;
    }

    promptEvent.prompt();
    await promptEvent.userChoice;
    deferredPrompt.value = null;
    w.deferredPWAInstallPrompt = undefined;
    showButton.value = false;
  });

  if (!showButton.value || isStandalone.value) return null;

  return (
    <>
      <button
        id="cg-pwa-install-trigger"
        type="button"
        onClick$={handleInstallClick}
        class="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full border border-[#043234] bg-[#001a1c] px-5 py-3 text-sm font-bold text-[#04E6E6] shadow-lg shadow-black/40 transition hover:scale-[1.03] hover:border-[#04E6E6]/50 active:scale-95"
      >
        <LuDownload class="h-5 w-5" />
        <span>Instalar app</span>
      </button>

      {showIOSGuide.value ? (
        <div class="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div class="relative w-full max-w-sm rounded-2xl border border-[#043234] bg-[#001a1c] p-6 shadow-2xl">
            <button
              type="button"
              onClick$={() => {
                showIOSGuide.value = false;
              }}
              class="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-[#043234] hover:text-white"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div class="mb-6 text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#043234]">
                <LuDownload class="h-8 w-8 text-[#04E6E6]" />
              </div>
              <h3 class="text-xl font-bold text-white">Instalar Crypto Helper</h3>
              <p class="mt-2 text-sm text-slate-400">
                Añade la app al inicio para pantalla completa, icono propio y notificaciones push (iOS 16.4+).
              </p>
            </div>

            <div class="space-y-4 rounded-xl border border-[#043234] bg-[#000D0E]/80 p-4">
              <div class="flex gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#043234] text-xs font-bold text-[#04E6E6]">
                  1
                </div>
                <p class="text-sm text-slate-300">
                  En Safari, toca <b class="text-white">Compartir</b> en la barra inferior.
                </p>
              </div>
              <div class="flex gap-4">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#043234] text-xs font-bold text-[#04E6E6]">
                  2
                </div>
                <p class="text-sm text-slate-300">
                  Elige <b class="text-white">Añadir a la pantalla de inicio</b> y confirma.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick$={() => {
                showIOSGuide.value = false;
              }}
              class="mt-6 w-full rounded-xl bg-[#04E6E6] py-3 text-sm font-bold text-[#001a1c] transition hover:brightness-110"
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
});

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
