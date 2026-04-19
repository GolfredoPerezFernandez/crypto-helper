import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ json }) => {
  json(200, { ok: true, service: "crypto-helper", timestamp: Date.now() });
};
