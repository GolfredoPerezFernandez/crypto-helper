import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";

type AlertRow = {
  id: number;
  tokenId: number;
  direction: string;
  thresholdUsd: string;
  enabled: number | null;
  lastTriggeredAt: number | null;
  createdAt: number | null;
  symbol: string;
  name: string;
  price: string;
};

export const PriceAlertsSettings = component$(() => {
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const ready = useSignal(false);
  const items = useSignal<AlertRow[]>([]);
  const err = useSignal<string | null>(null);
  const busy = useSignal(false);
  const tokenId = useSignal<number | null>(null);
  const direction = useSignal<"above" | "below">("above");
  const threshold = useSignal("");

  const load = $(async () => {
    const res = await fetch("/api/crypto/alerts/price/", { credentials: "include" });
    if (res.status === 403) {
      err.value = "Pro subscription required for price alerts.";
      items.value = [];
      return;
    }
    if (!res.ok) {
      err.value = "Could not load price alerts.";
      return;
    }
    const j = (await res.json()) as { items?: AlertRow[] };
    items.value = j.items || [];
    err.value = null;
  });

  const remove = $(async (id: number) => {
    busy.value = true;
    err.value = null;
    try {
      const res = await fetch(`/api/crypto/alerts/price/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("delete failed");
      await load();
    } catch {
      err.value = "Could not remove alert.";
    } finally {
      busy.value = false;
    }
  });

  const toggleEnabled = $(async (row: AlertRow) => {
    const next = row.enabled === 0 ? 1 : 0;
    busy.value = true;
    err.value = null;
    try {
      const res = await fetch(`/api/crypto/alerts/price/${row.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next === 1 }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("patch failed");
      await load();
    } catch {
      err.value = "Could not update alert.";
    } finally {
      busy.value = false;
    }
  });

  const submit = $(async () => {
    const tid = tokenId.value;
    const th = Number(String(threshold.value).replace(/,/g, ""));
    if (tid == null || tid < 1) {
      err.value = "Enter a valid token id (from the token URL).";
      return;
    }
    if (!Number.isFinite(th) || th <= 0) {
      err.value = "Enter a positive USD threshold.";
      return;
    }
    busy.value = true;
    err.value = null;
    try {
      const res = await fetch("/api/crypto/alerts/price/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: tid,
          direction: direction.value,
          thresholdUsd: th,
        }),
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409) {
        err.value = j.error || "You already have an alert for this direction.";
        return;
      }
      if (!res.ok) throw new Error("create failed");
      threshold.value = "";
      await load();
    } catch {
      err.value = "Could not create alert.";
    } finally {
      busy.value = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.search);
    const q = new URLSearchParams(loc.url.search).get("token");
    if (q) {
      const n = Number(q);
      if (Number.isFinite(n) && n > 0) tokenId.value = n;
    }
    await load();
    ready.value = true;
  });

  if (!ready.value) {
    return <p class="text-sm text-slate-500">Loading price alerts…</p>;
  }

  return (
    <div class="space-y-4 max-w-lg">
      <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 space-y-3">
        <h3 class="text-sm font-semibold text-[#04E6E6]">Pro: USD price threshold</h3>
        <p class="text-xs text-slate-400">
          We check rules after each market sync (CMC). You get at most one push per rule every ~4 hours while the
          condition holds. Requires Web Push enabled above.
        </p>

        <div class="grid gap-2 text-sm">
          <label class="text-slate-300">
            Token id
            <input
              type="number"
              min={1}
              class="mt-1 w-full rounded border border-[#043234] bg-[#001010] px-2 py-1 text-slate-100"
              value={tokenId.value ?? ""}
              onInput$={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                tokenId.value = Number.isFinite(v) && v > 0 ? v : null;
              }}
            />
          </label>
          <p class="text-[10px] text-slate-500">
            Same number as in <code class="text-slate-400">/token/[id]/</code> — open a token and use the
            quick link, or paste the id from the URL.
          </p>
          <label class="text-slate-300">
            Direction
            <select
              class="mt-1 w-full rounded border border-[#043234] bg-[#001010] px-2 py-1 text-slate-100"
              value={direction.value}
              onChange$={(e) => {
                direction.value = (e.target as HTMLSelectElement).value as "above" | "below";
              }}
            >
              <option value="above">Price goes at or above</option>
              <option value="below">Price goes at or below</option>
            </select>
          </label>
          <label class="text-slate-300">
            Threshold (USD)
            <input
              type="text"
              inputMode="decimal"
              class="mt-1 w-full rounded border border-[#043234] bg-[#001010] px-2 py-1 text-slate-100"
              value={threshold.value}
              onInput$={(e) => {
                threshold.value = (e.target as HTMLInputElement).value;
              }}
              placeholder="e.g. 0.05 or 50000"
            />
          </label>
          <button
            type="button"
            class="rounded-lg bg-[#04E6E6] text-[#001a1c] px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            disabled={busy.value}
            onClick$={submit}
          >
            {busy.value ? "Saving…" : "Add alert"}
          </button>
        </div>
      </div>

      {items.value.length ? (
        <ul class="space-y-2 text-sm text-slate-200">
          {items.value.map((row) => (
            <li
              key={row.id}
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#043234]/80 bg-[#001010]/80 px-3 py-2"
            >
              <div>
                <span class="font-medium text-[#04E6E6]">{(row.symbol || "?").toUpperCase()}</span>{" "}
                <span class="text-slate-400">{row.direction === "above" ? "≥" : "≤"}</span> $
                {row.thresholdUsd}
                <span class="block text-[10px] text-slate-500">
                  id {row.tokenId}
                  {row.enabled === 0 ? " · paused" : ""}
                </span>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded border border-[#043234] px-2 py-1 text-xs text-slate-300 hover:bg-[#043234]/50"
                  disabled={busy.value}
                  onClick$={() => toggleEnabled(row)}
                >
                  {row.enabled === 0 ? "Resume" : "Pause"}
                </button>
                <a
                  class="rounded border border-[#043234] px-2 py-1 text-xs text-slate-300 hover:bg-[#043234]/50"
                  href={`/${L}/token/${row.tokenId}/`}
                >
                  View
                </a>
                <button
                  type="button"
                  class="rounded border border-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-950/40"
                  disabled={busy.value}
                  onClick$={() => remove(row.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p class="text-xs text-slate-500">No price alerts yet.</p>
      )}

      {err.value ? <p class="text-sm text-amber-200/90">{err.value}</p> : null}
    </div>
  );
});
