import type { RequestEvent } from "@builder.io/qwik-city";

/** Block cross-origin POST when Origin is present and does not match the request URL (Push API hardening). */
export function rejectCrossOriginPushPost(event: RequestEvent): boolean {
  const origin = event.request.headers.get("origin");
  if (!origin) return false;
  if (origin !== event.url.origin) {
    event.json(403, { error: "Invalid origin" });
    return true;
  }
  return false;
}

export function isValidWebPushEndpoint(endpoint: string): boolean {
  const s = String(endpoint || "").trim();
  if (s.length < 32 || s.length > 4096) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}
