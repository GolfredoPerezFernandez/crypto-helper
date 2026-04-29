import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ params, redirect }) => {
  throw redirect(308, `/${params.locale ?? "en-us"}/dashboard/smart-signals/`);
};
