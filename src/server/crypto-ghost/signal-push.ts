import { sendLiveSignalPush } from "~/lib/webpush";

function defaultLocale() {
  return (
    (typeof process !== "undefined" && process.env.PUBLIC_DEFAULT_LOCALE?.trim()) ||
    "en-us"
  );
}

export function notifyWhaleOrTraderPush(kind: "whale" | "trader", sseJson: string): void {
  try {
    const p = JSON.parse(sseJson) as Record<string, string | undefined>;
    const title = String(
      p.alert || (kind === "whale" ? "Whale alert" : "Smart money alert"),
    );
    const body =
      [p.chain, p.swapped, p.netWorth].filter(Boolean).join(" · ") || title;
    const loc = defaultLocale();
    const link =
      kind === "whale"
        ? `/${loc}/dashboard/whales-signals/`
        : `/${loc}/dashboard/traders-signals/`;
    const tag = `cg-${kind}-${p.transactionHash || Date.now()}`;
    void sendLiveSignalPush(kind, {
      title: title.slice(0, 200),
      body: body.slice(0, 500),
      data: { link, kind, tag },
    });
  } catch (e) {
    console.error("[signal-push] whale/trader", e);
  }
}

export function notifySmartSignalPush(sseJson: string): void {
  try {
    const parsed = JSON.parse(sseJson) as { message?: { summaryMessage?: string } };
    const title = "USDT smart alert";
    const body = String(parsed.message?.summaryMessage || "Fresh wallet activity").slice(0, 500);
    const loc = defaultLocale();
    const link = `/${loc}/dashboard/smart-signals/`;
    void sendLiveSignalPush("smart", {
      title,
      body,
      data: { link, kind: "smart", tag: `cg-smart-${Date.now()}` },
    });
  } catch (e) {
    console.error("[signal-push] smart", e);
  }
}
