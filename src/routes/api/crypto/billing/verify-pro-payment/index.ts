import type { RequestHandler } from "@builder.io/qwik-city";
import { eq } from "drizzle-orm";
import { getUserId } from "~/utils/auth";
import { users } from "../../../../../../drizzle/schema";
import { db } from "~/lib/turso";
import { verifyAndGrantPro } from "~/server/crypto-ghost/pro-payment-verify";
import { getProChainEntry } from "~/constants/pro-networks";
import { base } from "viem/chains";

export const onGet: RequestHandler = async ({ json }) => {
  json(200, { method: "POST", body: { txHash: "0x…", chainId: base.id } });
};

export const onPost: RequestHandler = async (event) => {
  const uid = getUserId(event);
  if (!uid) {
    event.json(401, { ok: false, error: "Debes iniciar sesión." });
    return;
  }

  const userId = Number.parseInt(uid, 10);
  if (!Number.isFinite(userId) || userId < 1) {
    event.json(400, { ok: false, error: "Sesión inválida." });
    return;
  }

  const row = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
  if (!row) {
    event.json(401, { ok: false, error: "Usuario no encontrado." });
    return;
  }

  let body: { txHash?: string; chainId?: number };
  try {
    body = (await event.request.json()) as { txHash?: string; chainId?: number };
  } catch {
    event.json(400, { ok: false, error: "JSON inválido." });
    return;
  }

  const txHash = String(body?.txHash || "").trim();
  if (!txHash) {
    event.json(400, { ok: false, error: "Falta txHash." });
    return;
  }

  const rawChain = body?.chainId;
  let chainId =
    typeof rawChain === "number" && Number.isFinite(rawChain)
      ? rawChain
      : typeof rawChain === "string" && rawChain.trim() !== ""
        ? Number.parseInt(rawChain, 10)
        : base.id;
  if (!Number.isFinite(chainId)) {
    chainId = base.id;
  }
  if (!getProChainEntry(chainId)) {
    event.json(400, { ok: false, error: "Red (chainId) no soportada." });
    return;
  }

  try {
    const result = await verifyAndGrantPro({ userId, txHash, chainId });
    if (!result.ok) {
      event.json(400, { ok: false, error: result.error });
      return;
    }
    event.json(200, { ok: true, alreadyPro: result.alreadyPro === true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error del servidor.";
    console.error("[verify-pro-payment]", e);
    event.json(500, { ok: false, error: msg });
  }
};
