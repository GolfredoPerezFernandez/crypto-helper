import { ChatOpenAI } from "@langchain/openai";
import { createAgent, tool } from "langchain";
import { z } from "zod";
import { db } from "~/lib/turso";
import {
  DB_CHAT_RESTRICTED_TABLE_NAMES,
  DB_CHAT_SCHEMA_DOCS,
  sanitizeSqlQuery,
  SqlSafetyError,
} from "./db-sql-safety";

function getLibsqlClient() {
  return (db as unknown as { $client: { execute: (sql: string) => Promise<{ rows: unknown }> } }).$client;
}

/** Fixed read-only probe (not user SQL); sqlite_master is blocked for the LLM tool by design. */
async function fetchDeployTableListForPrompt(): Promise<string> {
  try {
    const client = getLibsqlClient();
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const restricted = new Set<string>([...DB_CHAT_RESTRICTED_TABLE_NAMES]);
    const lines: string[] = [];
    const rows = Array.isArray(result.rows) ? result.rows : [];
    for (const row of rows as Record<string, unknown>[]) {
      const raw = row["name"];
      const name = typeof raw === "string" ? raw : raw != null ? String(raw) : "";
      if (!name) continue;
      lines.push(restricted.has(name) ? `- ${name} (RESTRICTED — do not query)` : `- ${name}`);
    }
    if (!lines.length) return "";
    const block = ["### Tables in this deployment", ...lines].join("\n");
    return block.length > 12_000 ? `${block.slice(0, 12_000)}\n… (truncated)` : block;
  } catch (e) {
    console.warn("[db-chat-agent] table list probe failed", e);
    return "";
  }
}

function getModelName() {
  return (process.env.OPENAI_DB_CHAT_MODEL || "gpt-4o-mini").trim();
}

async function buildSystemPrompt() {
  const tableBlock = await fetchDeployTableListForPrompt();
  return `You are a careful read-only analyst for the Crypto Helper Turso database.

${DB_CHAT_SCHEMA_DOCS}

${tableBlock ? `${tableBlock}\n` : ""}
Rules:
- Think step by step.
- When you need data, call execute_sql with exactly ONE SELECT query.
- Read-only only; the server rejects anything that is not a safe SELECT.
- Prefer explicit column lists; avoid SELECT * on wide tables (e.g. snapshots).
- If execute_sql returns an error string, fix the SQL and try again (max ~5 attempts).
- If you cannot answer without restricted data, say so clearly.
- Answer in the same language as the user when possible (default Spanish for this product).

Public investment context:
- Users may ask for informal, educational commentary on patterns in the stored market data (tokens, signals, sync health).
- Base answers on query results; label uncertainty. Never claim guaranteed returns or personalized advice for their portfolio.
- Remind that this is not financial, tax, or legal advice and past/on-chain activity does not predict future results.
`;
}

export async function runCryptoHelperDbChat(userQuestion: string): Promise<{ answer: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { answer: "", error: "OPENAI_API_KEY is not configured." };
  }

  const model = new ChatOpenAI({
    model: getModelName(),
    apiKey,
    temperature: 0,
  });

  const executeSql = tool(
    async ({ query }: { query: string }) => {
      try {
        const q = sanitizeSqlQuery(query);
        const client = getLibsqlClient();
        const result = await client.execute(q);
        const text =
          typeof result.rows === "string"
            ? result.rows
            : JSON.stringify(result.rows ?? [], null, 2);
        if (text.length > 48_000) {
          return text.slice(0, 48_000) + "\n… (truncated)";
        }
        return text || "[]";
      } catch (e: unknown) {
        if (e instanceof SqlSafetyError) {
          return `Error: ${e.message}`;
        }
        const msg = e instanceof Error ? e.message : String(e);
        return `Error: ${msg}`;
      }
    },
    {
      name: "execute_sql",
      description:
        "Execute a single read-only SQLite SELECT against Crypto Helper Turso. Returns JSON rows or an Error: prefix.",
      schema: z.object({
        query: z
          .string()
          .describe(
            "One SELECT only; must not reference users, push_subscriptions, or pro_payment_receipts.",
          ),
      }),
    },
  );

  const agent = createAgent({
    model,
    tools: [executeSql],
    systemPrompt: await buildSystemPrompt(),
  });

  try {
    const result = await agent.invoke(
      { messages: [{ role: "user", content: userQuestion }] },
      { recursionLimit: 25 },
    );

    const messages = (result as { messages?: Array<{ content?: unknown }> }).messages;
    const last = messages?.at?.(-1);
    const content = last?.content;
    const answer =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content
              .map((c) => (typeof c === "object" && c && "text" in c ? String((c as { text: string }).text) : ""))
              .join("")
          : JSON.stringify(content ?? "");

    return { answer: answer || "(Sin respuesta del modelo.)" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[db-chat-agent]", e);
    return { answer: "", error: msg };
  }
}
