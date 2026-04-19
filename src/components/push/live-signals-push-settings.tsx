import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";

const sanitizeVapid = (v?: string) =>
  String(v || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/\s+/g, "");

const PUBLIC_VAPID_KEY = sanitizeVapid(import.meta.env.PUBLIC_VAPID_KEY);

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const LiveSignalsPushSettings = component$(() => {
  const ready = useSignal(false);
  const supported = useSignal(false);
  const subscribed = useSignal(false);
  const permission = useSignal<NotificationPermission>("default");
  const busy = useSignal(false);
  const err = useSignal<string | null>(null);
  const whale = useSignal(true);
  const trader = useSignal(true);
  const smart = useSignal(true);
  const price = useSignal(true);

  const postPrefs = $(async () => {
    const res = await fetch("/api/push/preferences/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pushWhaleAlerts: whale.value,
        pushTraderAlerts: trader.value,
        pushSmartAlerts: smart.value,
        pushPriceAlerts: price.value,
      }),
      credentials: "include",
    });
    if (!res.ok) err.value = "Could not save notification preferences.";
    else err.value = null;
  });

  const loadPrefs = $(async () => {
    const res = await fetch("/api/push/preferences/", { credentials: "include" });
    if (!res.ok) return;
    const j = (await res.json()) as {
      pushWhaleAlerts?: boolean;
      pushTraderAlerts?: boolean;
      pushSmartAlerts?: boolean;
      pushPriceAlerts?: boolean;
    };
    whale.value = j.pushWhaleAlerts !== false;
    trader.value = j.pushTraderAlerts !== false;
    smart.value = j.pushSmartAlerts !== false;
    price.value = j.pushPriceAlerts !== false;
  });

  const syncSubscriptionToServer = $(async () => {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg?.pushManager) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const res = await fetch("/api/push/subscribe/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
      credentials: "include",
    });
    if (!res.ok) err.value = "Could not sync push subscription.";
    subscribed.value = res.ok;
  });

  const subscribeDevice = $(async () => {
    err.value = null;
    if (!window.isSecureContext) {
      err.value = "Push requires HTTPS (or localhost).";
      return;
    }
    if (!PUBLIC_VAPID_KEY) {
      err.value = "PUBLIC_VAPID_KEY is not configured for this build.";
      return;
    }
    busy.value = true;
    try {
      let p = Notification.permission;
      if (p === "default") {
        p = await Notification.requestPermission();
      }
      permission.value = p;
      if (p !== "granted") {
        err.value =
          p === "denied"
            ? "Notifications blocked. Enable them in browser or device settings."
            : "Permission not granted.";
        busy.value = false;
        return;
      }

      const reg =
        (await navigator.serviceWorker.getRegistration("/")) ||
        (await navigator.serviceWorker.register("/service-worker.js", { scope: "/" }));
      await reg.update();
      const readyReg = await navigator.serviceWorker.ready;
      const sub = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });
      const res = await fetch("/api/push/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
        credentials: "include",
      });
      if (!res.ok) throw new Error("subscribe API failed");
      subscribed.value = true;
    } catch (e: any) {
      err.value = e?.message || "Subscribe failed.";
      subscribed.value = false;
    } finally {
      busy.value = false;
    }
  });

  const unsubscribeDevice = $(async () => {
    err.value = null;
    busy.value = true;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const ep = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: ep }),
          credentials: "include",
        });
      }
      subscribed.value = false;
    } catch (e: any) {
      err.value = e?.message || "Unsubscribe failed.";
    } finally {
      busy.value = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    supported.value =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    if (supported.value) {
      permission.value = Notification.permission;
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        subscribed.value = Boolean(sub);
        if (sub) void syncSubscriptionToServer();
      } catch {
        subscribed.value = false;
      }

      const onSwMsg = (ev: MessageEvent) => {
        if (ev.data?.type === "PUSH_SUBSCRIPTION_CHANGE") {
          void syncSubscriptionToServer();
        }
      };
      navigator.serviceWorker.addEventListener("message", onSwMsg);
      cleanup(() => navigator.serviceWorker.removeEventListener("message", onSwMsg));
    }
    await loadPrefs();
    ready.value = true;
  });

  const toggleWhale = $(async () => {
    whale.value = !whale.value;
    await postPrefs();
  });
  const toggleTrader = $(async () => {
    trader.value = !trader.value;
    await postPrefs();
  });
  const toggleSmart = $(async () => {
    smart.value = !smart.value;
    await postPrefs();
  });
  const togglePrice = $(async () => {
    price.value = !price.value;
    await postPrefs();
  });

  if (!ready.value) {
    return <p class="text-sm text-slate-500">Loading…</p>;
  }

  if (!supported.value) {
    return (
      <p class="text-sm text-amber-200/90">
        Push notifications are not supported in this browser. On iOS, install the app to the Home Screen (Safari → Share → Add to Home Screen) and open it from the icon; then try again.
      </p>
    );
  }

  return (
    <div class="space-y-6 max-w-lg">
      <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 space-y-3">
        <h3 class="text-sm font-semibold text-[#04E6E6]">Device</h3>
        <p class="text-xs text-slate-400">
          Enable push on this device to receive alerts when the app is in the background. Requires HTTPS in production.
        </p>
        {subscribed.value ? (
          <button
            type="button"
            class="rounded-lg border border-[#043234] px-3 py-2 text-sm text-slate-200 hover:bg-[#043234]/60 disabled:opacity-50"
            disabled={busy.value}
            onClick$={unsubscribeDevice}
          >
            {busy.value ? "Working…" : "Turn off push on this device"}
          </button>
        ) : (
          <button
            type="button"
            class="rounded-lg bg-[#04E6E6] text-[#001a1c] px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            disabled={busy.value}
            onClick$={subscribeDevice}
          >
            {busy.value ? "Working…" : "Enable push on this device"}
          </button>
        )}
        <p class="text-[10px] text-slate-500">
          Permission: {permission.value}
          {!PUBLIC_VAPID_KEY ? " · VAPID key missing in build" : ""}
        </p>
      </div>

      <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 space-y-3">
        <h3 class="text-sm font-semibold text-[#04E6E6]">Which signals?</h3>
        <p class="text-xs text-slate-400">
          These apply to your account on all devices where you enabled push.
        </p>
        <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
          <input
            type="checkbox"
            checked={whale.value}
            onChange$={toggleWhale}
            class="rounded border-[#043234]"
          />
          Whale alerts (SSE)
        </label>
        <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
          <input
            type="checkbox"
            checked={trader.value}
            onChange$={toggleTrader}
            class="rounded border-[#043234]"
          />
          Smart money / traders (SSE)
        </label>
        <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
          <input
            type="checkbox"
            checked={smart.value}
            onChange$={toggleSmart}
            class="rounded border-[#043234]"
          />
          USDT smart alerts
        </label>
        <label class="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
          <input
            type="checkbox"
            checked={price.value}
            onChange$={togglePrice}
            class="rounded border-[#043234]"
          />
          Pro price threshold alerts (after market sync)
        </label>
      </div>

      {err.value ? <p class="text-sm text-red-300">{err.value}</p> : null}
    </div>
  );
});
