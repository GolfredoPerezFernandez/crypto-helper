import type { RequestHandler } from "@builder.io/qwik-city";
import { eq } from "drizzle-orm";
import { db } from "~/lib/turso";
import { pushSubscriptions, users } from "../../../../../drizzle/schema";
import { isValidWebPushEndpoint, rejectCrossOriginPushPost } from "~/lib/push-api-guard";
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

  const userRow = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
  if (!userRow) {
    event.json(401, { error: "Unauthorized" });
    return;
  }

  const body = (await event.parseBody()) as Record<string, unknown> | undefined;
  const endpoint = String(body?.endpoint || "").trim();
  const keys = body?.keys as { p256dh?: string; auth?: string } | undefined;
  const p256dh = String(keys?.p256dh || "").trim();
  const auth = String(keys?.auth || "").trim();

  if (!endpoint || !p256dh || !auth) {
    event.json(400, { error: "Invalid subscription object" });
    return;
  }

  if (!isValidWebPushEndpoint(endpoint)) {
    event.json(400, { error: "Invalid push endpoint URL" });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const id = `push_${crypto.randomUUID()}`;

  await db
    .insert(pushSubscriptions)
    .values({
      id,
      userId,
      endpoint,
      p256dh,
      auth,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
      set: {
        p256dh,
        auth,
        createdAt: now,
      },
    });

  event.json(200, { success: true });
};
