// @deprecated Prefer ~/server/crypto-ghost-actions (server$) — NEVER put API keys in client bundles.
const API_KEY =
  typeof process !== "undefined" ? String(process.env.MORALIS_API_KEY ?? "") : "";

const BASE_URL = "https://deep-index.moralis.io/api/v2.2";

async function moralisFetch(path: string) {
  const url = `${BASE_URL}${path}`;
  const resp = await fetch(url, {
    headers: {
      "X-API-Key": API_KEY,
    },
  });
  return resp.json();
}

/* ---------------- Wallet Overview ---------------- */
export const getWalletOverview = (address: string) =>
  moralisFetch(`/wallets/${address}?chain=base`);

/* ---------------- Native Balance ---------------- */
export const getNativeBalance = (address: string) =>
  moralisFetch(`/wallets/${address}/balance?chain=base`);

/* ---------------- ERC20 Tokens ---------------- */
export const getErc20Tokens = (address: string) =>
  moralisFetch(`/wallets/${address}/tokens?chain=base&order=usd_value.DESC`);

/* ---------------- Token Prices ---------------- */
export const getTokenPrices = (addresses: string[]) =>
  moralisFetch(
    `/tokens/prices?chain=base&addresses=${addresses.join(
      ","
    )}&include=percent_change`
  );

/* ---------------- ERC20 Transfers ---------------- */
export const getTokenTransfers = (address: string) =>
  moralisFetch(`/wallets/${address}/erc20/transfers?chain=base&order=block_timestamp.DESC&limit=50`);

/* ---------------- Native Transactions ---------------- */
export const getTransactions = (address: string) =>
  moralisFetch(`/wallets/${address}/transactions?chain=base&order=block_timestamp.DESC&limit=50`);

/* ---------------- NFTs ---------------- */
export const getNFTs = (address: string) =>
  moralisFetch(`/wallets/${address}/nfts?chain=base`);

/* ---------------- Allowances / Approvals ---------------- */
export const getApprovals = (address: string) =>
  moralisFetch(`/wallets/${address}/approval-check?chain=base`);

/* ---------------- ENS ---------------- */
export const getEnsName = (address: string) =>
  moralisFetch(`/resolve/${address}/reverse`);
