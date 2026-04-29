import type { RequestEventBase } from "@builder.io/qwik-city";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { users } from "../../../drizzle/schema";
import { db } from "~/lib/turso";
import { getUserId } from "~/utils/auth";

/** Dashboard copy that mentions Turso/sync/API keys — only these accounts see it. */
const SYNC_DEBUG_VIEWER_EMAILS = new Set(
  ["golfredo.pf@gmail.com"].map((e) => e.toLowerCase()),
);

/** May invoke `runDailyMarketSync` from the dashboard (server-enforced). */
const FULL_MARKET_SYNC_EMAILS = new Set(
  ["golfredo.pf@gmail.com"].map((e) => e.toLowerCase()),
);

export type UserProFlags = {
  userId: number | null;
  isAdmin: boolean;
  isSubscriber: boolean;
  hasPro: boolean;
  email: string | null;
  authProvider: string | null;
  /** True for allowlisted emails — sync/API diagnostic UI and raw snapshot errors. */
  showSyncDebug: boolean;
  /** True for allowlisted emails — dashboard “sync completo” (CMC + aux). */
  canTriggerFullMarketSync: boolean;
};

function emailMaySeeSyncDebug(email: string | null | undefined): boolean {
  if (email == null || email === "") return false;
  return SYNC_DEBUG_VIEWER_EMAILS.has(String(email).toLowerCase().trim());
}

function emailMayTriggerFullMarketSync(email: string | null | undefined): boolean {
  if (email == null || email === "") return false;
  return FULL_MARKET_SYNC_EMAILS.has(String(email).toLowerCase().trim());
}

/** Server-side gate for manual full market sync (`server$`). */
export async function assertUserMayTriggerFullMarketSync(
  userId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const row = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    if (!row?.email) return { ok: false, error: "Cuenta sin email." };
    if (!emailMayTriggerFullMarketSync(row.email)) return { ok: false, error: "No autorizado." };
    return { ok: true };
  } catch (e) {
    console.error("[assertUserMayTriggerFullMarketSync] DB error", e);
    return { ok: false, error: "Base de datos no disponible." };
  }
}

export async function getUserProAccess(ev: RequestEventBase): Promise<UserProFlags> {
  const cacheKey = "__userProAccess";
  const cached = ev.sharedMap.get(cacheKey) as UserProFlags | undefined;
  if (cached) return cached;
  const uidStr = getUserId(ev);
  if (!uidStr) {
    const result: UserProFlags = {
      userId: null,
      isAdmin: false,
      isSubscriber: false,
      hasPro: false,
      email: null,
      authProvider: null,
      showSyncDebug: false,
      canTriggerFullMarketSync: false,
    };
    ev.sharedMap.set(cacheKey, result);
    return result;
  }
  const userId = Number(uidStr);
  if (!Number.isFinite(userId)) {
    const result: UserProFlags = {
      userId: null,
      isAdmin: false,
      isSubscriber: false,
      hasPro: false,
      email: null,
      authProvider: null,
      showSyncDebug: false,
      canTriggerFullMarketSync: false,
    };
    ev.sharedMap.set(cacheKey, result);
    return result;
  }
  try {
    const row = await db
      .select({
        type: users.type,
        subscriber: users.subscriber,
        email: users.email,
        authProvider: users.authProvider,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    const isAdmin = row?.type === "admin";
    const isSubscriber = (row?.subscriber ?? 0) === 1;
    const hasPro = isAdmin || isSubscriber;
    const showSyncDebug = emailMaySeeSyncDebug(row?.email ?? null);
    const canTriggerFullMarketSync = emailMayTriggerFullMarketSync(row?.email ?? null);
    const result: UserProFlags = {
      userId,
      isAdmin,
      isSubscriber,
      hasPro,
      email: row?.email ?? null,
      authProvider: row?.authProvider ?? null,
      showSyncDebug,
      canTriggerFullMarketSync,
    };
    ev.sharedMap.set(cacheKey, result);
    return result;
  } catch (e) {
    console.error("[getUserProAccess] Turso/DB unavailable", e);
    const result: UserProFlags = {
      userId,
      isAdmin: false,
      isSubscriber: false,
      hasPro: false,
      email: null,
      authProvider: null,
      showSyncDebug: false,
      canTriggerFullMarketSync: false,
    };
    ev.sharedMap.set(cacheKey, result);
    return result;
  }
}

function readCookieHeader(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

/** Express (SSE): same rules as dashboard — session cookie + Turso row. */
export async function expressRequestHasProAccess(req: Request): Promise<boolean> {
  const uidStr = readCookieHeader(req, "auth_token");
  if (!uidStr) return false;
  const userId = Number(uidStr);
  if (!Number.isFinite(userId)) return false;
  try {
    const row = await db
      .select({ type: users.type, subscriber: users.subscriber })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    if (!row) return false;
    return row.type === "admin" || (row.subscriber ?? 0) === 1;
  } catch (e) {
    console.error("[expressRequestHasProAccess] DB error", e);
    return false;
  }
}
