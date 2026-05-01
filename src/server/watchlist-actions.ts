import { server$ } from "@builder.io/qwik-city";
import { and, desc, eq } from "drizzle-orm";
import { userWatchlistItems } from "../../drizzle/schema";
import { getUserId } from "~/utils/auth";

type WatchItemType = "token" | "wallet" | "nft_contract" | "nft_item" | "tx";

async function loadDb() {
  return (await import("~/lib/turso")).db;
}

function normalizeType(raw: unknown): WatchItemType | null {
  const t = String(raw ?? "").trim();
  if (t === "token" || t === "wallet" || t === "nft_contract" || t === "nft_item" || t === "tx") return t;
  return null;
}

function normalizeKey(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export const listMyWatchlist = server$(async function (): Promise<
  {
    id: number;
    itemType: string;
    itemKey: string;
    label: string | null;
    metaJson: string | null;
    createdAt: number | null;
  }[]
> {
  const uidRaw = getUserId(this);
  const uid = uidRaw ? Number(uidRaw) : 0;
  if (!Number.isFinite(uid) || uid <= 0) return [];
  const db = await loadDb();
  return db
    .select()
    .from(userWatchlistItems)
    .where(eq(userWatchlistItems.userId, uid))
    .orderBy(desc(userWatchlistItems.createdAt), desc(userWatchlistItems.id))
    .all();
});

export const upsertWatchlistItem = server$(async function (input: {
  itemType: WatchItemType;
  itemKey: string;
  label?: string;
  meta?: Record<string, unknown> | null;
}): Promise<{ ok: boolean; requiresLogin?: boolean; message?: string }> {
  const uidRaw = getUserId(this);
  const uid = uidRaw ? Number(uidRaw) : 0;
  if (!Number.isFinite(uid) || uid <= 0) {
    return { ok: false, requiresLogin: true, message: "Login required." };
  }
  const itemType = normalizeType(input.itemType);
  const itemKey = normalizeKey(input.itemKey);
  if (!itemType || !itemKey) {
    return { ok: false, message: "Invalid watchlist item." };
  }
  const db = await loadDb();
  const existing = await db
    .select({ id: userWatchlistItems.id })
    .from(userWatchlistItems)
    .where(and(eq(userWatchlistItems.userId, uid), eq(userWatchlistItems.itemType, itemType), eq(userWatchlistItems.itemKey, itemKey)))
    .get();
  if (existing) return { ok: true };
  await db.insert(userWatchlistItems).values({
    userId: uid,
    itemType,
    itemKey,
    label: String(input.label ?? "").trim(),
    metaJson: input.meta ? JSON.stringify(input.meta) : null,
  });
  return { ok: true };
});

export const removeWatchlistItem = server$(async function (input: {
  itemType: WatchItemType;
  itemKey: string;
}): Promise<{ ok: boolean; requiresLogin?: boolean; message?: string }> {
  const uidRaw = getUserId(this);
  const uid = uidRaw ? Number(uidRaw) : 0;
  if (!Number.isFinite(uid) || uid <= 0) {
    return { ok: false, requiresLogin: true, message: "Login required." };
  }
  const itemType = normalizeType(input.itemType);
  const itemKey = normalizeKey(input.itemKey);
  if (!itemType || !itemKey) return { ok: false, message: "Invalid watchlist item." };
  const db = await loadDb();
  await db
    .delete(userWatchlistItems)
    .where(and(eq(userWatchlistItems.userId, uid), eq(userWatchlistItems.itemType, itemType), eq(userWatchlistItems.itemKey, itemKey)));
  return { ok: true };
});
