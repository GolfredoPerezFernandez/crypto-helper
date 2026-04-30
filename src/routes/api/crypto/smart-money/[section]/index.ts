import type { RequestHandler } from "@builder.io/qwik-city";
import {
  fetchNansenSmartMoney,
  getDefaultSmartMoneyRequest,
  parseSection,
} from "~/server/crypto-ghost/nansen-smart-money";
import { getUserProAccess } from "~/server/crypto-ghost/user-access";
import { verifyAuth } from "~/utils/auth";

async function readRequestBody(ev: Parameters<RequestHandler>[0]): Promise<unknown> {
  try {
    return await ev.parseBody();
  } catch {
    return null;
  }
}

export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  if (!(await getUserProAccess(ev)).hasPro) {
    ev.json(403, { ok: false, error: "Pro subscription required" });
    return;
  }

  const section = parseSection(ev.params.section);
  if (!section) {
    ev.json(400, { ok: false, error: "Invalid smart-money section" });
    return;
  }
  const upstream = await fetchNansenSmartMoney(section, getDefaultSmartMoneyRequest(section));
  if (!upstream.ok) {
    ev.json(upstream.status, {
      ok: false,
      error: upstream.error,
      creditsUsed: upstream.creditsUsed,
      creditsRemaining: upstream.creditsRemaining,
    });
    return;
  }
  ev.json(200, {
    ok: true,
    section,
    data: upstream.data,
    creditsUsed: upstream.creditsUsed,
    creditsRemaining: upstream.creditsRemaining,
  });
};

export const onPost: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  if (!(await getUserProAccess(ev)).hasPro) {
    ev.json(403, { ok: false, error: "Pro subscription required" });
    return;
  }

  const section = parseSection(ev.params.section);
  if (!section) {
    ev.json(400, { ok: false, error: "Invalid smart-money section" });
    return;
  }

  const body = await readRequestBody(ev);
  const payload =
    body && typeof body === "object" && "payload" in (body as Record<string, unknown>)
      ? (body as Record<string, unknown>).payload
      : body;

  const upstream = await fetchNansenSmartMoney(section, payload);
  if (!upstream.ok) {
    ev.json(upstream.status, {
      ok: false,
      error: upstream.error,
      creditsUsed: upstream.creditsUsed,
      creditsRemaining: upstream.creditsRemaining,
    });
    return;
  }

  ev.json(200, {
    ok: true,
    section,
    data: upstream.data,
    creditsUsed: upstream.creditsUsed,
    creditsRemaining: upstream.creditsRemaining,
  });
};
