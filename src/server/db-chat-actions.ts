import { server$ } from "@builder.io/qwik-city";
import { getUserProAccess } from "~/server/crypto-ghost/user-access";
import { verifyAuth } from "~/utils/auth";
import { runCryptoGhostDbChat } from "~/server/crypto-ghost/db-chat-agent";
import { checkDbChatRateLimit } from "~/server/db-chat-rate-limit";

function getRequestClientIp(ev: any): string {
  const fwd = ev.request.headers.get("x-forwarded-for");
  if (fwd) {
    const ip = fwd.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const cf = ev.request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xReal = ev.request.headers.get("x-real-ip")?.trim();
  if (xReal) return xReal;
  return ev.clientConn?.ip || "unknown";
}

export const askCryptoGhostDb = server$(async function (this: any, message: string) {
  const ip = getRequestClientIp(this);
  if (!(await verifyAuth(this))) {
    return { ok: false as const, error: "Inicia sesión para usar DB insight." };
  }
  const { hasPro } = await getUserProAccess(this);
  if (!hasPro) {
    return {
      ok: false as const,
      error: "DB insight es solo para suscriptores Pro. Mejora tu plan en Overview.",
    };
  }
  const rl = checkDbChatRateLimit(ip, "pro");
  if (!rl.ok) {
    return {
      ok: false as const,
      error: `Demasiadas consultas desde esta red. Prueba en ${rl.retryAfterSec}s.`,
    };
  }

  const q = String(message || "").trim();
  if (!q) {
    return { ok: false as const, error: "Escribe una pregunta." };
  }
  if (q.length > 8000) {
    return { ok: false as const, error: "Pregunta demasiado larga." };
  }

  const { answer, error } = await runCryptoGhostDbChat(q);
  if (error) {
    return { ok: false as const, error };
  }
  return { ok: true as const, answer };
});
