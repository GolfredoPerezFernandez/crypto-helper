import { db } from "~/lib/turso";
import { analyzedAddresses, freshSignals } from "../../../drizzle/schema";

export async function insertFreshWalletSignal(message: {
  summaryMessage: string;
  totalBalanceInEth: number;
  balanceInUsd: number;
  totalHttpRequests: number;
  analyzedAddresses: { address: string; balance: string }[];
}) {
  const createdAt = Math.floor(Date.now() / 1000);
  const [row] = await db
    .insert(freshSignals)
    .values({
      summaryMessage: message.summaryMessage,
      totalBalanceInEth: String(message.totalBalanceInEth),
      balanceInUsd: String(message.balanceInUsd),
      totalHttpRequests: message.totalHttpRequests,
      createdAt,
      balance: "",
    })
    .returning();

  if (!row) return null;

  for (const a of message.analyzedAddresses) {
    await db.insert(analyzedAddresses).values({
      freshSignalId: row.id,
      address: a.address,
      balance: a.balance,
    });
  }
  return row;
}
