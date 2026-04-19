import type { Chain } from "viem/chains";
import { getAddress } from "viem";
import { arbitrum, avalanche, base, bsc, mainnet, optimism, polygon } from "viem/chains";

/**
 * USDT por red — direcciones y decimales alineados con explorers / uso de mercado (sin env).
 * La mayoría usa 6 decimales; BNB Smart Chain (Binance-Peg) usa 18 — el importe sigue siendo “5 USDT”.
 *
 * Matices (etiquetas en explorers; las direcciones aquí siguen siendo las que verificamos en servidor):
 * - Ethereum: USDT nativo listado por Tether en documentación pública (6).
 * - Base: suele aparecer como “Bridged Tether USD”; no es emisión nativa on-chain por Tether en Base (6).
 * - Arbitrum / Polygon: el contrato coincide con el USDT de uso habitual; el explorer puede mostrar USD₮0 / USDT0 (6).
 * - BNB: BscScan suele rotular “Binance-Peg BSC-USD”; es el token que el mercado usa como USDT en BNB (18).
 * - Optimism: USDT bridgeado en L2 (6).
 * - Avalanche: 0x9702… es el USDT que Tether publica para C-Chain. No confundir con USDT.e legado (p. ej. 0xc719…).
 *
 * Opcional en servidor: PRO_VERIFY_RPC_<chainId> si el RPC por defecto falla.
 */
export type ProChainRegistryEntry = {
  id: number;
  chain: Chain;
  label: string;
  usdt: `0x${string}`;
  decimals: number;
  /** Clave i18n bajo `app.proUpgrade.usdtExplorerHints.<id>` (copy corto para usuarios). */
  explorerHintId: "eth" | "base" | "arbitrum" | "bnb" | "polygon" | "optimism" | "avalanche";
};

const RAW: readonly {
  id: number;
  chain: Chain;
  label: string;
  usdt: string;
  decimals: number;
  explorerHintId: ProChainRegistryEntry["explorerHintId"];
}[] = [
  {
    id: mainnet.id,
    chain: mainnet,
    label: "Ethereum",
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    explorerHintId: "eth",
  },
  {
    id: base.id,
    chain: base,
    label: "Base",
    usdt: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    decimals: 6,
    explorerHintId: "base",
  },
  {
    id: arbitrum.id,
    chain: arbitrum,
    label: "Arbitrum One",
    usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    decimals: 6,
    explorerHintId: "arbitrum",
  },
  {
    id: bsc.id,
    chain: bsc,
    label: "BNB Smart Chain",
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    explorerHintId: "bnb",
  },
  {
    id: polygon.id,
    chain: polygon,
    label: "Polygon PoS",
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 6,
    explorerHintId: "polygon",
  },
  {
    id: optimism.id,
    chain: optimism,
    label: "Optimism",
    usdt: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    decimals: 6,
    explorerHintId: "optimism",
  },
  {
    id: avalanche.id,
    chain: avalanche,
    label: "Avalanche C-Chain",
    usdt: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    decimals: 6,
    explorerHintId: "avalanche",
  },
] as const;

export const PRO_CHAIN_REGISTRY: readonly ProChainRegistryEntry[] = RAW.map((r) => ({
  id: r.id,
  chain: r.chain,
  label: r.label,
  usdt: getAddress(r.usdt) as `0x${string}`,
  decimals: r.decimals,
  explorerHintId: r.explorerHintId,
}));

const BY_ID: Record<number, ProChainRegistryEntry> = Object.fromEntries(
  PRO_CHAIN_REGISTRY.map((e) => [e.id, e]),
);

export const SUPPORTED_PRO_CHAIN_IDS: readonly number[] = PRO_CHAIN_REGISTRY.map((e) => e.id);

export function getProChainEntry(chainId: number): ProChainRegistryEntry | undefined {
  return BY_ID[chainId];
}

/** Exactamente 5 USDT en unidades del token. */
export function proPlanUsdtAmount(chainId: number): bigint {
  const e = BY_ID[chainId];
  if (!e) throw new Error(`Unsupported chainId: ${chainId}`);
  return 5n * 10n ** BigInt(e.decimals);
}

export function getDefaultPublicRpc(chainId: number): string {
  const e = BY_ID[chainId];
  if (!e) throw new Error(`Unsupported chainId: ${chainId}`);
  return e.chain.rpcUrls.default.http[0];
}
