/** Map LibSQL / SQLite setup errors to an actionable user message. */
export function migrateHintMessage(err: unknown): string | null {
    const fromCause =
        err &&
        typeof err === "object" &&
        "cause" in err &&
        err.cause &&
        typeof err.cause === "object" &&
        "message" in err.cause
            ? String((err.cause as { message?: string }).message)
            : "";
    const top =
        err instanceof Error ? err.message : typeof err === "string" ? err : "";
    const msg = `${fromCause} ${top}`.trim();
    if (/no such table/i.test(msg)) {
        return "Database tables are missing. Run npm run drizzle:migrate from the project root with PRIVATE_TURSO_DATABASE_URL and PRIVATE_TURSO_AUTH_TOKEN set in .env.";
    }
    return null;
}
