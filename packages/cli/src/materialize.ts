// Materializer: writes the scaffolded project for a given composition.
//
// Per issue #3, only the TS-monolith + Vite+TanStack + no-mobile + no-AI
// composition is materializable. All other compositions throw an
// UnimplementedCompositionError; the CLI's own tests assert both paths.
//
// Templates are kept as TS string constants (decision 25b: TS templates
// can be imported as values / type-checked, not embedded as bytes).

import { join } from 'node:path';
import { type Composition, describeComposition, isImplemented } from './composition.js';
// Re-exported to preserve the public API: external code imports
// `ProjectContext` from '../src/materialize.js'.
export type { ProjectContext } from './materialize/_shared.js';
import { type ProjectContext, writeFileRecursive } from './materialize/_shared.js';
import { writeRoot } from './materialize/root.js';

export class UnimplementedCompositionError extends Error {
  public readonly composition: Composition;
  constructor(composition: Composition) {
    super(`Composition not yet implemented: ${describeComposition(composition)}.\n` +
      `The CLI materializer ships one composition in this ticket; the other 23+ are ` +
      `scheduled for later issues. Please choose another combination.`);
    this.name = 'UnimplementedCompositionError';
    this.composition = composition;
  }
}

/** Public API. Throws UnimplementedCompositionError if composition is not yet wired. */
export async function materialize(ctx: ProjectContext, composition: Composition): Promise<void> {
  if (!isImplemented(composition)) {
    throw new UnimplementedCompositionError(composition);
  }
  // Today only one composition is implementable; future issues add more.
  await writeTsMonolithVite(ctx);
}

// ---------- composition writers -------------------------------------------

/** TS-monolith + Vite+TanStack web + no mobile + no AI. */
async function writeTsMonolithVite(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeRoot(ctx);

  // apps/web — Vite + React + TanStack Router shell (no content yet)
  await writeFileRecursive(join(targetDir, 'apps/web/package.json'), webPackageJson());
  await writeFileRecursive(join(targetDir, 'apps/web/tsconfig.json'), webTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/web/vite.config.ts'), webViteConfig());
  await writeFileRecursive(join(targetDir, 'apps/web/index.html'), webIndexHtml());
  await writeFileRecursive(join(targetDir, 'apps/web/.env.example'), webEnvExample());
  await writeFileRecursive(join(targetDir, 'apps/web/src/main.tsx'), webMainTsx());
  await writeFileRecursive(join(targetDir, 'apps/web/src/app.css'), webAppCss());
  await writeFileRecursive(join(targetDir, 'apps/web/src/router.tsx'), webRouter());
  await writeFileRecursive(join(targetDir, 'apps/web/src/pages/index.tsx'), webIndexPage());
  await writeFileRecursive(join(targetDir, 'apps/web/src/lib/api.ts'), webLibApi());
  await writeFileRecursive(join(targetDir, 'apps/web/src/config.ts'), webConfigTs());

  // apps/api — Hono shell (no routes yet beyond /health)
  await writeFileRecursive(join(targetDir, 'apps/api/package.json'), apiPackageJson());
  await writeFileRecursive(join(targetDir, 'apps/api/tsconfig.json'), apiTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/api/.env.example'), apiEnvExample());
  await writeFileRecursive(join(targetDir, 'apps/api/src/index.ts'), apiIndexTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/server.ts'), apiServerTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/config.ts'), apiConfigTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/items.repo.ts'), apiItemsRepoTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/items.repo.drizzle.ts'), apiItemsRepoDrizzleTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/items.routes.ts'), apiItemsRoutesTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/index.ts'), apiItemsIndexTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/items.repo.test.ts'), apiItemsRepoTestTs());

  // apps/api internal/auth — auth shim routes + middleware (decision 12)
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/auth/auth.repo.ts'), apiAuthRepoTs());
  await writeFileRecursive(
    join(targetDir, 'apps/api/src/internal/auth/auth.repo.drizzle.ts'),
    apiAuthRepoDrizzleTs(),
  );
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/auth/auth.routes.ts'), apiAuthRoutesTs());
  await writeFileRecursive(
    join(targetDir, 'apps/api/src/internal/auth/auth.middleware.ts'),
    apiAuthMiddlewareTs(),
  );
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/auth/index.ts'), apiAuthIndexTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/auth/auth.repo.test.ts'), apiAuthRepoTestTs());

  // packages/shared — zod schemas + utils placeholder (empty for now)
  await writeFileRecursive(join(targetDir, 'packages/shared/package.json'), sharedPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/shared/tsconfig.json'), sharedTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/shared/src/index.ts'), sharedIndexTs());

  // packages/db — Drizzle + items schema + initial migration (decision 14)
  await writeFileRecursive(join(targetDir, 'packages/db/package.json'), dbPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/db/tsconfig.json'), dbTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/db/.env.example'), dbEnvExample());
  await writeFileRecursive(join(targetDir, 'packages/db/drizzle.config.ts'), dbDrizzleConfig());
  await writeFileRecursive(join(targetDir, 'packages/db/src/index.ts'), dbIndexTs());
  await writeFileRecursive(join(targetDir, 'packages/db/src/config.ts'), dbConfigTs());
  await writeFileRecursive(join(targetDir, 'packages/db/src/client.ts'), dbClientTs());
  await writeFileRecursive(join(targetDir, 'packages/db/src/schema/items.ts'), dbSchemaItemsTs());
  await writeFileRecursive(join(targetDir, 'packages/db/src/schema/users.ts'), dbSchemaUsersTs());
  await writeFileRecursive(
    join(targetDir, 'packages/db/src/schema/refresh-tokens.ts'),
    dbSchemaRefreshTokensTs(),
  );
  await writeFileRecursive(join(targetDir, 'packages/db/migrations/0000_items.sql'), dbMigration0000());
  await writeFileRecursive(join(targetDir, 'packages/db/migrations/0001_users.sql'), dbMigration0001());
  await writeFileRecursive(
    join(targetDir, 'packages/db/migrations/0002_refresh_tokens.sql'),
    dbMigration0002(),
  );

  // packages/api-client — typed Hono RPC client for web/api/mobile (decision 17/18)
  await writeFileRecursive(join(targetDir, 'packages/api-client/package.json'), apiClientPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/api-client/tsconfig.json'), apiClientTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/api-client/src/index.ts'), apiClientIndexTs());

  // packages/auth — auth shim (decision 12): passwords + tokens + refresh
  await writeFileRecursive(join(targetDir, 'packages/auth/package.json'), authPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/auth/tsconfig.json'), authTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/auth/src/index.ts'), authIndexTs());
  await writeFileRecursive(join(targetDir, 'packages/auth/src/types.ts'), authTypesTs());
  await writeFileRecursive(join(targetDir, 'packages/auth/src/config.ts'), authConfigTs());
  await writeFileRecursive(join(targetDir, 'packages/auth/src/passwords.ts'), authPasswordsTs());
  await writeFileRecursive(join(targetDir, 'packages/auth/src/tokens.ts'), authTokensTs());
  await writeFileRecursive(join(targetDir, 'packages/auth/src/refresh.ts'), authRefreshTs());
  await writeFileRecursive(join(targetDir, 'packages/auth/src/passwords.test.ts'), authPasswordsTestTs());
  await writeFileRecursive(join(targetDir, 'packages/auth/src/tokens.test.ts'), authTokensTestTs());
  await writeFileRecursive(join(targetDir, 'packages/auth/src/refresh.test.ts'), authRefreshTestTs());

  // docs/wire-it-in/auth.md — the fences the shim does NOT ship (decision 12, 30/31)
  await writeFileRecursive(join(targetDir, 'docs/wire-it-in/auth.md'), wireItInAuthMd());
}

// ---------- apps/web templates --------------------------------------------

function webPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/web',
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite --port 5173 --host',
        build: 'vite build',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@starter/api-client': 'workspace:*',
        '@starter/shared': 'workspace:*',
        '@tanstack/react-query': '^5.59.0',
        '@tanstack/react-router': '^1.79.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        zod: '^3.23.0',
      },
      devDependencies: {
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        '@vitejs/plugin-react': '^4.3.4',
        typescript: '^5.9.3',
        vite: '^6.0.0',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function webTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        jsx: 'react-jsx',
        types: ['vite/client'],
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

function webViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
`;
}

function webIndexHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Scaffolded app</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function webMainTsx(): string {
  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './app.css';

const queryClient = new QueryClient();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
`;
}

