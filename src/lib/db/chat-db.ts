import type { Client } from "@libsql/client/node";
import { createClient } from "@libsql/client/node";

// Simple chat schema (messages between owner and offer makers per token + market)
// Table: chat_messages
// id INTEGER PK AUTOINCREMENT
// token_id TEXT
// market TEXT ('rental' | 'power')
// from_address TEXT
// to_address TEXT NULL
// body TEXT
// created_at INTEGER (unix epoch seconds)

let _client: Client | null = null;
let _initialized = false;

function getEnvVar(name: string, fallback?: string) {
  if (typeof process !== 'undefined' && process.env[name]) return process.env[name] as string;
  // Qwik server RequestEvent.env should be used inside handlers; here we just fallback
  return fallback;
}

export function getChatDbClient(dbUrl?: string, authToken?: string) {
  if (_client) return _client;
  const url =
    dbUrl ||
    (getEnvVar("PRIVATE_CHAT_DB_URL") || "").trim() ||
    (getEnvVar("PRIVATE_TURSO_DATABASE_URL") || "").trim() ||
    "file:chat.db";
  const token =
    authToken ||
    (getEnvVar("PRIVATE_CHAT_DB_AUTH_TOKEN") || "").trim() ||
    (getEnvVar("PRIVATE_TURSO_AUTH_TOKEN") || "").trim() ||
    undefined;
  
  // Ensure url is defined
  if (!url) {
    throw new Error('Database URL is required');
  }
  
  _client = createClient(token ? { url, authToken: token } : { url });
  return _client;
}

export async function initChatSchema(client: Client) {
  if (_initialized) return;
  await client.execute(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id TEXT NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('rental','power')),
    from_address TEXT NOT NULL,
    to_address TEXT,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_chat_token_market ON chat_messages(token_id, market, created_at);`);
  _initialized = true;
}

export interface ChatMessage {
  id: number;
  token_id: string;
  market: 'rental' | 'power';
  from_address: string;
  to_address?: string | null;
  body: string;
  created_at: number; // epoch seconds
}

export async function getMessages(client: Client, tokenId: string, market: 'rental' | 'power', limit = 100): Promise<ChatMessage[]> {
  const res = await client.execute({
    sql: `SELECT * FROM chat_messages WHERE token_id = ? AND market = ? ORDER BY created_at DESC LIMIT ?`,
    args: [tokenId, market, limit]
  });
  return res.rows as unknown as ChatMessage[];
}

// Get private messages between two specific addresses (bidirectional)
export async function getPrivateMessages(
  client: Client, 
  tokenId: string, 
  market: 'rental' | 'power',
  address1: string,
  address2: string,
  limit = 100
): Promise<ChatMessage[]> {
  const a1 = address1.toLowerCase();
  const a2 = address2.toLowerCase();
  const res = await client.execute({
    sql: `SELECT * FROM chat_messages 
          WHERE token_id = ? AND market = ? 
          AND ((from_address = ? AND to_address = ?) OR (from_address = ? AND to_address = ?))
          ORDER BY created_at DESC LIMIT ?`,
    args: [tokenId, market, a1, a2, a2, a1, limit]
  });
  return res.rows as unknown as ChatMessage[];
}

// Get list of unique conversation partners for a given address
export async function getConversationPartners(
  client: Client,
  tokenId: string,
  market: 'rental' | 'power',
  myAddress: string
): Promise<string[]> {
  const addr = myAddress.toLowerCase();
  const res = await client.execute({
    sql: `SELECT DISTINCT 
          CASE 
            WHEN from_address = ? THEN to_address
            ELSE from_address
          END as partner
          FROM chat_messages
          WHERE token_id = ? AND market = ?
          AND (from_address = ? OR to_address = ?)
          AND partner IS NOT NULL
          ORDER BY partner`,
    args: [addr, tokenId, market, addr, addr]
  });
  return res.rows.map(row => row.partner as string).filter(Boolean);
}

export async function addMessage(client: Client, msg: Omit<ChatMessage, 'id' | 'created_at'> & { created_at?: number }) {
  const created = msg.created_at || Math.floor(Date.now() / 1000);
  await client.execute({
    sql: `INSERT INTO chat_messages (token_id, market, from_address, to_address, body, created_at) VALUES (?,?,?,?,?,?)`,
    args: [msg.token_id, msg.market, msg.from_address, msg.to_address ?? null, msg.body, created]
  });
  return created;
}

export async function clearMessages(client: Client, tokenId: string, market: 'rental' | 'power') {
  await client.execute({
    sql: `DELETE FROM chat_messages WHERE token_id = ? AND market = ?`,
    args: [tokenId, market]
  });
}
