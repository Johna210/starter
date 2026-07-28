// Materializer: packages/api-client templates (typed Hono RPC client).
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 3 files written into packages/api-client (package.json, tsconfig,
// src/index.ts). The orchestrator (materialize.ts) calls
// writeApiClient(ctx); template functions are private to this module.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeApiClient(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeFileRecursive(join(targetDir, 'packages/api-client/package.json'), apiClientPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/api-client/tsconfig.json'), apiClientTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/api-client/src/index.ts'), apiClientIndexTs());
}

function apiClientPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/api-client',
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@starter/api': 'workspace:*',
        hono: '^4.6.0',
      },
      devDependencies: {
        typescript: '^5.9.3',
      },
    },
    null,
    2,
  ) + '\n';
}

function apiClientTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        isolatedModules: true,
        noEmit: true,
      },
      include: ['src/**/*'],
    },
    null,
    2,
  ) + '\n';
}

function apiClientIndexTs(): string {
  return `// @starter/api-client — typed Hono RPC client (decision 17, 18).
//
// The web (apps/web) and mobile (apps/mobile) reach apps/api through this
// client. Hono RPC (\`hc<typeof app>()\`) gives end-to-end type inference:
// the route paths, request shapes, and response types are all derived from
// the api's Hono app. No codegen, no artifact (decision 3: the contract is
// inferred from the implementation, not authored as a separate spec).
//
// Transport (decision 17b): the SPA variant is fully batched. Hono RPC's
// \`hc()\` makes one HTTP request per call (no batch layer like tRPC's
// httpBatchLink), and the SPA has no server-side fetch to memoize against,
// so the simple \`hc(url)\` shape is correct out of the box.
//
// The base URL is provided by the consumer — web reads it from Vite env,
// mobile reads it from app config, tests pass a localhost URL. The
// api-client itself stays runtime-agnostic (no vite/client types).
//
// Optional \`Hono RPC options\` (a \`fetch\` override, headers, etc.) are
// forwarded to \`hc()\` so the web can plug in a Bearer-attaching,
// refresh-on-401 fetch without forking the api-client (issue 06).

import { hc, type ClientRequestOptions } from 'hono/client';
import type { AppType } from '@starter/api';

export type ApiClient = ReturnType<typeof hc<AppType>>;

export function createApiClient(
  baseUrl: string,
  options?: ClientRequestOptions,
): ApiClient {
  return hc<AppType>(baseUrl, options);
}

export type { AppType } from '@starter/api';
`;
}