function webAppCss(): string {
  return `:root {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  color-scheme: light dark;
  background: #0b0d10;
  color: #e6e6e6;
}

body {
  margin: 0;
  min-height: 100vh;
}
`;
}

function webIndexPage(): string {
  return `export function IndexPage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Starter — TS-monolith</h1>
      <p>Web shell is up. api-client is wired in via <code>src/lib/api.ts</code>.</p>
    </main>
  );
}
`;
}

function webRouter(): string {
  return `import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { IndexPage } from './pages/index';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
`;
}

function webLibApi(): string {
  return `// @starter/web — typed entry point to the api.
//
// Builds the apiClient (Hono RPC, decision 17/18) from the runtime-resolved
// base URL in ./config and gives the rest of the app a single canonical
// import: \`import { apiClient } from '@/lib/api'\`. Pages call
// \`apiClient.items.\$get()\` / \`\$post(...)\` and get end-to-end type
// inference against apps/api/src/index.ts's Hono router. Auth integration
// (issue 06) wraps this client to add transparent refresh-on-401
// (decision 16).

import { createApiClient } from '@starter/api-client';
import { config } from '../config';

export const apiClient = createApiClient(config.apiUrl);
`;
}

function webConfigTs(): string {
  return `// @starter/web — typed config (decision 28).
//
// Reads VITE_API_URL (the api base URL) from Vite's import.meta.env and
// validates it through a zod schema. The web app never reads
// import.meta.env directly — everything goes through \`config\` so the
// surface is one typed object, fail-fast on missing/invalid at boot.
// Copy apps/web/.env.example to apps/web/.env for local dev.

import { z } from 'zod';

const configSchema = z.object({
  apiUrl: z
    .string()
    .min(1, 'VITE_API_URL is required')
    .url('VITE_API_URL must be a valid URL')
    .default('http://localhost:3000'),
});

const parsed = configSchema.safeParse({
  apiUrl: import.meta.env.VITE_API_URL,
});

if (!parsed.success) {
  // Fail-fast on bad config so the user sees the error at boot, not at
  // the first api call (decision 28).
  throw new Error(
    \`Invalid @starter/web config: \${parsed.error.issues
      .map((i) => \`\${i.path.join('.')}: \${i.message}\`)
      .join('; ')}\`,
  );
}

export const config = parsed.data;
export type Config = z.infer<typeof configSchema>;
`;
}

function webEnvExample(): string {
  return `# @starter/web — local dev env (git-ignored; copy to .env).
#
# Decision 28: dev loads vars via .env + Vite, prod uses the deploy
# platform's real env vars (Vercel/Cloudflare/Fly inject them). Vite
# picks up vars prefixed with VITE_ and exposes them on import.meta.env.
# Code never reads import.meta.env directly — go through src/config.ts.

# Base URL of the api (apps/api). Vite proxies /api to this in dev if
# you wire it up in vite.config.ts; today the web calls the api
# directly so the full URL is needed.
VITE_API_URL=http://localhost:3000
`;
}

// ---------- apps/api templates --------------------------------------------

function apiPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/api',
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        dev: 'tsx watch src/server.ts',
        build: 'tsc -p tsconfig.build.json',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@hono/node-server': '^1.13.0',
        '@hono/zod-validator': '^0.4.1',
        '@starter/auth': 'workspace:*',
        '@starter/db': 'workspace:*',
        'drizzle-orm': '^0.36.0',
        hono: '^4.6.0',
        jose: '^5.9.0',
        pg: '^8.13.0',
        zod: '^3.23.0',
      },
      devDependencies: {
        '@types/node': '^24.13.3',
        '@types/pg': '^8.11.10',
        dotenv: '^16.4.5',
        tsx: '^4.23.1',
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function apiTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022'],
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

function apiEnvExample(): string {
  return `# api runtime config (decision 28). Loaded by src/config.ts via dotenv.
#
# PORT — port the api binds to (default 3000).
# DATABASE_URL — Postgres connection string; consumed via @starter/db's
# zod schema (decision 14: the schema is owned by packages/db, the env
# is read in each consuming workspace).
#
# JWT_SECRET — HS256 signing secret for access + refresh tokens
# (decision 11: apps/api is the SOLE MINTER in shape 1; no other
# service in this monorepo should set this var). Must be at least
# 32 chars (256 bits). Rotate by adding a new entry to a JWKS or
# key-set (out of scope for the starter; see docs/wire-it-in/auth.md).
# Generate a fresh one with: openssl rand -base64 48
JWT_SECRET=replace-me-with-a-32-plus-char-random-secret

# Optional: token TTLs in seconds. Defaults: access 900 (15 min),
# refresh 2_592_000 (30 days). Decision 16: short-lived access,
# longer-lived refresh; the refresh rotation (/auth/refresh) issues
# a new pair on every successful call.
# ACCESS_TOKEN_TTL=900
# REFRESH_TOKEN_TTL=2592000

PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
`;
}

function apiConfigTs(): string {
  return `// @starter/api — zod-validated config (decision 28).
//
// Composes @starter/db's databaseUrlSchema (decision 14: the db package
// owns the schema; each consuming workspace reads its own process.env and
// parses) with api-specific env vars. The parse is lazy: the schema runs
// at the first call to \`loadConfig()\`, not at import time, so importing
// this file (e.g. from a test) does not require DATABASE_URL to be set.

import 'dotenv/config';
import { z } from 'zod';
import { databaseUrlSchema } from '@starter/db';

const apiConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(3000),
  databaseUrl: databaseUrlSchema,
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;

let cached: ApiConfig | undefined;

export function loadConfig(): ApiConfig {
  if (!cached) {
    cached = apiConfigSchema.parse({
      port: process.env.PORT,
      databaseUrl: process.env.DATABASE_URL,
    });
  }
  return cached;
}
`;
}

function apiIndexTs(): string {
  return `// @starter/api — Hono app definition (decision 18, 27).
//
// This file is the package's main entry. The api-client (and any other
// workspace that needs the api's typed surface) imports the \`AppType\`
// from here. server.ts is the runner that calls buildApp() and serves it.
//
// The api follows the modular-monolith structure (decision 27): each
// domain lives in src/internal/<name>/ as a self-contained module with
// a typed interface, mounted at a prefix on the root router. Adding a
// new module = add src/internal/<name>/ and call its makeXxxModule()
// from buildApp() below.
//
// buildApp() is called at server startup, not at import time. This
// means type-only imports of this file (e.g. from the api-client) are
// cheap: no env parsing, no Postgres connection.
//
// Auth wiring (decision 12):
// - /auth is mounted *unprotected* — register/login are public.
// - /items is mounted *behind* requireAuth (decision 12: every
//   authenticated request carries a Bearer access token; rotation
//   happens on /refresh, not per-request).
// - Sole-minter invariant (decision 11): only this process reads
//   JWT_SECRET; the auth shim receives it via the AuthConfig we pass
//   down to makeAuthModule() and requireAuth().

import { Hono } from 'hono';
import { readAuthConfig } from '@starter/auth';
import { makeItemsModule } from './internal/items/index.js';
import { makeAuthModule, requireAuth } from './internal/auth/index.js';

export function buildApp() {
  const authConfig = readAuthConfig();
  const auth = makeAuthModule(authConfig);

  // Subtree: /items is authenticated. Anything else at the root is
  // also caught by requireAuth; if you add an unprotected route, mount
  // it at the root *before* this protected subtree.
  const protectedItems = new Hono();
  protectedItems.use('*', requireAuth(authConfig));
  protectedItems.route('/items', makeItemsModule());

  return new Hono()
    .get('/health', (c) => c.json({ status: 'ok' }))
    .route('/auth', auth)
    .route('/', protectedItems);
}

export type AppType = ReturnType<typeof buildApp>;
`;
}

function apiServerTs(): string {
  return `// @starter/api — dev server entry. Runs the Hono app on PORT.
//
// This file is the \`dev\` script target. Production deployments can
// invoke \`node dist/server.js\` (after \`pnpm build\`).

import { serve } from '@hono/node-server';
import { buildApp } from './index.js';
import { loadConfig } from './config.js';

const config = loadConfig();
serve({ fetch: buildApp().fetch, port: config.port }, (info) => {
  console.log(\`api listening on http://localhost:\${info.port}\`);
});
`;
}

function apiItemsRepoTs(): string {
  return `// @starter/api — items repo interface (decision 27: split-seam).
//
// The interface lives here, separate from the Drizzle implementation
// (items.repo.drizzle.ts). Tests can pass a stub repo in; production
// wires the Drizzle implementation. The route handler depends on the
// interface, not the impl — a future swap to a different ORM or to
// an RPC-backed repo (decision 10's example split) touches this seam.

export interface Item {
  id: number;
  name: string;
  createdAt: Date;
}

export interface CreateItemInput {
  name: string;
}

export interface ItemsRepo {
  list(): Promise<Item[]>;
  create(input: CreateItemInput): Promise<Item>;
}
`;
}

function apiItemsRepoDrizzleTs(): string {
  return `// @starter/api — Drizzle-backed ItemsRepo implementation.
//
// The repo seam lives in items.repo.ts; this is the Drizzle implementation.
// Swap-point for an ORM change: rewrite this file, leave the interface
// and the route handler untouched (decision 14: the ORM-swap seam is the
// repo layer, not the migration history).

import { desc } from 'drizzle-orm';
import { itemsTable, type Item as DbItem } from '@starter/db';
import type { DbClient } from '@starter/db';
import type { CreateItemInput, Item, ItemsRepo } from './items.repo.js';

function toItem(row: DbItem): Item {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
  };
}

export function makeDrizzleItemsRepo(db: DbClient): ItemsRepo {
  return {
    async list(): Promise<Item[]> {
      const rows = await db.select().from(itemsTable).orderBy(desc(itemsTable.createdAt));
      return rows.map(toItem);
    },
    async create(input: CreateItemInput): Promise<Item> {
      const [row] = await db
        .insert(itemsTable)
        .values({ name: input.name })
        .returning();
      if (!row) {
        throw new Error('insert returned no row');
      }
      return toItem(row);
    },
  };
}
`;
}

function apiItemsRoutesTs(): string {
  return `// @starter/api — items routes (decision 17, 18).
//
// The Hono router is built by a factory \`makeItemsRoutes(repo)\` so the
// route handler is parameterized by the repo (decision 27: explicit
// interface). The route handlers depend on \`ItemsRepo\`, not on Drizzle —
// the route can be unit-tested by passing a stub repo.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { CreateItemInput, ItemsRepo } from './items.repo.js';

const createItemSchema = z.object({
  name: z.string().min(1).max(256),
});

export type ItemsRoutes = ReturnType<typeof makeItemsRoutes>;

export function makeItemsRoutes(repo: ItemsRepo) {
  const items = new Hono();

  items.get('/', async (c) => {
    const list = await repo.list();
    return c.json(list);
  });

  items.post('/', zValidator('json', createItemSchema), async (c) => {
    const body = c.req.valid('json');
    const input: CreateItemInput = { name: body.name };
    const item = await repo.create(input);
    return c.json(item, 201);
  });

  return items;
}
`;
}

function apiItemsIndexTs(): string {
  return `// @starter/api — items module barrel (decision 27: split-seam).
//
// Wires the Drizzle repo to the route factory and exports a Hono router
// ready to mount at /items. The consumer (apps/api/src/index.ts) just
// calls \`buildApp().route('/items', makeItemsModule())\` — the module
// owns its own composition.
//
// makeItemsModule() builds the router on demand, so importing this file
// is cheap: no Postgres connection is opened at import time, and a missing
// DATABASE_URL only fails when the module is actually built (at api
// startup), not at type-only import.

import { getDb } from '@starter/db';
import { loadConfig } from '../../config.js';
import { makeDrizzleItemsRepo } from './items.repo.drizzle.js';
import { makeItemsRoutes } from './items.routes.js';

export function makeItemsModule() {
  const { databaseUrl } = loadConfig();
  const db = getDb({ connectionString: databaseUrl });
  return makeItemsRoutes(makeDrizzleItemsRepo(db));
}
`;
}

function apiItemsRepoTestTs(): string {
  return `// @starter/api — items repo unit tests (decision 22).
//
// These tests run against a real test Postgres. They skip cleanly when
// DATABASE_URL is not set (so the suite is green in environments without
// a DB), and the CI matrix (issue 09) provides a Postgres service for
// the real run.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDb, __resetForTests } from '@starter/db';
import { sql } from 'drizzle-orm';
import { itemsTable } from '@starter/db';
import { makeDrizzleItemsRepo } from './items.repo.drizzle.js';

const TEST_URL = process.env.DATABASE_URL;
const describeDb = TEST_URL ? describe : describe.skip;

describeDb('makeDrizzleItemsRepo (real DB)', () => {
  const url = TEST_URL!;
  const repo = makeDrizzleItemsRepo(getDb({ connectionString: url }));

  beforeAll(async () => {
    await getDb({ connectionString: url }).execute(
      sql\`TRUNCATE TABLE \${itemsTable} RESTART IDENTITY\`.append(sql\`\`),
    );
  });

  afterAll(async () => {
    __resetForTests();
  });

  it('list() returns an empty array when no items exist', async () => {
    const items = await repo.list();
    expect(items).toEqual([]);
  });

  it('create() inserts a row and list() returns it', async () => {
    const created = await repo.create({ name: 'first' });
    expect(created.name).toBe('first');
    expect(typeof created.id).toBe('number');
    expect(created.createdAt).toBeInstanceOf(Date);

    const items = await repo.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe('first');
  });
});
`;
}

// ---------- packages/shared templates -------------------------------------

function sharedPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/shared',
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        build: 'tsc -p tsconfig.build.json',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        zod: '^3.23.0',
      },
      devDependencies: {
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function sharedTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022'],
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        isolatedModules: true,
        noEmit: true,
        declaration: true,
      },
      include: ['src/**/*'],
    },
    null,
    2,
  ) + '\n';
}

function sharedIndexTs(): string {
  return `// @starter/shared — zod schemas + pure utils shared by apps.
// This package is empty for now; later tickets add the first zod
// schemas (likely the \`items\` demo, decision 13).

export {};
`;
}

// ---------- packages/db templates ----------------------------------------

function dbPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/db',
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        generate: 'drizzle-kit generate',
        migrate: 'drizzle-kit migrate',
        studio: 'drizzle-kit studio',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        'drizzle-orm': '^0.36.0',
        pg: '^8.13.0',
        zod: '^3.23.0',
      },
      devDependencies: {
        '@types/pg': '^8.11.10',
        'drizzle-kit': '^0.28.0',
        typescript: '^5.9.3',
      },
    },
    null,
    2,
  ) + '\n';
}

function dbTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022'],
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        isolatedModules: true,
        noEmit: true,
      },
      include: ['src/**/*', 'drizzle.config.ts'],
    },
    null,
    2,
  ) + '\n';
}

function dbEnvExample(): string {
  return `# Postgres connection string used by drizzle-kit and the runtime client.
# Local dev: spin up Postgres any way you like (docker, native, etc.) and
# point this at it. The shape of the URL is postgres://USER:PASS@HOST:PORT/DB
DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
`;
}

function dbDrizzleConfig(): string {
  return `import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/*',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
`;
}

function dbIndexTs(): string {
  return `// @starter/db — Drizzle client + schema barrel.
//
// The Drizzle TS schema is the single source of truth (decision 14):
//   drizzle-kit generate -> emits a versioned SQL migration into ./migrations/
//   drizzle-kit migrate  -> applies pending migrations
//
// The runtime client (\`getDb\`) is created lazily so that consumers that
// only need the schema type (e.g. api-client's type-only imports) don't
// open a Postgres connection at module-load time. Tests build their own
// client via \`getDb({ connectionString })\` against a test DB.
//
// The eager \`config\` export from ./config.js is intentionally NOT
// re-exported here: loading the barrel must not force-parse process.env
// (e.g. when a test file imports this package before the env is wired).
// Consuming workspaces call \`readDatabaseConfig()\` themselves at the
// point they need the config (decision 28: each workspace owns its env).

export { databaseUrlSchema, readDatabaseConfig } from './config.js';
export { getDb, getPool, __resetForTests, type DbClient, type GetDbOptions, type GetPoolOptions } from './client.js';
export { itemsTable, type Item, type NewItem } from './schema/items.js';
export { usersTable, type User, type NewUser } from './schema/users.js';
export { refreshTokensTable, type RefreshTokenRow, type NewRefreshTokenRow } from './schema/refresh-tokens.js';
`;
}

