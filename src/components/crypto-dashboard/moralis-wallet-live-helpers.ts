/** Moralis paginated payloads: `{ result: [...] }` or raw array. */
export function moralisResultArray(data: unknown): Record<string, unknown>[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data === "object") {
    const r = (data as Record<string, unknown>).result;
    if (Array.isArray(r)) return r as Record<string, unknown>[];
  }
  return [];
}

export function fmtMoralisTs(iso: unknown): string {
  if (typeof iso !== "string") return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.length > 20 ? `${iso.slice(0, 19)}…` : iso;
    return d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

export function fmtSwapLeg(o: unknown): string {
  if (o == null || typeof o !== "object") return "—";
  const x = o as Record<string, unknown>;
  const sym = String(x.symbol ?? "").trim();
  const amt = x.amount != null ? String(x.amount).trim() : "";
  if (!amt && !sym) return "—";
  const usd = x.usdAmount != null ? Number(x.usdAmount) : NaN;
  const usdPart = Number.isFinite(usd)
    ? ` · ~$${Math.abs(usd).toLocaleString("es-ES", { maximumFractionDigits: 2 })}`
    : "";
  return sym ? `${amt} ${sym}${usdPart}` : `${amt}${usdPart}`;
}

export function fmtUsd(v: unknown): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${Math.abs(n).toLocaleString("es-ES", { maximumFractionDigits: 2 })}`;
}

export function moralisShallowEntries(data: unknown): [string, string][] {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return [];
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (k === "result" && Array.isArray(v)) continue;
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      out.push([k, JSON.stringify(v)]);
    } else {
      out.push([k, v === null || v === undefined ? "—" : String(v)]);
    }
  }
  return out.slice(0, 40);
}

export function isMoralisPaginatedTxList(data: unknown): boolean {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return false;
  const r = (data as Record<string, unknown>).result;
  if (!Array.isArray(r) || r.length === 0) return false;
  const first = r[0];
  if (first == null || typeof first !== "object" || Array.isArray(first)) return false;
  const row = first as Record<string, unknown>;
  const h = row.hash ?? row.transaction_hash ?? row.transactionHash;
  return typeof h === "string" && /^0x[a-fA-F0-9]{64}$/.test(h);
}
