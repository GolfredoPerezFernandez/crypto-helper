/**
 * Watches mainnet USDT Transfer events to detect recipients that look like "fresh" wallets
 * (first on-chain activity within ~30 days per Moralis), accumulates ETH received, then
 * periodically persists a summary to Turso and emits smartEmitter 'alert'.
 */
import Moralis from "moralis";
import { createPublicClient, formatUnits, http, parseAbiItem } from "viem";
import { mainnet } from "viem/chains";
import { insertFreshWalletSignal } from "./fresh-signal-db";
import { notifySmartSignalPush } from "./signal-push";
import type { EventEmitter } from "node:events";

const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7" as const;

let httpRequestCount = 0;
let totalBalance = 0;
const hourlyRecipients = new Set<string>();
const hourlyBalances = new Map<string, string>();
let dailyBalance = 0;
let weeklyBalance = 0;
let monthlyBalance = 0;
const processedRecipients = new Set<string>();

async function ensureMoralis() {
  const key = process.env.MORALIS_API_KEY?.trim();
  if (!key) return false;
  if (!Moralis.Core.isStarted) {
    await Moralis.start({ apiKey: key });
  }
  return true;
}

function incHttp() {
  httpRequestCount++;
}

async function isFreshWallet(
  address: string,
  analyzed: Set<string>,
  ignored: Set<string>,
): Promise<boolean> {
  if (processedRecipients.has(address) || analyzed.has(address) || ignored.has(address)) return false;
  if (address.toLowerCase() === USDT.toLowerCase()) {
    ignored.add(address);
    return false;
  }
  if (!(await ensureMoralis())) return false;
  try {
    incHttp();
    const response = await Moralis.EvmApi.wallets.getWalletActiveChains({
      address,
      chains: ["0x1"],
    });
    const chains = response?.raw?.active_chains as any[] | undefined;
    if (chains?.length) {
      const firstTs = new Date(chains[0].first_transaction.block_timestamp);
      const month = new Date();
      month.setDate(month.getDate() - 30);
      if (firstTs >= month) {
        analyzed.add(address);
        return true;
      }
    }
    return false;
  } catch (e: any) {
    if (e?.response?.status === 400) ignored.add(address);
    return false;
  }
}

export function startUsdtWatcher(smartEmitter: EventEmitter, rpcUrl: string): () => void {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl, { timeout: 60_000, retryCount: 3, retryDelay: 100 }),
  });

  const transferEvent = parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  );

  const processLogs = async (
    logs: Array<{ transactionHash: `0x${string}`; args: { to?: `0x${string}` } }>,
  ) => {
    const processedTx = new Set<string>();
    const balances = new Map<string, bigint>();
    const analyzed = new Set<string>();
    const ignored = new Set<string>();

    for (const log of logs) {
      const txHash = log.transactionHash;
      if (processedTx.has(txHash)) continue;
      processedTx.add(txHash);

      const recipient = log.args.to;
      if (!recipient) continue;

      try {
        const fresh = await isFreshWallet(recipient, analyzed, ignored);
        if (!fresh) continue;
        incHttp();
        const balance = await client.getBalance({ address: recipient, blockTag: "latest" });
        if (balance > 0n) {
          balances.set(recipient, balance);
          processedRecipients.add(recipient);
          const formatted = formatUnits(balance, 18);
          hourlyBalances.set(recipient, formatted);
          hourlyRecipients.add(recipient);
        }
      } catch (err) {
        console.error("[USDT watcher] log error", txHash, err);
      }
    }

    const wei = [...balances.values()].reduce((a, b) => a + b, 0n);
    const eth = parseFloat(formatUnits(wei, 18));
    totalBalance += eth;
    dailyBalance += eth;
    weeklyBalance += eth;
    monthlyBalance += eth;
  };

  const pollMs = Number(process.env.USDT_WATCHER_POLL_MS ?? 12_000);
  const chunkSize = Math.max(1, Number(process.env.USDT_WATCHER_BLOCK_CHUNK ?? 2));
  const confirmations = Math.max(0, Number(process.env.USDT_WATCHER_CONFIRMATIONS ?? 2));
  let nextFromBlock: bigint | null = null;
  let polling = false;

  const pollLogs = async () => {
    if (polling) return;
    polling = true;
    try {
      const head = await client.getBlockNumber();
      const safeHead = head > BigInt(confirmations) ? head - BigInt(confirmations) : 0n;

      if (nextFromBlock == null) {
        nextFromBlock = safeHead;
        return;
      }
      if (nextFromBlock > safeHead) return;

      const toBlock = nextFromBlock + BigInt(chunkSize - 1) > safeHead
        ? safeHead
        : nextFromBlock + BigInt(chunkSize - 1);

      const logs = await client.getLogs({
        address: USDT,
        event: transferEvent,
        fromBlock: nextFromBlock,
        toBlock,
      });
      await processLogs(logs as Array<{ transactionHash: `0x${string}`; args: { to?: `0x${string}` } }>);
      nextFromBlock = toBlock + 1n;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("beyond current head block")) {
        // RPC head can lag briefly; skip this cycle without noisy stack traces.
        return;
      }
      console.error("[USDT watcher]", err);
    } finally {
      polling = false;
    }
  };

  const intervalMs = Number(process.env.SMART_ALERT_INTERVAL_MS || 10 * 60 * 1000);

  const tick = async () => {
    if (!(await ensureMoralis())) return;
    let ethUsd = 0;
    try {
      const price = await Moralis.EvmApi.token.getTokenPrice({
        address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        chain: "0x1",
      });
      ethUsd = Number(price.raw.usdPrice || 0);
    } catch {
      ethUsd = 0;
    }
    const usd = totalBalance * ethUsd;
    if (totalBalance <= 0) {
      console.log("[USDT watcher] no accumulated balance this window");
      return;
    }

    const analyzedList = [...hourlyRecipients].map((address) => ({
      address,
      balance: hourlyBalances.get(address) || "0",
    }));

    const message = {
      balanceInUsd: usd,
      totalBalanceInEth: totalBalance,
      dailyBalance,
      weeklyBalance,
      monthlyBalance,
      analyzedAddresses: analyzedList,
      createdAt: new Date(),
      totalHttpRequests: httpRequestCount,
      summaryMessage: `Fresh wallets received ${totalBalance.toFixed(4)} ETH (~$${usd.toFixed(2)} USD).`,
    };

    await insertFreshWalletSignal({
      summaryMessage: message.summaryMessage,
      totalBalanceInEth: totalBalance,
      balanceInUsd: usd,
      totalHttpRequests: httpRequestCount,
      analyzedAddresses: analyzedList,
    });

    const smartPayload = JSON.stringify({ message });
    smartEmitter.emit("alert", smartPayload);
    notifySmartSignalPush(smartPayload);

    totalBalance = 0;
    hourlyRecipients.clear();
    hourlyBalances.clear();
  };

  const pollInterval = setInterval(() => {
    pollLogs().catch((e) => console.error("[USDT watcher] poll", e));
  }, pollMs);

  const interval = setInterval(() => {
    tick().catch((e) => console.error("[USDT watcher] tick", e));
  }, intervalMs);

  return () => {
    clearInterval(pollInterval);
    clearInterval(interval);
  };
}
