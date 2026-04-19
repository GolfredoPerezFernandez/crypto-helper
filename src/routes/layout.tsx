import { component$, Slot } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';

export const onRequest: RequestHandler = async () => {
  const { waitForTursoMigrations } = await import('~/lib/turso');
  await waitForTursoMigrations();
};

export const onGet: RequestHandler = async ({ cacheControl }) => {
  // Disable global caching because children layouts rely on user-specific auth cookies
  cacheControl('no-cache');
};

export default component$(() => {
  return <Slot />;
});
