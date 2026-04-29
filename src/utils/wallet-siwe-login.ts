import {
  loginWithWalletSignature,
  requestWalletLoginChallenge,
} from "~/server/auth-actions";

export type WalletSiweOutcome =
  | { kind: "success" }
  | { kind: "needs_email"; address: string }
  | { kind: "fail"; message: string }
  | { kind: "no_ethereum" };

/** Used by login / register when MetaMask is already connected (header flow). */
export async function runWalletSiweLogin(): Promise<WalletSiweOutcome> {
  const eth = (typeof window !== "undefined" && (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } }).ethereum) || null;
  if (!eth) return { kind: "no_ethereum" };
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  const raw = accounts[0];
  if (!raw) return { kind: "fail", message: "No account" };
  const ch = await requestWalletLoginChallenge(raw.toLowerCase());
  if (!ch.success || !ch.message) return { kind: "fail", message: ch.message || "Challenge failed" };
  const signature = await eth.request({
    method: "personal_sign",
    params: [ch.message, raw],
  });
  const res = await loginWithWalletSignature({
    address: raw.toLowerCase(),
    signature: signature as `0x${string}`,
  });
  if (res.needsEmail) {
    return { kind: "needs_email", address: raw.toLowerCase() };
  }
  if (!res.success) return { kind: "fail", message: res.message || "Wallet login failed" };
  return { kind: "success" };
}

export function hasClientSessionMarker(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("session_active="));
}

/** Same-origin relative paths only (avoids open redirects via `next`). */
export function getSafeNextPath(params: URLSearchParams, locale: string): string {
  const fallback = `/${locale}/home/`;
  const raw = params.get("next");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("://")) return fallback;
  return raw;
}

export function localeFromPathname(pathname: string, paramLocale?: string): string {
  if (paramLocale) return paramLocale;
  const first = pathname.split("/").filter(Boolean)[0];
  return first || "en-us";
}
