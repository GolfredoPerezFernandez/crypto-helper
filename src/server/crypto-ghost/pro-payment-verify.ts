import { eq } from "drizzle-orm";
import { createPublicClient, getAddress, http, parseEventLogs } from "viem";
import { getDefaultPublicRpc, getProChainEntry, proPlanUsdtAmount } from "~/constants/pro-networks";
import { db } from "~/lib/turso";
import { proPaymentReceipts, users } from "../../../drizzle/schema";

const erc20Abi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

function normalizeHash(h: string): string | null {
  const t = h.trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(t)) return null;
  return t;
}

function normalizeAddr(a: string): string {
  return a.toLowerCase();
}

function getRecipient(): `0x${string}` {
  const raw = (process.env.PUBLIC_PRO_PAYMENT_RECIPIENT || "0xf6657f7019e481204d26882d6b1bed1da1541896").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    throw new Error("PUBLIC_PRO_PAYMENT_RECIPIENT invalid");
  }
  return raw as `0x${string}`;
}

/** Opcional: PRO_VERIFY_RPC_<chainId> si el RPC público por defecto falla. */
function resolveRpc(chainId: number): string {
  const env = process.env[`PRO_VERIFY_RPC_${chainId}`]?.trim();
  if (env) return env;
  return getDefaultPublicRpc(chainId);
}

export type VerifyProPaymentResult =
  | { ok: true; alreadyPro?: boolean }
  | { ok: false; error: string };

/**
 * Confirms a USDT transfer of exactly 5 USDT on the given chain to the admin treasury.
 */
export async function verifyAndGrantPro(params: {
  userId: number;
  txHash: string;
  chainId: number;
}): Promise<VerifyProPaymentResult> {
  const entry = getProChainEntry(params.chainId);
  if (!entry) {
    return { ok: false, error: "Red no soportada para verificación Pro." };
  }

  const hash = normalizeHash(params.txHash);
  if (!hash) {
    return { ok: false, error: "Hash de transacción inválido." };
  }

  const existing = await db
    .select({ userId: proPaymentReceipts.userId })
    .from(proPaymentReceipts)
    .where(eq(proPaymentReceipts.txHash, hash))
    .get();
  if (existing) {
    if (existing.userId === params.userId) {
      const sub = await db.select({ subscriber: users.subscriber }).from(users).where(eq(users.id, params.userId)).get();
      if ((sub?.subscriber ?? 0) === 1) {
        return { ok: true, alreadyPro: true };
      }
    }
    return { ok: false, error: "Este pago ya fue registrado." };
  }

  const userRow = await db
    .select({ walletAddress: users.walletAddress, subscriber: users.subscriber })
    .from(users)
    .where(eq(users.id, params.userId))
    .get();

  if (!userRow) {
    return { ok: false, error: "Usuario no encontrado." };
  }
  if ((userRow.subscriber ?? 0) === 1) {
    return { ok: true, alreadyPro: true };
  }

  const recipient = getRecipient();
  const usdt = entry.usdt;
  const expected = proPlanUsdtAmount(params.chainId);
  const rpc = resolveRpc(params.chainId);

  const client = createPublicClient({
    chain: entry.chain,
    transport: http(rpc),
  });

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
  } catch {
    return {
      ok: false,
      error: `No se pudo leer el recibo en ${entry.label}. Comprueba el hash, la red y el RPC (PRO_VERIFY_RPC_${params.chainId}).`,
    };
  }

  if (!receipt || receipt.status !== "success") {
    return { ok: false, error: "La transacción no está confirmada o falló." };
  }

  const transfers = parseEventLogs({
    abi: erc20Abi,
    logs: receipt.logs,
    eventName: "Transfer",
  });

  let match: { from: `0x${string}`; to: `0x${string}`; value: bigint } | null = null;
  for (const ev of transfers) {
    if (normalizeAddr(ev.address) !== normalizeAddr(usdt)) continue;
    const { from, to, value } = ev.args;
    if (normalizeAddr(to) === normalizeAddr(recipient) && value === expected) {
      match = { from: from as `0x${string}`, to: to as `0x${string}`, value };
      break;
    }
  }

  if (!match) {
    return {
      ok: false,
      error: `No se encontró un transfer de 5 USDT (${entry.label}) al destino. Comprueba token, red e importe exacto.`,
    };
  }

  const fromNorm = normalizeAddr(match.from);
  const linked = userRow.walletAddress?.trim();

  if (linked) {
    if (fromNorm !== normalizeAddr(linked)) {
      return {
        ok: false,
        error:
          "El USDT debe enviarse desde la wallet vinculada a tu cuenta. Revisa tu perfil o la dirección origen.",
      };
    }
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    await db.insert(proPaymentReceipts).values({
      txHash: hash,
      userId: params.userId,
      createdAt: now,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return { ok: false, error: "Este pago ya fue registrado." };
    }
    throw e;
  }

  if (!linked) {
    await db
      .update(users)
      .set({ subscriber: 1, walletAddress: getAddress(match.from) })
      .where(eq(users.id, params.userId));
  } else {
    await db.update(users).set({ subscriber: 1 }).where(eq(users.id, params.userId));
  }

  return { ok: true };
}
