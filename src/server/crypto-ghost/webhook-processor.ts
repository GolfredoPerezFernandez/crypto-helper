import Moralis from "moralis";
import { db } from "~/lib/turso";
import { signalTraders, signalWhales } from "../../../drizzle/schema";
import { traderEmitter, whaleEmitter } from "~/server/realtime/emitters";
import { notifyWhaleOrTraderPush } from "~/server/crypto-ghost/signal-push";

const CHAINS: Record<string, string> = {
  "0x1": "Ethereum Mainnet",
  "0xa86a": "Avalanche Mainnet",
  "0xfa": "Fantom Opera",
  "0x19": "Cronos Mainnet",
  "0xa4b1": "Arbitrum One",
  "0x38": "Binance Smart Chain",
  "0xe708": "Linea",
  "0x2105": "Base Network",
  "0xa": "Optimism",
  "0x89": "Polygon",
};

function chainName(chainId: string) {
  return CHAINS[chainId] || "Unknown Chain";
}

function getInvolvedAddresses(logs: any[]) {
  const addresses = logs.reduce((acc: string[], log: any) => {
    if (log.triggered_by) acc.push(...log.triggered_by);
    return acc;
  }, []);
  return [...new Set(addresses)];
}

function getFromData(transfers: any[], addresses: string[]) {
  const results: Record<string, any[]> = {};
  addresses.forEach((address) => {
    results[address.toLowerCase()] = transfers.filter(
      (transfer: any) => transfer.from?.toLowerCase() === address.toLowerCase(),
    );
  });
  return results;
}

function getToData(transfers: any[], addresses: string[]) {
  const results: Record<string, any[]> = {};
  addresses.forEach((address) => {
    results[address.toLowerCase()] = transfers.filter(
      (transfer: any) => transfer.to?.toLowerCase() === address.toLowerCase(),
    );
  });
  return results;
}

async function ensureMoralis() {
  const key = process.env.MORALIS_API_KEY?.trim();
  if (!key) throw new Error("MORALIS_API_KEY missing");
  if (!Moralis.Core.isStarted) {
    await Moralis.start({ apiKey: key });
  }
}

function enrichRow(
  address: string,
  fromTransfer: any,
  toTransfer: any,
  netWorth: string,
  chainId: string,
  transactionHash: string,
  alertPrefix: "Whale" | "Trader",
) {
  const c = chainName(chainId);
  const now = Math.floor(Date.now() / 1000);
  return {
    address,
    alert: `${alertPrefix} alert on ${c}`,
    chain: c,
    swapped: `${fromTransfer?.valueWithDecimals ?? ""} ${fromTransfer?.tokenSymbol ?? ""}`.trim(),
    fromTokenSymbol: String(fromTransfer?.tokenSymbol ?? ""),
    fromTokenValue: String(fromTransfer?.value ?? fromTransfer?.valueWithDecimals ?? ""),
    toTokenValue: String(toTransfer?.value ?? toTransfer?.valueWithDecimals ?? ""),
    fromTokenName: String(fromTransfer?.tokenName ?? ""),
    fromAddr: String(fromTransfer?.from ?? ""),
    toAddr: String(toTransfer?.to ?? toTransfer?.from ?? ""),
    toTokenDecimals: String(toTransfer?.decimals ?? ""),
    fromTokenDecimals: String(fromTransfer?.decimals ?? ""),
    fromTokenLogo: String(fromTransfer?.logo ?? ""),
    toTokenSlug: String(toTransfer?.tokenSlug ?? ""),
    fromTokenSlug: String(fromTransfer?.tokenSlug ?? ""),
    toTokenLogo: String(toTransfer?.logo ?? ""),
    toTokenSymbol: String(toTransfer?.tokenSymbol ?? ""),
    toTokenName: String(toTransfer?.tokenName ?? ""),
    transactionHash,
    netWorthUsd: netWorth,
    time: now,
  };
}

async function checkAndEmit(
  kind: "whale" | "trader",
  address: string,
  fromData: any[],
  toData: any[],
  chainId: string,
  txFallback: string,
) {
  if (
    fromData?.length === 1 &&
    fromData[0]?.tokenName &&
    fromData[0]?.value &&
    fromData[0]?.to != null &&
    fromData[0]?.to !== "0x0000000000000000000000000000000000000000" &&
    toData?.length === 1 &&
    toData[0]?.tokenName &&
    toData[0]?.from != null &&
    toData[0]?.from !== "0x0000000000000000000000000000000000000000"
  ) {
    await ensureMoralis();
    const response = await Moralis.EvmApi.wallets.getWalletNetWorth({
      chains: [chainId],
      address,
      excludeSpam: true,
      excludeUnverifiedContracts: true,
    });
    const nw = response.toJSON().total_networth_usd ?? "";
    const nwStr = String(nw);
    const fromT = fromData[0];
    const toT = toData[0];
    const txHash = toT.transactionHash || fromT.transactionHash || txFallback || "";

    const row = enrichRow(address, fromT, toT, nwStr, chainId, txHash, kind === "whale" ? "Whale" : "Trader");

    if (kind === "whale") {
      await db.insert(signalWhales).values(row);
    } else {
      await db.insert(signalTraders).values(row);
    }

    const ssePayload = {
      address: row.address,
      alert: row.alert,
      chain: row.chain,
      swapped: row.swapped,
      from: row.fromAddr,
      to: row.toAddr,
      netWorth: `${nwStr} USD`,
      time: new Date(row.time * 1000).toISOString(),
      transactionHash: row.transactionHash,
    };

    const json = JSON.stringify(ssePayload);
    if (kind === "whale") whaleEmitter.emit("message", json);
    else traderEmitter.emit("message", json);
    notifyWhaleOrTraderPush(kind === "whale" ? "whale" : "trader", json);
  }
}

export async function handleMoralisStreamWebhook(body: any, kind: "whale" | "trader"): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!body?.logs?.length || body.confirmed) {
      return { ok: true };
    }

    if (!Moralis.Core.isStarted) {
      await ensureMoralis();
    }

    // Moralis.Streams.parsedLogs requires non-empty `abi`; return value is unused here.
    if (Array.isArray(body.abi) && body.abi.length > 0) {
      Moralis.Streams.parsedLogs(body);
    }

    const addresses = getInvolvedAddresses(body.logs);
    const erc20 = body.erc20Transfers || [];
    const fromD = getFromData(erc20, addresses);
    const toD = getToData(erc20, addresses);
    const chainId = String(body.chainId || "");

    const txFb = String(body.transactionHash || "");
    for (const address of addresses) {
      const key = address.toLowerCase();
      await checkAndEmit(kind, address, fromD[key] || [], toD[key] || [], chainId, txFb);
    }

    return { ok: true };
  } catch (e: any) {
    console.error("[webhook]", e);
    return { ok: false, error: e?.message || String(e) };
  }
}
