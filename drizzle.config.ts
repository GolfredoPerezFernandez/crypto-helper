import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const url =
  process.env.PRIVATE_TURSO_DATABASE_URL || "file:./drizzle/db/db.sqlite";

/** Remote Turso / libSQL HTTP(S) needs dialect `turso` + auth token for drizzle-kit migrate. */
const isRemoteLibsql =
  url.startsWith("libsql://") ||
  url.startsWith("https://") ||
  url.startsWith("wss://");

export default defineConfig({
  dialect: isRemoteLibsql ? "turso" : "sqlite",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations/",
  dbCredentials: isRemoteLibsql
    ? {
        url,
        authToken: process.env.PRIVATE_TURSO_AUTH_TOKEN ?? "",
      }
    : { url },
});