function dbConfigTs(): string {
  return `// @starter/db — zod-validated config (decision 28).
//
// Exports a zod schema for DATABASE_URL that other workspaces (apps/api)
// compose into their own config. The actual parsing of \`process.env\`
// happens in each consuming workspace, not here, so a workspace that only
// uses the schema at type-level doesn't force-load process.env.
//
// Nothing is evaluated eagerly — importing this module must not throw on
// a missing DATABASE_URL. CLI tools (drizzle-kit) compose the schema with
// their own env-loading; consuming workspaces call \`readDatabaseConfig\`
// at the point they need the config.

import { z } from 'zod';

export const databaseUrlSchema = z
  .string()
  .min(1, 'DATABASE_URL is required')
  .url('DATABASE_URL must be a valid URL');

/**
 * Read the db config from a given env source. Defaults to process.env.
 * Each consuming workspace calls this with its loaded env (e.g. via dotenv)
 * to get a fully-typed config object.
 */
export function readDatabaseConfig(env: NodeJS.ProcessEnv = process.env): { databaseUrl: string } {
  return {
    databaseUrl: databaseUrlSchema.parse(env.DATABASE_URL),
  };
}
`;
}

function dbClientTs(): string {
  return `// @starter/db — Drizzle client + pg pool.
//
// Lazy-initialized: the pool is only created on first call. This keeps
// the import cheap (e.g. for the api-client's type-only imports) and
// avoids opening a connection at module load time.
//
// Tests build their own client by passing a different connectionString
// to \`getDb({ connectionString })\`. Production callers (apps/api) pass
// the connectionString from their own env-loaded config.

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { itemsTable } from './schema/items.js';

export type DbClient = NodePgDatabase<{ items: typeof itemsTable }>;

let _pool: Pool | undefined;
let _db: DbClient | undefined;

export interface GetPoolOptions {
  connectionString: string;
}

export function getPool(opts: GetPoolOptions): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: opts.connectionString });
  }
  return _pool;
}

export interface GetDbOptions {
  connectionString: string;
}

export function getDb(opts: GetDbOptions): DbClient {
  if (!_db) {
    _db = drizzle(getPool(opts), { schema: { items: itemsTable } });
  }
  return _db;
}

/**
 * Reset cached clients. Test-only — allows tests to swap the underlying
 * connection between cases without leaking across test files.
 */
export function __resetForTests(): void {
  _pool = undefined;
  _db = undefined;
}
`;
}

function dbSchemaItemsTs(): string {
  return `// @starter/db — items demo schema (decision 13).
//
// The single trivial domain the scaffold ships to prove the data layer
// composes end-to-end. Delete this and the \`items\` route when you start
// your real domain — it's a 5-minute job, not a refactor.

import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const itemsTable = pgTable('items', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 256 }).notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;
`;
}

function dbMigration0000(): string {
  return `CREATE TABLE IF NOT EXISTS "items" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "name" varchar(256) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;
}

function dbSchemaUsersTs(): string {
  return `// @starter/db — users schema (auth shim, decision 12).
//
// One row per registered user. The password hash is an argon2id PHC
// string produced by \`@starter/auth.hashPassword\`; this schema holds
// the hash, the auth shim owns the hashing/verification.

import { integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const usersTable = pgTable(
  'users',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    email: text().notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  }),
);

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
`;
}

function dbSchemaRefreshTokensTs(): string {
  return `// @starter/db — refresh tokens schema (auth shim, decision 12).
//
// Each issued refresh token has a record here, identified by its \`jti\`.
// The auth shim's rotation algorithm (issue / rotate / revoke) reads
// and writes these rows. Storing refresh tokens DB-side (rather than
// just trusting the JWT contents) is what makes revocation real:
// revoking a token means flipping \`revoked_at\` on its row.

import { integer, pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { usersTable } from './users.js';

export const refreshTokensTable = pgTable(
  'refresh_tokens',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    jti: text().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    jtiIdx: uniqueIndex('refresh_tokens_jti_idx').on(t.jti),
    userIdx: index('refresh_tokens_user_idx').on(t.userId),
  }),
);

export type RefreshTokenRow = typeof refreshTokensTable.$inferSelect;
export type NewRefreshTokenRow = typeof refreshTokensTable.$inferInsert;
`;
}

function dbMigration0001(): string {
  return `CREATE TABLE IF NOT EXISTS "users" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
`;
}

function dbMigration0002(): string {
  return `CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "refresh_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "user_id" integer NOT NULL,
  "jti" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_jti_idx" ON "refresh_tokens" ("jti");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_idx" ON "refresh_tokens" ("user_id");
DO $$ BEGIN
  ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
`;
}

// ---------- packages/api-client templates --------------------------------

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

import { hc } from 'hono/client';
import type { AppType } from '@starter/api';

export type ApiClient = ReturnType<typeof hc<AppType>>;

export function createApiClient(baseUrl: string): ApiClient {
  return hc<AppType>(baseUrl);
}

export type { AppType } from '@starter/api';
`;
}

// ---------- packages/auth templates (decision 12) -----------------------

function authPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/auth',
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        argon2: '^0.41.1',
        jose: '^5.9.0',
        zod: '^3.23.0',
      },
      devDependencies: {
        '@types/node': '^24.13.3',
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function authTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022'],
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

function authIndexTs(): string {
  return `// @starter/auth — auth shim (decision 12).
//
// A *thin typed layer* over vetted upstream libraries, not a from-scratch
// implementation and not a stub. The starter owns the *surface* (token
// shape, argon2id parameters, the four endpoints, refresh rotation) but
// not the crypto \u2014 that lives in audited libraries. Everything beyond
// the shim's scope is fenced off in docs/wire-it-in/auth.md (decision 30/31).

export { hashPassword, verifyPassword } from './passwords.js';
export { signToken, verifyToken, InvalidTokenError } from './tokens.js';
export {
  issueTokenPair,
  rotateTokenPair,
  revokeRefreshToken,
  InvalidRefreshTokenError,
  type RefreshTokenStore,
  type RefreshTokenRecord,
} from './refresh.js';
export { readAuthConfig, authConfigSchema, type AuthConfig } from './config.js';
export type { TokenPair, TokenKind, AccessTokenPayload, RefreshTokenPayload } from './types.js';
`;
}

function authTypesTs(): string {
  return `// @starter/auth — shared types.

/**
 * The two-token pair issued on login / refresh. Typed per the issue's
 * acceptance criterion: \`{ access: string, refresh: string }\`.
 */
export interface TokenPair {
  access: string;
  refresh: string;
}

/** Discriminates the two token kinds (decision 16: short-lived access, longer-lived refresh). */
export type TokenKind = 'access' | 'refresh';

/** Payload of a signed access token (decision 16: short-lived, sent as Bearer). */
export interface AccessTokenPayload {
  /** Subject = userId. */
  sub: string;
  iat?: number;
  exp?: number;
}

/**
 * Payload of a signed refresh token. Carries a \`jti\` (JWT ID) so the
 * rotation store can recognise and revoke individual refresh tokens.
 */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}
`;
}

function authConfigTs(): string {
  return `// @starter/auth \u2014 zod-validated config (decision 28).
//
// The auth shim exports the schema; the actual parsing of \`process.env\`
// happens in the consuming workspace (apps/api, which holds the signing
// key \u2014 decision 11: apps/api is the sole minter in shape 1). This keeps
// the schema importable for type-checking without forcing env load.

import { z } from 'zod';

export const authConfigSchema = z.object({
  /** HS256 signing secret. Must be at least 32 chars (256 bits of entropy). */
  jwtSecret: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters (256 bits)'),
  /** Access token TTL in seconds. Default 15 min (decision 16: short-lived). */
  accessTokenTtl: z.coerce.number().int().positive().default(900),
  /** Refresh token TTL in seconds. Default 30 days. */
  refreshTokenTtl: z.coerce.number().int().positive().default(2_592_000),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;

/**
 * Read the auth config from a given env source. Each consuming workspace
 * calls this with its loaded env (e.g. via dotenv) to get a fully-typed
 * config object.
 */
export function readAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  return authConfigSchema.parse({
    jwtSecret: env.JWT_SECRET,
    accessTokenTtl: env.ACCESS_TOKEN_TTL,
    refreshTokenTtl: env.REFRESH_TOKEN_TTL,
  });
}
`;
}

function authPasswordsTs(): string {
  return `// @starter/auth \u2014 password hashing (argon2id).
//
// Thin typed layer over \`argon2\` (the canonical Node bindings to the
// reference argon2 C implementation). The starter owns the *parameters*
// (memory cost, time cost, parallelism) per decision 12 \u2014 a project
// shouldn't have to think about argon2's tuning.
//
// The hashing is async (returns a Promise). Both functions are CPU-bound
// and the runtime cost is deliberate \u2014 brute-force resistance is the
// point of using argon2id.

import * as argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  // memoryCost: 19 MiB (OWASP 2024 minimum for argon2id).
  memoryCost: 19_456,
  // timeCost: 2 iterations.
  timeCost: 2,
  // parallelism: 1 lane.
  parallelism: 1,
};

/**
 * Hash a plaintext password. Returns a self-describing PHC-formatted
 * string (includes salt + parameters); the same input produces a
 * different hash on each call.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored hash. Returns false (not
 * throws) for any failure \u2014 wrong password, malformed hash, etc. \u2014
 * so the caller doesn't need a try/catch to handle user errors.
 */
export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}
`;
}

function authTokensTs(): string {
  return `// @starter/auth \u2014 JWT issue/verify (jose).
//
// Thin typed layer over \`jose\` (the audited JOSE implementation; HS256
// for the starter's symmetric secret). The starter owns the *algorithm*
// (HS256 by default) and the *TTL settings* via AuthConfig; the wire
// format is a standard JWT.

import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import type { AccessTokenPayload, RefreshTokenPayload, TokenKind } from './types.js';
import type { AuthConfig } from './config.js';

function secretKey(config: AuthConfig): Uint8Array {
  return new TextEncoder().encode(config.jwtSecret);
}

function ttlFor(kind: TokenKind, config: AuthConfig): number {
  return kind === 'access' ? config.accessTokenTtl : config.refreshTokenTtl;
}

/**
 * Sign a token. The payload's \`iat\` and \`exp\` are set here based on
 * the configured TTL for the kind. The HS256 header is set; the secret
 * comes from the AuthConfig.
 */
export async function signToken(
  payload: Omit<AccessTokenPayload, 'iat' | 'exp'> | Omit<RefreshTokenPayload, 'iat' | 'exp'>,
  kind: TokenKind,
  config: AuthConfig,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlFor(kind, config))
    .sign(secretKey(config));
}

/**
 * Verify a token's signature and expiry. Throws on any failure
 * (expired, malformed, wrong signature, etc.). The caller decides how
 * to surface that to the user (the api returns 401).
 */
export async function verifyToken<T extends AccessTokenPayload | RefreshTokenPayload>(
  token: string,
  config: AuthConfig,
): Promise<T> {
  try {
    const { payload } = await jwtVerify(token, secretKey(config), {
      algorithms: ['HS256'],
    });
    return payload as unknown as T;
  } catch (err) {
    if (
      err instanceof joseErrors.JWTExpired ||
      err instanceof joseErrors.JWTClaimValidationFailed ||
      err instanceof joseErrors.JWSSignatureVerificationFailed ||
      err instanceof joseErrors.JWSInvalid ||
      err instanceof joseErrors.JWTInvalid
    ) {
      throw new InvalidTokenError(err.message);
    }
    throw err;
  }
}

/** Thrown by verifyToken on any JWT failure. Lets the api map to 401 cleanly. */
export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTokenError';
  }
}
`;
}

function authRefreshTs(): string {
  return `// @starter/auth \u2014 refresh-token rotation.
//
// The auth shim's split-seam: this module owns the *rotation algorithm*
// (issue \u2192 verify \u2192 revoke \u2192 re-issue), but the *persistence* of
// refresh tokens is delegated to a \`RefreshTokenStore\` interface that
// apps/api implements with Drizzle (see apps/api/src/internal/auth).
//
// The store is the minimum viable surface: a refresh token is recognised
// by its \`jti\`; lookup returns the user it belongs to; revocation
// prevents future rotation. This shape works for both the DB-backed
// implementation (recommended, per the issue) and an in-memory one
// (useful in tests).

import { signToken, verifyToken } from './tokens.js';
import type { AuthConfig } from './config.js';
import type { RefreshTokenPayload, TokenPair } from './types.js';

export interface RefreshTokenRecord {
  jti: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
}

export interface RefreshTokenStore {
  /** Persist a freshly-issued refresh token so it can be looked up later. */
  recordRefreshToken(record: RefreshTokenRecord): Promise<void>;
  /** Look up a refresh token by jti. Returns null if unknown. */
  findRefreshToken(jti: string): Promise<RefreshTokenRecord | null>;
  /** Mark a refresh token as revoked. Idempotent. */
  revokeRefreshToken(jti: string): Promise<void>;
}

/**
 * Issue a new token pair for a user. The refresh token's jti is recorded
 * in the store so subsequent /refresh calls can verify it (and so
 * /logout can revoke it).
 */
export async function issueTokenPair(
  userId: string,
  config: AuthConfig,
  store: RefreshTokenStore,
): Promise<TokenPair> {
  const jti = crypto.randomUUID();
  const access = await signToken({ sub: userId }, 'access', config);
  const refresh = await signToken({ sub: userId, jti }, 'refresh', config);

  // Decode the refresh we just signed to get the exp. Cheaper than
  // re-decoding from a separate function and keeps the TTL source-of-truth
  // in tokens.ts.
  const decoded = await verifyToken<RefreshTokenPayload>(refresh, config);
  const expiresAt = new Date(decoded.exp! * 1000);
  await store.recordRefreshToken({ jti, userId, expiresAt, revoked: false });
  return { access, refresh };
}

/**
 * Rotate a token pair: verify the old refresh token, check the store,
 * revoke the old token, issue a new pair. The old refresh token cannot
 * be used again after this call.
 */
export async function rotateTokenPair(
  oldRefreshToken: string,
  config: AuthConfig,
  store: RefreshTokenStore,
): Promise<TokenPair> {
  // verifyToken throws InvalidTokenError on any JWT failure (expired,
  // wrong sig, malformed). The api maps that to 401.
  const payload = await verifyToken<RefreshTokenPayload>(oldRefreshToken, config);

  const record = await store.findRefreshToken(payload.jti);
  if (!record) {
    throw new InvalidRefreshTokenError('refresh token not recognised');
  }
  if (record.revoked) {
    throw new InvalidRefreshTokenError('refresh token has been revoked');
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw new InvalidRefreshTokenError('refresh token has expired');
  }

  // Revoke the old, issue a new pair. We revoke first so a concurrent
  // rotation attempt with the same token fails fast on the store check.
  await store.revokeRefreshToken(payload.jti);
  return issueTokenPair(payload.sub, config, store);
}

/**
 * Revoke a refresh token. Used by POST /auth/logout. Idempotent \u2014
 * revoking an already-revoked token is a no-op.
 */
export async function revokeRefreshToken(
  refreshToken: string,
  config: AuthConfig,
  store: RefreshTokenStore,
): Promise<void> {
  const payload = await verifyToken<RefreshTokenPayload>(refreshToken, config);
  await store.revokeRefreshToken(payload.jti);
}

/** Thrown by rotateTokenPair / revokeRefreshToken for store-level rejections. */
export class InvalidRefreshTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRefreshTokenError';
  }
}
`;
}

function authPasswordsTestTs(): string {
  return `// @starter/auth \u2014 password unit tests (decision 22).
//
// Real \`argon2\` library, no mocks (per decision 22).

import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './passwords.js';

describe('hashPassword / verifyPassword (argon2id)', () => {
  it('hashes a password into a PHC-formatted string', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).toMatch(/^\\$argon2id\\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('produces a different hash for the same input (salted)', async () => {
    const h1 = await hashPassword('same-input');
    const h2 = await hashPassword('same-input');
    expect(h1).not.toBe(h2);
  });

  it('verifyPassword returns true for a correct password', async () => {
    const hash = await hashPassword('hunter2');
    expect(await verifyPassword(hash, 'hunter2')).toBe(true);
  });

  it('verifyPassword returns false for a wrong password', async () => {
    const hash = await hashPassword('hunter2');
    expect(await verifyPassword(hash, 'hunter3')).toBe(false);
  });

  it('verifyPassword returns false for a malformed hash (no throw)', async () => {
    expect(await verifyPassword('not-a-real-hash', 'anything')).toBe(false);
  });
});
`;
}

function authTokensTestTs(): string {
  return `// @starter/auth \u2014 token unit tests (decision 22).
//
// Real \`jose\` library, no mocks.

import { describe, expect, it } from 'vitest';
import { signToken, verifyToken, InvalidTokenError } from './tokens.js';
import { readAuthConfig } from './config.js';
import type { AccessTokenPayload, RefreshTokenPayload } from './types.js';

const config = readAuthConfig({
  JWT_SECRET: 'a'.repeat(32),
  ACCESS_TOKEN_TTL: '60',
  REFRESH_TOKEN_TTL: '3600',
});

describe('signToken / verifyToken (jose HS256)', () => {
  it('round-trips an access token', async () => {
    const token = await signToken({ sub: 'user-1' }, 'access', config);
    const payload = await verifyToken<AccessTokenPayload>(token, config);
    expect(payload.sub).toBe('user-1');
    expect(typeof payload.exp).toBe('number');
  });

  it('round-trips a refresh token with jti', async () => {
    const token = await signToken({ sub: 'user-2', jti: 'r-1' }, 'refresh', config);
    const payload = await verifyToken<RefreshTokenPayload>(token, config);
    expect(payload.sub).toBe('user-2');
    expect(payload.jti).toBe('r-1');
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signToken({ sub: 'user-3' }, 'access', config);
    const otherConfig = { ...config, jwtSecret: 'b'.repeat(32) };
    await expect(verifyToken(token, otherConfig)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects a malformed token', async () => {
    await expect(verifyToken('not.a.token', config)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects an expired access token', async () => {
    const expiredConfig = { ...config, accessTokenTtl: -1 };
    const token = await signToken({ sub: 'user-4' }, 'access', expiredConfig);
    await expect(verifyToken(token, config)).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
`;
}

function authRefreshTestTs(): string {
  return `// @starter/auth \u2014 refresh-rotation unit tests (decision 22).
//
// Real \`jose\` + a tiny in-memory \`RefreshTokenStore\` (no mocks of
// the crypto; the store is a test seam, not a mock of the library).

import { describe, expect, it } from 'vitest';
import {
  issueTokenPair,
  rotateTokenPair,
  revokeRefreshToken,
  InvalidRefreshTokenError,
  type RefreshTokenStore,
  type RefreshTokenRecord,
} from './refresh.js';
import { verifyToken } from './tokens.js';
import { readAuthConfig } from './config.js';
import type { RefreshTokenPayload } from './types.js';

const config = readAuthConfig({
  JWT_SECRET: 'a'.repeat(32),
  ACCESS_TOKEN_TTL: '60',
  REFRESH_TOKEN_TTL: '3600',
});

function makeStore(): RefreshTokenStore & { _records: Map<string, RefreshTokenRecord> } {
  const records = new Map<string, RefreshTokenRecord>();
  return {
    _records: records,
    async recordRefreshToken(rec) {
      records.set(rec.jti, rec);
    },
    async findRefreshToken(jti) {
      return records.get(jti) ?? null;
    },
    async revokeRefreshToken(jti) {
      const rec = records.get(jti);
      if (rec) records.set(jti, { ...rec, revoked: true });
    },
  };
}

describe('issueTokenPair', () => {
  it('issues access + refresh with a stable userId', async () => {
    const store = makeStore();
    const pair = await issueTokenPair('user-1', config, store);
    expect(pair.access).toMatch(/^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/);
    expect(pair.refresh).toMatch(/^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/);
    expect(store._records.size).toBe(1);
  });
});

describe('rotateTokenPair', () => {
  it('issues a new pair and revokes the old refresh', async () => {
    const store = makeStore();
    const first = await issueTokenPair('user-1', config, store);
    const second = await rotateTokenPair(first.refresh, config, store);

    expect(second.access).not.toBe(first.access);
    expect(second.refresh).not.toBe(first.refresh);

    // The old refresh's record should now be revoked.
    const oldJti = (await verifyToken<RefreshTokenPayload>(first.refresh, config)).jti;
    expect(store._records.get(oldJti)?.revoked).toBe(true);
  });

  it('rejects a refresh token that is not in the store', async () => {
    const store = makeStore();
    const first = await issueTokenPair('user-1', config, store);
    const otherStore = makeStore();
    await expect(rotateTokenPair(first.refresh, config, otherStore)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });

  it('rejects a refresh token that has already been rotated (replay)', async () => {
    const store = makeStore();
    const first = await issueTokenPair('user-1', config, store);
    await rotateTokenPair(first.refresh, config, store);
    // The old refresh is now revoked; reusing it must fail.
    await expect(rotateTokenPair(first.refresh, config, store)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });
});

describe('revokeRefreshToken', () => {
  it('marks the refresh as revoked so it cannot be rotated', async () => {
    const store = makeStore();
    const pair = await issueTokenPair('user-1', config, store);
    await revokeRefreshToken(pair.refresh, config, store);
    await expect(rotateTokenPair(pair.refresh, config, store)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });

  it('is idempotent (revoking twice does not throw)', async () => {
    const store = makeStore();
    const pair = await issueTokenPair('user-1', config, store);
    await revokeRefreshToken(pair.refresh, config, store);
    await expect(revokeRefreshToken(pair.refresh, config, store)).resolves.toBeUndefined();
  });
});
`;
}

// ---------- apps/api internal/auth templates (decision 12) ------------

function apiAuthRepoTs(): string {
  return `// @starter/api \u2014 auth repo interfaces (decision 27: split-seam).
//
// Two stores back the auth routes: \`UserStore\` for the \`users\` table
// and the \`RefreshTokenStore\` from @starter/auth for the
// \`refresh_tokens\` table (rotation state). The Drizzle impls live in
// auth.repo.drizzle.ts; the route handler depends on these interfaces,
// so tests can substitute an in-memory store.

import type { RefreshTokenStore, RefreshTokenRecord } from '@starter/auth';

export interface UserRow {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export interface UserStore {
  findByEmail(email: string): Promise<UserRow | null>;
  create(input: CreateUserInput): Promise<UserRow>;
  findById(id: number): Promise<UserRow | null>;
}

export type DrizzleRefreshTokenStore = RefreshTokenStore;
export type DrizzleRefreshTokenRecord = RefreshTokenRecord;
`;
}

function apiAuthRepoDrizzleTs(): string {
  return `// @starter/api \u2014 Drizzle-backed auth stores.
//
// The repo seam lives in auth.repo.ts; this is the Drizzle implementation.
// Swap-point for an ORM change: rewrite this file, leave the interface
// and the route handler untouched (decision 14: the ORM-swap seam is the
// repo layer, not the migration history).

import { eq } from 'drizzle-orm';
import type { DbClient } from '@starter/db';
import { usersTable, refreshTokensTable, type User, type RefreshTokenRow } from '@starter/db';
import type { CreateUserInput, UserRow, UserStore } from './auth.repo.js';
import type { RefreshTokenStore, RefreshTokenRecord } from '@starter/auth';

function toUserRow(row: User): UserRow {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
  };
}

function toRefreshTokenRecord(row: RefreshTokenRow): RefreshTokenRecord {
  return {
    jti: row.jti,
    userId: String(row.userId),
    expiresAt: row.expiresAt,
    revoked: row.revokedAt !== null,
  };
}

export function makeDrizzleUserStore(db: DbClient): UserStore {
  return {
    async findByEmail(email) {
      const [row] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
      return row ? toUserRow(row) : null;
    },
    async create(input: CreateUserInput) {
      const [row] = await db
        .insert(usersTable)
        .values({ email: input.email, passwordHash: input.passwordHash })
        .returning();
      if (!row) throw new Error('users insert returned no row');
      return toUserRow(row);
    },
    async findById(id) {
      const [row] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      return row ? toUserRow(row) : null;
    },
  };
}

export function makeDrizzleRefreshTokenStore(db: DbClient): RefreshTokenStore {
  return {
    async recordRefreshToken(rec) {
      await db.insert(refreshTokensTable).values({
        jti: rec.jti,
        userId: Number(rec.userId),
        expiresAt: rec.expiresAt,
        revokedAt: rec.revoked ? rec.expiresAt : null,
      });
    },
    async findRefreshToken(jti) {
      const [row] = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.jti, jti))
        .limit(1);
      return row ? toRefreshTokenRecord(row) : null;
    },
    async revokeRefreshToken(jti) {
      await db
        .update(refreshTokensTable)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokensTable.jti, jti));
    },
  };
}
`;
}

function apiAuthRoutesTs(): string {
  return `// @starter/api \u2014 auth routes (decision 12: /auth/{register,login,refresh,logout}).
//
// The four endpoints. Each depends on a \`UserStore\` and a
// \`RefreshTokenStore\` (interfaces in auth.repo.ts) plus an
// \`AuthConfig\` (from @starter/auth). The Drizzle impls are wired in
// ./index.ts (which buildApp() calls via makeAuthModule()).
//
// All four endpoints return JSON. On any auth failure, the response
// is 401 with a generic \`{ error }\` body \u2014 we don't leak whether
// the email exists (login) or which field was wrong (register).
//
// Auth integration on the web (ticket 06) plugs in the httpOnly refresh
// cookie + Bearer access token pattern. The mobile flow (ticket 12)
// uses secure storage + body refresh. Both work off the same token
// shape: this file is the single minting surface.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  hashPassword,
  verifyPassword,
  issueTokenPair,
  rotateTokenPair,
  revokeRefreshToken,
  InvalidRefreshTokenError,
  InvalidTokenError,
  type AuthConfig,
} from '@starter/auth';
import type { UserStore } from './auth.repo.js';
import type { RefreshTokenStore } from '@starter/auth';

const registerSchema = z.object({
  email: z.string().email().max(256),
  password: z.string().min(8).max(256),
});

const loginSchema = z.object({
  email: z.string().email().max(256),
  password: z.string().min(1).max(256),
});

const refreshSchema = z.object({
  refresh: z.string().min(1),
});

const logoutSchema = z.object({
  refresh: z.string().min(1),
});

export interface AuthRoutesDeps {
  users: UserStore;
  refreshTokens: RefreshTokenStore;
  config: AuthConfig;
}

export type AuthRoutes = ReturnType<typeof makeAuthRoutes>;

export function makeAuthRoutes(deps: AuthRoutesDeps) {
  const auth = new Hono();

  // POST /auth/register \u2014 { email, password } \u2192 { userId }
  auth.post('/register', zValidator('json', registerSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const existing = await deps.users.findByEmail(email);
    if (existing) {
      return c.json({ error: 'email already registered' }, 409);
    }
    const passwordHash = await hashPassword(password);
    const user = await deps.users.create({ email, passwordHash });
    return c.json({ userId: String(user.id) }, 201);
  });

  // POST /auth/login \u2014 { email, password } \u2192 { access, refresh, userId }
  auth.post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const user = await deps.users.findByEmail(email);
    if (!user) {
      // Generic message \u2014 don't leak whether the email exists.
      return c.json({ error: 'invalid credentials' }, 401);
    }
    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      return c.json({ error: 'invalid credentials' }, 401);
    }
    const pair = await issueTokenPair(String(user.id), deps.config, deps.refreshTokens);
    return c.json({ ...pair, userId: String(user.id) });
  });

  // POST /auth/refresh \u2014 { refresh } \u2192 { access, refresh } (rotation)
  auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
    const { refresh } = c.req.valid('json');
    try {
      const pair = await rotateTokenPair(refresh, deps.config, deps.refreshTokens);
      return c.json(pair);
    } catch (err) {
      if (err instanceof InvalidRefreshTokenError || err instanceof InvalidTokenError) {
        return c.json({ error: 'invalid refresh token' }, 401);
      }
      throw err;
    }
  });

  // POST /auth/logout \u2014 { refresh } \u2192 { ok: true } (revoke the refresh)
  auth.post('/logout', zValidator('json', logoutSchema), async (c) => {
    const { refresh } = c.req.valid('json');
    try {
      await revokeRefreshToken(refresh, deps.config, deps.refreshTokens);
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        return c.json({ error: 'invalid refresh token' }, 401);
      }
      throw err;
    }
    return c.json({ ok: true });
  });

  return auth;
}
`;
}

function apiAuthMiddlewareTs(): string {
  return `// @starter/api \u2014 verifyToken middleware (decision 12, 27).
//
// Protects a route (or a router subtree) by requiring a valid access
// token in the \`Authorization: Bearer \u2026\` header. On success the
// verified \`userId\` is set on the Hono context (\`c.get('userId')\`)
// so downstream handlers can use it.
//
// 401 (with a JSON error body) on any failure \u2014 missing header, wrong
// shape, invalid signature, expired token. The exact reason is hidden
// from the response to avoid leaking validation rules to attackers.

import type { Context, MiddlewareHandler } from 'hono';
import { verifyToken, type AuthConfig } from '@starter/auth';

export type AuthContext = Context & {
  // set by the middleware on success
  get(key: 'userId'): string | undefined;
  set(key: 'userId', value: string): void;
};

export function requireAuth(config: AuthConfig): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'missing or invalid Authorization header' }, 401);
    }
    const token = header.slice('Bearer '.length).trim();
    if (token.length === 0) {
      return c.json({ error: 'missing or invalid Authorization header' }, 401);
    }
    try {
      const payload = await verifyToken<{ sub: string }>(token, config);
      c.set('userId', String(payload.sub));
      await next();
    } catch {
      return c.json({ error: 'invalid or expired token' }, 401);
    }
  };
}
`;
}

function apiAuthIndexTs(): string {
  return `// @starter/api \u2014 auth module barrel (decision 27: split-seam).
//
// Wires the Drizzle-backed UserStore + RefreshTokenStore to the route
// factory and exports a Hono router ready to mount at /auth. The
// consumer (apps/api/src/index.ts) calls \`buildApp().route('/auth',
// makeAuthModule(authConfig))\` \u2014 the auth config is read once at
// buildApp() and threaded through, so we don't parse JWT_SECRET twice.
//
// makeAuthModule() builds the router on demand, so importing this file
// is cheap: no Postgres connection is opened at import time, and a
// missing JWT_SECRET only fails when the module is actually built (at
// api startup), not at type-only import.

import { getDb } from '@starter/db';
import type { AuthConfig } from '@starter/auth';
import { loadConfig } from '../../config.js';
import { makeDrizzleUserStore, makeDrizzleRefreshTokenStore } from './auth.repo.drizzle.js';
import { makeAuthRoutes } from './auth.routes.js';

export function makeAuthModule(authConfig: AuthConfig) {
  const { databaseUrl } = loadConfig();
  const db = getDb({ connectionString: databaseUrl });
  const users = makeDrizzleUserStore(db);
  const refreshTokens = makeDrizzleRefreshTokenStore(db);
  return makeAuthRoutes({ users, refreshTokens, config: authConfig });
}

// Re-export the middleware so buildApp can compose the protected /items
// subtree without re-importing the route module.
export { requireAuth } from './auth.middleware.js';
`;
}

function apiAuthRepoTestTs(): string {
  return `// @starter/api \u2014 auth repo unit tests (decision 22).
//
// Real Postgres via @starter/db. Skips cleanly when DATABASE_URL is
// not set (so the suite is green in environments without a DB), and
// the CI matrix (issue 09) provides a Postgres service for the real run.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { getDb, __resetForTests, usersTable, refreshTokensTable } from '@starter/db';
import { makeDrizzleUserStore, makeDrizzleRefreshTokenStore } from './auth.repo.drizzle.js';
import { issueTokenPair, readAuthConfig } from '@starter/auth';

const TEST_URL = process.env.DATABASE_URL;
const describeDb = TEST_URL ? describe : describe.skip;

const authConfig = readAuthConfig({
  JWT_SECRET: 'a'.repeat(32),
  ACCESS_TOKEN_TTL: '60',
  REFRESH_TOKEN_TTL: '3600',
});

describeDb('makeDrizzleUserStore (real DB)', () => {
  const url = TEST_URL!;
  const users = makeDrizzleUserStore(getDb({ connectionString: url }));
  const refreshTokens = makeDrizzleRefreshTokenStore(getDb({ connectionString: url }));

  beforeAll(async () => {
    await getDb({ connectionString: url }).execute(
      sql\`TRUNCATE TABLE \${refreshTokensTable} CASCADE\`,
    );
    await getDb({ connectionString: url }).execute(
      sql\`TRUNCATE TABLE \${usersTable} RESTART IDENTITY CASCADE\`,
    );
  });

  afterAll(async () => {
    await getDb({ connectionString: url }).execute(
      sql\`TRUNCATE TABLE \${refreshTokensTable} CASCADE\`,
    );
    await getDb({ connectionString: url }).execute(
      sql\`TRUNCATE TABLE \${usersTable} RESTART IDENTITY CASCADE\`,
    );
    __resetForTests();
  });

  it('create() persists a user and findByEmail() finds it', async () => {
    const created = await users.create({ email: 'alice@example.com', passwordHash: 'hash-1' });
    expect(created.id).toBeGreaterThan(0);
    expect(created.email).toBe('alice@example.com');
    const found = await users.findByEmail('alice@example.com');
    expect(found?.id).toBe(created.id);
  });

  it('findByEmail() returns null for an unknown email', async () => {
    const found = await users.findByEmail('nobody@example.com');
    expect(found).toBeNull();
  });

  it('findById() finds a created user', async () => {
    const created = await users.create({ email: 'bob@example.com', passwordHash: 'hash-2' });
    const found = await users.findById(created.id);
    expect(found?.email).toBe('bob@example.com');
  });
});

describeDb('makeDrizzleRefreshTokenStore (real DB)', () => {
  const url = TEST_URL!;
  const refreshTokens = makeDrizzleRefreshTokenStore(getDb({ connectionString: url }));
  const users = makeDrizzleUserStore(getDb({ connectionString: url }));

  beforeAll(async () => {
    await getDb({ connectionString: url }).execute(
      sql\`TRUNCATE TABLE \${refreshTokensTable} CASCADE\`,
    );
    await getDb({ connectionString: url }).execute(
      sql\`TRUNCATE TABLE \${usersTable} RESTART IDENTITY CASCADE\`,
    );
  });

  afterAll(async () => {
    __resetForTests();
  });

  it('recordRefreshToken() + findRefreshToken() round-trip', async () => {
    const user = await users.create({ email: 'carol@example.com', passwordHash: 'h' });
    await issueTokenPair(String(user.id), authConfig, refreshTokens);
    const rec = await refreshTokens.findRefreshToken(
      // find by the jti the auth shim recorded
      // (we don't have it here directly, so look up via the FK instead)
      (await getDb({ connectionString: url })
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.userId, user.id))
        .limit(1))[0]?.jti ?? 'no-jti',
    );
    expect(rec?.userId).toBe(String(user.id));
    expect(rec?.revoked).toBe(false);
  });

  it('revokeRefreshToken() flips the record to revoked', async () => {
    const user = await users.create({ email: 'dave@example.com', passwordHash: 'h' });
    await issueTokenPair(String(user.id), authConfig, refreshTokens);
    const rows = await getDb({ connectionString: url })
      .select()
      .from(refreshTokensTable)
      .where(eq(refreshTokensTable.userId, user.id))
      .limit(1);
    const jti = rows[0]?.jti;
    expect(jti).toBeDefined();
    await refreshTokens.revokeRefreshToken(jti!);
    const rec = await refreshTokens.findRefreshToken(jti!);
    expect(rec?.revoked).toBe(true);
  });
});
`;
}
// ---------- docs/wire-it-in/auth.md (decision 12, 30/31) ---------------

function wireItInAuthMd(): string {
  return `# Auth: what's in the shim, what isn't

The starter ships an \`auth shim\` (decision 12) — a *thin typed layer*
over vetted upstream libraries that owns the **surface** of auth
(token shape, argon2id parameters, the four HTTP endpoints, refresh
rotation). It does **not** ship everything you might want from a
real auth system; the rest is fenced off below as "wire it in: here's
the seam."

## What the shim ships

- **Password hashing**: \`hashPassword\` / \`verifyPassword\` (argon2id
  via the canonical \`argon2\` Node bindings, OWASP 2024 parameters).
- **JWT issue/verify**: \`signToken\` / \`verifyToken\` (HS256 via
  \`jose\`).
- **Refresh-token rotation**: \`issueTokenPair\` / \`rotateTokenPair\` /
  \`revokeRefreshToken\`, over a \`RefreshTokenStore\` seam.
- **Four HTTP endpoints** (\`/auth/{register,login,refresh,logout}\`)
  with zod-validated input and JSON output.
- **Sole-minter invariant** (decision 11): only \`apps/api\` reads
  \`JWT_SECRET\`. No other service in the monorepo holds a signing key.

Real libraries, not mocks. The \`@starter/auth\` package's unit tests
exercise \`argon2\`, \`jose\`, and the rotation store against real
implementations (decision 22).

## What the shim does NOT ship (the fences)

These are intentionally out of scope. Each is a real product decision
that varies per app — shipping one would be a bait-and-switch (decision 12).
For each, the seam is the \`@starter/auth\` package; the api's
\`internal/auth/\` module is the HTTP boundary; and \`apps/api\` is the
deployment surface.

### Email verification

Send a one-time link after \`/auth/register\`; the user clicks to mark
their email as verified. **Seam**: add a \`users.emailVerifiedAt\`
column to \`packages/db\` (migration 0003), then a new \`/auth/verify\`
route that flips it on a valid token. \`@starter/auth\` exports the
token shape; you add the mailer and the route. The login response can
include \`{ emailVerified: boolean }\` and the api can 403 unverified
users on a per-project policy.

### Password reset

\`POST /auth/forgot-password { email }\` emails a short-lived token;
\`POST /auth/reset-password { token, newPassword }\` validates and
updates. **Seam**: a new \`password_reset_tokens\` table in
\`packages/db\` (parallel to \`refresh_tokens\`), a new store
implementation in \`apps/api/src/internal/auth/\`, two new routes on
the auth sub-router. The \`hashPassword\` function in
\`@starter/auth\` is the password-update primitive.

### MFA (TOTP, WebAuthn, SMS)

Step-up auth: after password login, a second factor. **Seam**: add a
\`user_factors\` table (factor type, public key / secret, last used
counter), a \`/auth/mfa/*\` route group, and a per-project policy
in \`apps/api\` (which routes require step-up). The lib's
\`signToken\` / \`verifyToken\` stay unchanged — you can issue
short-lived step-up tokens with a custom payload field.

### OAuth / social login (Google, GitHub, etc.)

\`POST /auth/oauth/{provider}/callback { code }\` exchanges an auth
code for a user identity, then either finds-or-creates a row in
\`users\`, then issues a token pair. **Seam**: add a per-provider
config block (\`GOOGLE_CLIENT_ID\`, \`GOOGLE_CLIENT_SECRET\`, ...) to
\`apps/api/src/config.ts\`; a new \`oauth_accounts\` table linking
provider+subject to userId; the existing \`issueTokenPair\` handles
the rest. The web client redirects; the api handles the callback.

### RBAC (roles, permissions, organizations)

Beyond "a single authenticated principal", role/permission checks
(\`role: 'admin'\`, \`can('items:write')\`, etc.) are per-domain. **Seam**:
add the columns/tables you need to \`packages/db\` (e.g.
\`user_roles(user_id, role)\`), a \`requireRole(...)\` middleware
parallel to \`requireAuth\` in \`apps/api/src/internal/auth/\`, and
apply it to the routes that need it. The base \`requireAuth\` is
unchanged — the \`userId\` it sets on the context is the FK into
your role tables.

## Why these are fences, not features

Decision 12 (locked): the starter owns the surface, not the entire
auth system. A "real minimal auth" is a contradiction — real auth has
no minimum, and shipping one turns the starter into a *maintained
auth framework* (every CVE, every rotation bug lands forever). A
"documented stub" is the bait-and-switch rejected at the architecture
level in decision 10. Fences are the third path: the seam is real,
the shim is honest, the rest is a deliberate handoff.
`;
}
