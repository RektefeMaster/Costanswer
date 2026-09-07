import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json' with { type: 'json' };

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

/*
 * The monetization database.
 *
 * Bound only when MONETIZATION_D1_DATABASE_ID is set. Its absence is not an
 * error: every calculator works without it and the lead channel reports itself
 * unavailable rather than collecting a phone number it cannot store a consent
 * record for. Provision with:
 *   wrangler d1 create costanswer-monetization
 *   wrangler d1 execute costanswer-monetization \
 *     --file lib/monetization/store/migrations/0001_monetization.sql
 */
const monetizationDatabaseId = process.env.MONETIZATION_D1_DATABASE_ID;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/app-router-entry',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: [
    ...(d1
      ? [{
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        }]
      : []),
    ...(monetizationDatabaseId
      ? [{
          binding: 'MONETIZATION_DB',
          database_name: 'costanswer-monetization',
          database_id: monetizationDatabaseId,
        }]
      : []),
  ],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  const plugins = [vinext(), sites()];
  // Vercel is a Node host. The Cloudflare Vite plugin emits a Worker and can
  // stall SSR chunk emit when workerd install scripts were skipped.
  if (process.env.VERCEL !== '1') {
    const { cloudflare } = await import('@cloudflare/vite-plugin');
    plugins.push(cloudflare({
      viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
      config: localBindingConfig,
    }));
  }

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins,
  };
});
