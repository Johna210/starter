// Materializer: packages/api-client templates (typed Hono RPC client).
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 3 files written into packages/api-client (package.json, tsconfig,
// src/index.ts). The orchestrator (materialize.ts) calls
// writeApiClient(ctx); template functions are private to this module.

import { join } from 'node:path';
import { type Composition } from '../composition.js';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeApiClient(ctx: ProjectContext, composition?: Composition): Promise<void> {
  const { targetDir } = ctx;
  const isMicroservices = composition?.topology === 'microservices';

  await writeFileRecursive(
    join(targetDir, 'packages/api-client/package.json'),
    apiClientPackageJson(isMicroservices),
  );
  await writeFileRecursive(join(targetDir, 'packages/api-client/tsconfig.json'), apiClientTsconfigJson());
  await writeFileRecursive(
    join(targetDir, 'packages/api-client/src/index.ts'),
    apiClientIndexTs(isMicroservices),
  );
}

function apiClientPackageJson(isMicroservices: boolean): string {
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
        ...(isMicroservices
          ? { '@starter/api': 'workspace:*', '@starter/api-auth': 'workspace:*' }
          : { '@starter/api': 'workspace:*' }),
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

function apiClientIndexTs(isMicroservices: boolean): string {
  if (isMicroservices) {
    return `// @starter/api-client — typed Hono RPC clients (decision 17, 18, 10).
//
// Shape 2 (TS-microservices): there are TWO backend services, so the
// api-client exports two typed clients — one for the main api
// (@starter/api, items + health) and one for the auth service
// (@starter/api-auth, register/login/refresh/logout). Both are
// Hono RPC clients (\`hc<typeof app>()\`) with end-to-end type
// inference (decision 17/18: the router's TS type is the contract).
//
// Decision 10/11: the auth service is the SOLE MINTER; apps/api
// verifies tokens locally via the shared @starter/auth package.
// The web reaches both services through the same vite proxy
// (VITE_API_URL is the same-origin path; the proxy routes
// /api/auth/* to api-auth and /api/* to api).
//
// Optional \`Hono RPC options\` (a \`fetch\` override, headers, etc.) are
// forwarded to \`hc()\` so the web can plug in a Bearer-attaching,
// refresh-on-401 fetch without forking the api-client (issue 06).

import { hc, type ClientRequestOptions } from 'hono/client';
import type { AppType as ApiAppType } from '@starter/api';
import type { AppType as ApiAuthAppType } from '@starter/api-auth';

export type ApiClient = ReturnType<typeof hc<ApiAppType>>;
export type ApiAuthClient = ReturnType<typeof hc<ApiAuthAppType>>;

export function createApiClient(
  baseUrl: string,
  options?: ClientRequestOptions,
): ApiClient {
  return hc<ApiAppType>(baseUrl, options);
}

export function createApiAuthClient(
  baseUrl: string,
  options?: ClientRequestOptions,
): ApiAuthClient {
  return hc<ApiAuthAppType>(baseUrl, options);
}

export type { ApiAppType, ApiAuthAppType };
`;
  }
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
