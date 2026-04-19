#!/usr/bin/env node
/**
 * POST a minimal Moralis-like webhook body to test whale/trader pipelines locally.
 * Requires: Express on WEBHOOK_BASE (default http://localhost:3000), MORALIS_API_KEY if the fixture should persist + enrich.
 *
 * Usage:
 *   node scripts/post-moralis-webhook-fixture.mjs [baseUrl] [whales|traders]
 *
 * Examples:
 *   node scripts/post-moralis-webhook-fixture.mjs
 *   node scripts/post-moralis-webhook-fixture.mjs http://127.0.0.1:3000 traders
 */
const base =
  process.argv[2] ||
  process.env.WEBHOOK_BASE ||
  "http://localhost:3000";
const kind = (process.argv[3] || "whales").toLowerCase();
const path =
  kind.startsWith("trade") || kind === "t"
    ? "/api/webhook/moralis/traders"
    : "/api/webhook/moralis/whales";

const tx =
  "0x" + "ab".repeat(32);

/** One involved address with exactly one outgoing + one incoming ERC20 in the same tx (matches checkAndEmit). */
const watch = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

const body = {
  confirmed: false,
  chainId: "0x1",
  transactionHash: tx,
  logs: [{ triggered_by: [watch] }],
  erc20Transfers: [
    {
      from: watch,
      to: "0x1111111111111111111111111111111111111111",
      tokenName: "Wrapped Ether",
      tokenSymbol: "WETH",
      value: "1",
      valueWithDecimals: "1",
      decimals: "18",
      transactionHash: tx,
    },
    {
      from: "0x2222222222222222222222222222222222222222",
      to: watch,
      tokenName: "USD Coin",
      tokenSymbol: "USDC",
      value: "3000",
      valueWithDecimals: "3000",
      decimals: "6",
      transactionHash: tx,
    },
  ],
};

const url = new URL(path, base).href;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(res.status, url);
console.log(text);

if (!res.ok) process.exit(1);
