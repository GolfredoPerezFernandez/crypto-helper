/// <reference types="vite/client" />
import { setupServiceWorker } from "@builder.io/qwik-city/service-worker";
import { setupPwa } from "@qwikdev/pwa/sw";

setupServiceWorker();
setupPwa();

const sw = self as unknown as ServiceWorkerGlobalScope & {
  location: { origin: string };
  registration: ServiceWorkerRegistration;
};

const swPublicVapidKey = String(import.meta.env.PUBLIC_VAPID_KEY || "")
  .trim()
  .replace(/^['"]+|['"]+$/g, "")
  .replace(/\s+/g, "");

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = sw.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

sw.addEventListener("install", () => {
  void sw.skipWaiting();
});

sw.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    void sw.skipWaiting();
  }
});

sw.addEventListener("pushsubscriptionchange", (event: Event) => {
  const promise = (async () => {
    const oldSubscription = (event as { oldSubscription?: PushSubscription }).oldSubscription;
    try {
      const clientsList = await sw.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGE" });
      }
    } catch {
      /* ignore */
    }

    if (!swPublicVapidKey) return;

    let applicationServerKey: Uint8Array<ArrayBuffer>;
    try {
      applicationServerKey = urlBase64ToUint8Array(swPublicVapidKey);
    } catch {
      return;
    }

    const base = sw.location.origin;

    try {
      const oldSub = oldSubscription ?? null;
      
      if (oldSub?.endpoint) {
        await fetch(new URL("/api/push/unsubscribe/", base).href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: oldSub.endpoint }),
          credentials: "include",
        }).catch(() => {});
      }
    } catch {
      /* ignore */
    }

    try {
      const reg = sw.registration;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      }
      await fetch(new URL("/api/push/subscribe/", base).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
        credentials: "include",
      });
    } catch (err) {
      console.warn("[Push] pushsubscriptionchange", err);
    }
  })();

  (event as ExtendableEvent).waitUntil(promise);
});

sw.addEventListener("push", (event: PushEvent) => {
  const fallbackData = {
    title: "Crypto Helper",
    body: "New live signal.",
    data: { link: "/en-us/home/" },
  };

  const promise = (async () => {
    let data: typeof fallbackData & { message?: string; tag?: string } = fallbackData;

    if (event.data) {
      try {
        const raw = await event.data.text();
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch {
            data = { ...fallbackData, body: raw };
          }
        }
      } catch {
        data = fallbackData;
      }
    }

    const title = String(data.title || fallbackData.title).slice(0, 200);
    const bodyRaw = data.body || data.message || fallbackData.body;
    const body = String(bodyRaw || "").slice(0, 500) || fallbackData.body;

    const rawData = data.data as Record<string, string | undefined> | undefined;
    const link = rawData?.link || fallbackData.data.link;

    const options = {
      body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: {
        link,
        ...(rawData || {}),
      },
      vibrate: [100, 50, 100],
      tag: rawData?.tag || rawData?.notificationId || "crypto-helper-signal",
      renotify: Boolean(rawData?.notificationId),
    } as NotificationOptions;

    try {
      await sw.registration.showNotification(title, options);
    } catch (e) {
      console.warn("[Push] showNotification", e);
    }
  })();

  event.waitUntil(promise);
});

sw.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const link = (event.notification.data as { link?: string })?.link || "/";

  const promise = (async () => {
    const clientList = await sw.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const targetUrl = new URL(link, sw.location.origin);
    for (const client of clientList) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin === targetUrl.origin) {
        const focused = await client.focus();
        if (
          focused &&
          "navigate" in focused &&
          typeof focused.navigate === "function" &&
          focused.url !== targetUrl.href
        ) {
          await focused.navigate(targetUrl.href);
        }
        return;
      }
    }
    await sw.clients.openWindow(link.startsWith("/") ? targetUrl.href : link);
  })();

  event.waitUntil(promise);
});
