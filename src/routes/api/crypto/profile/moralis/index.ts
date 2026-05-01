import type { RequestHandler } from "@builder.io/qwik-city";
import { moralisGet } from "~/server/crypto-helper/moralis-api";
import { verifyAuth } from "~/utils/auth";

const EVM = "0x[a-fA-F0-9]{40}";
const ALLOWED_PATHS = [
  new RegExp(`^/wallets/${EVM}/tokens$`),
  new RegExp(`^/wallets/${EVM}/stats$`),
  new RegExp(`^/wallets/${EVM}/history$`),
  new RegExp(`^/wallets/${EVM}/chains$`),
  new RegExp(`^/wallets/${EVM}/profitability/summary$`),
  new RegExp(`^/wallets/${EVM}/profitability$`),
  new RegExp(`^/wallets/${EVM}/swaps$`),
  new RegExp(`^/${EVM}$`),
];

/** GET /api/crypto/profile/moralis?path=/wallets/0x.../history&chain=0x2105&limit=40... */
export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }

  const path = (ev.query.get("path") || "").trim();
  if (!path || !ALLOWED_PATHS.some((rx) => rx.test(path))) {
    ev.json(400, { ok: false, error: "Path not allowed" });
    return;
  }

  const search = new URLSearchParams();
  for (const [k, v] of ev.url.searchParams.entries()) {
    if (k === "path") continue;
    if (!v) continue;
    // Keep proxy strict and simple: only expected query keys for profile widgets.
    if (
      k === "chain" ||
      k === "limit" ||
      k === "cursor" ||
      k === "order" ||
      k === "exclude_spam" ||
      k === "exclude_unverified_contracts" ||
      k === "exclude_native" ||
      k === "days" ||
      k === "includes" ||
      k === "include_internal_transactions" ||
      k === "nft_metadata"
    ) {
      search.set(k, v);
    }
  }

  const target = `${path}${search.toString() ? `?${search.toString()}` : ""}`;

  // Personalized page => private browser cache only (avoid CDN sharing).
  ev.cacheControl({
    public: false,
    maxAge: 45,
    sMaxAge: 0,
    staleWhileRevalidate: 60 * 5,
  });

  const r = await moralisGet(target);
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, data: r.data });
};

