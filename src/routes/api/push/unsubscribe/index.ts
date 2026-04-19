import type { RequestHandler } from "@builder.io/qwik-city";
import { and, eq } from "drizzle-orm";
import { db } from "~/lib/turso";
import { pushSubscriptions } from "../../../../../drizzle/schema";
import { rejectCrossOriginPushPost } from "~/lib/push-api-guard";
import { getUserId } from "~/utils/auth";

export const onGet: RequestHandler = async ({ json }) => {
  json(200, { method: "POST" });
};

export const onPost: RequestHandler = async (event) => {
  if (rejectCrossOriginPushPost(event)) return;

  const uid = getUserId(event);
  if (!uid) {
    event.json(401, { error: "Unauthorized" });
    return;
  }

  const userId = Number.parseInt(uid, 10);
  if (!Number.isFinite(userId)) {
    event.json(400, { error: "Invalid session" });
    return;
  }

  const body = (await event.parseBody()) as { endpoint?: string } | undefined;
  const endpoint = String(body?.endpoint || "").trim();
  if (!endpoint) {
    event.json(400, { error: "endpoint required" });
    return;
  }

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));

  event.json(200, { success: true });
};
