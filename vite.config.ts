// vite.config.ts
import { defineConfig, type Plugin, type UserConfig } from 'vite';
import { qwikVite } from '@builder.io/qwik/optimizer';
import { qwikCity } from '@builder.io/qwik-city/vite';
import { qwikPwa, type PWAOptions } from '@qwikdev/pwa';

const VIRTUAL_LIBSQL_NODE = '\0virtual:libsql-client-node-stub';

/** Client bundles must not pull native/sqlite3; SSR (Express adapter) uses the real package. */
function libsqlClientNodeClientStub(): Plugin {
  let ssrBuild = false;
  return {
    name: 'libsql-client-node-client-stub',
    enforce: 'pre',
    configResolved(config) {
      ssrBuild = config.build.ssr === true;
    },
    resolveId(id) {
      if (id !== '@libsql/client/node') return null;
      if (ssrBuild) return null;
      return VIRTUAL_LIBSQL_NODE;
    },
    load(id) {
      if (id !== VIRTUAL_LIBSQL_NODE) return null;
      return `export function createClient() {
  throw new Error("@libsql/client/node is server-only");
}`;
    },
  };
}

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
  const isProd = mode === 'production';
  const isDev = command === 'serve';

  // Cargas dinámicas para mayor robustez en CI
  const tsconfigPaths = (await import('vite-tsconfig-paths')).default;
  const tailwindcssPlugin = (await import('@tailwindcss/vite')).default;

  // Activa config avanzada del PWA con env (sólo en build; en dev se omite para no cargar sharp/libvips)
  const pwaConfig: PWAOptions | undefined =
    process.env.CUSTOM_CONFIG === 'true' ? { config: true } : undefined;
  const pwaPluginOptions: PWAOptions =
    isDev
      ? { preset: false }
      : (pwaConfig ?? { preset: 'minimal-2023' });

  return {
    plugins: [
      libsqlClientNodeClientStub(),
      qwikCity({
        // URL segment → filesystem segment: each route path segment is passed through this map.
        // So `marketplace` in src/routes is also served under `all-nfts`; `documentation` under `docs`.
        rewriteRoutes: [
          {
            paths: {
              marketplace: 'all-nfts',
              documentation: 'docs',
            },
          },
        ],
      }),
      qwikVite(),
      tsconfigPaths(),
      qwikPwa(pwaPluginOptions),
      tailwindcssPlugin(),
    ],


    envPrefix: ['PUBLIC_', 'VITE_'],

    server: {
      port: 3000,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
      watch: {
        // Ignore database files to prevent hot reload when chat messages are saved
        ignored: ['**/chat.db', '**/chat.db-shm', '**/chat.db-wal'],
      },
    },
    preview: {
      port: 3000,
      headers: { 'Cache-Control': 'public, max-age=600' },
    },

    resolve: {
      alias: {
        // Alias útil sólo en cliente/dev (cuando alguna lib usa `node:buffer`)
        ...(isDev ? { 'node:buffer': 'buffer' } : {}),
      },
    },

    optimizeDeps: {
      // Evita prebundle en dev de libs sólo-SSR (Storacha)
      exclude: [
        '@storacha/client',
        '@storacha/client/proof',
        '@storacha/client/principal/ed25519',
        '@storacha/client/stores/memory',
      ],
      include: [],
      esbuildOptions: {
        define: { global: 'globalThis' },
      },
    },

    ssr: {
      // Mantén estas deps como externas en SSR (no polyfills)
      external: [
        '@storacha/client',
        '@storacha/client/proof',
        '@storacha/client/principal/ed25519',
        '@storacha/client/stores/memory',
      ],
      // Asegura que Qwik no se externalice por accidente
      noExternal: [/^@builder\.io\/qwik.*/, 'qwik-speak'],
    },

    build: {
      target: 'esnext',
      sourcemap: !isProd,
    },

    define: {
      __DEV__: !isProd,
    },
  };
});
