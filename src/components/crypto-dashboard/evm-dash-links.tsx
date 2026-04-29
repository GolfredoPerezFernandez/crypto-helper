import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

/** Block explorer origin for EVM (chain slug or hex id). */
export function txExplorerBase(chain: string): string {
  const c = String(chain || "").toLowerCase();
  if (c === "base") return "https://basescan.org";
  if (c === "bsc" || c === "bnb") return "https://bscscan.com";
  if (c === "polygon" || c === "matic") return "https://polygonscan.com";
  if (c === "arbitrum") return "https://arbiscan.io";
  if (c === "optimism") return "https://optimistic.etherscan.io";
  if (c === "avalanche") return "https://snowtrace.io";
  if (c === "fantom") return "https://ftmscan.com";
  if (c === "gnosis") return "https://gnosisscan.io";
  if (c === "linea") return "https://lineascan.build";
  if (c === "blast") return "https://blastscan.io";
  if (c === "cronos") return "https://cronoscan.com";
  if (c === "0x1" || c === "eth" || c === "ethereum") return "https://etherscan.io";
  if (c === "0x38") return "https://bscscan.com";
  if (c === "0x89") return "https://polygonscan.com";
  if (c === "0xa4b1") return "https://arbiscan.io";
  if (c === "0x2105") return "https://basescan.org";
  return "https://etherscan.io";
}

/** Internal tx routes only support Base / Ethereum (see `/tx`). */
export function moralisChainToInternalTxChain(moralisChain: string): "base" | "eth" | null {
  const x = String(moralisChain || "").toLowerCase();
  if (x === "base" || x === "0x2105") return "base";
  if (x === "eth" || x === "ethereum" || x === "0x1") return "eth";
  return null;
}

export function evmTxExplorerUrl(moralisChain: string, hash: string): string {
  const h = String(hash ?? "").trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(h)) return "#";
  return `${txExplorerBase(moralisChain)}/tx/${h}`;
}

/** BaseScan / Etherscan solo para cadenas soportadas en `/tx`. */
export function evmExplorerTxUrlBaseEth(chain: "base" | "eth", hash: unknown): string {
  const h = String(hash ?? "").trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(h)) return "#";
  return chain === "base" ? `https://basescan.org/tx/${h}` : `https://etherscan.io/tx/${h}`;
}

export function dashboardTxHref(locale: string, chain: "base" | "eth", hash: unknown): string {
  const h = String(hash ?? "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(h)) return "#";
  const ch = chain === "eth" ? "eth" : "base";
  return `/${locale}/tx/${encodeURIComponent(h)}/?chain=${ch}`;
}

export type EvmAddrVariant = "wallet" | "token" | "nft";

/**
 * Dirección 0x: enlace principal en la app; ↗ al explorador de la cadena.
 * `moralisChain`: slug de cadena (`base`, `eth`, `polygon`, …).
 */
export const EvmAddrLinks = component$(
  (props: { locale: string; moralisChain: string; address: unknown; variant?: EvmAddrVariant }) => {
    const raw = String(props.address ?? "").trim();
    const a = raw.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/i.test(a)) {
      return <span class="text-gray-600">—</span>;
    }
    const ex = `${txExplorerBase(props.moralisChain)}/address/${encodeURIComponent(a)}`;
    const v = props.variant ?? "wallet";
    const chQ = encodeURIComponent(props.moralisChain);
    const primaryHref =
      v === "token"
        ? `/${props.locale}/token-details/${encodeURIComponent(a)}/`
        : v === "nft"
          ? `/${props.locale}/nfts/${a}/?chain=${chQ}`
          : `/${props.locale}/wallet/${a}/`;
    return (
      <span class="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <Link
          href={primaryHref}
          class="font-mono text-[10px] text-[#04E6E6] hover:underline"
          title={a}
        >
          {a.slice(0, 10)}…
        </Link>
        <a
          href={ex}
          target="_blank"
          rel="noreferrer"
          class="text-[9px] text-slate-600 hover:text-slate-400"
          title="Explorador"
          aria-label="Explorador"
        >
          ↗
        </a>
      </span>
    );
  },
);

/**
 * Hash de tx: enlace a `/tx` en Base/Eth; en otras cadenas solo explorador (mismo estilo).
 */
export const TxHashLink = component$(
  (props: {
    locale: string;
    moralisChain: string;
    hash: unknown;
    mode: "hash10" | "hash12" | "ver";
    /** classNames opcionales para el enlace principal */
    linkClass?: string;
  }) => {
    const raw = String(props.hash ?? "").trim();
    const h = raw.toLowerCase();
    if (!/^0x[a-f0-9]{64}$/.test(h)) {
      return <span class="text-gray-600">—</span>;
    }
    const dash = moralisChainToInternalTxChain(props.moralisChain);
    const ex = evmTxExplorerUrl(props.moralisChain, h);
    const text =
      props.mode === "ver" ? "Ver" : props.mode === "hash12" ? `${h.slice(0, 12)}…` : `${h.slice(0, 10)}…`;
    const baseCls =
      props.linkClass ??
      (props.mode === "ver"
        ? "text-[10px] text-[#04E6E6] hover:underline"
        : "font-mono text-[10px] text-[#04E6E6] hover:underline");
    return (
      <span class="inline-flex items-center gap-1">
        {dash ? (
          <>
            <Link href={dashboardTxHref(props.locale, dash, h)} class={baseCls}>
              {text}
            </Link>
            <a
              href={ex}
              target="_blank"
              rel="noreferrer"
              class="text-[9px] text-slate-600 hover:text-slate-400"
              title="Explorador"
              aria-label="Explorador"
            >
              ↗
            </a>
          </>
        ) : (
          <a href={ex} target="_blank" rel="noreferrer" class={baseCls} title="Explorador">
            {text}
            <span class="ml-0.5 text-[9px] text-slate-600">↗</span>
          </a>
        )}
      </span>
    );
  },
);
