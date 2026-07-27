// Materializer: writes the scaffolded project for a given composition.
//
// Per issue #3, only the TS-monolith + Vite+TanStack + no-mobile + no-AI
// composition is materializable. All other compositions throw an
// UnimplementedCompositionError; the CLI's own tests assert both paths.
//
// Templates are kept as TS string constants (decision 25b: TS templates
// can be imported as values / type-checked, not embedded as bytes).

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { type Composition, describeComposition, isImplemented } from './composition.js';

export interface ProjectContext {
  /** Absolute path to the (empty) target directory the scaffold is written into. */
  targetDir: string;
  /** npm package name for the scaffolded project. */
  name: string;
}

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

// ---------- helpers --------------------------------------------------------

async function writeFileRecursive(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

// ---------- composition writers -------------------------------------------

/** TS-monolith + Vite+TanStack web + no mobile + no AI. */
async function writeTsMonolithVite(ctx: ProjectContext): Promise<void> {
  const { targetDir, name } = ctx;

  // Root files
  await writeFileRecursive(join(targetDir, 'package.json'), rootPackageJson(name));
  await writeFileRecursive(join(targetDir, 'pnpm-workspace.yaml'), rootPnpmWorkspaceYaml());
  await writeFileRecursive(join(targetDir, 'Taskfile.yml'), rootTaskfileYml());
  await writeFileRecursive(join(targetDir, '.gitignore'), rootGitignore());
  await writeFileRecursive(join(targetDir, 'README.md'), rootReadme(name));

  // apps/web — Vite + React + TanStack Router shell (no content yet)
  await writeFileRecursive(join(targetDir, 'apps/web/package.json'), webPackageJson());
  await writeFileRecursive(join(targetDir, 'apps/web/tsconfig.json'), webTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/web/vite.config.ts'), webViteConfig());
  await writeFileRecursive(join(targetDir, 'apps/web/index.html'), webIndexHtml());
  await writeFileRecursive(join(targetDir, 'apps/web/src/main.tsx'), webMainTsx());
  await writeFileRecursive(join(targetDir, 'apps/web/src/app.css'), webAppCss());
  await writeFileRecursive(join(targetDir, 'apps/web/src/router.tsx'), webRouter());
  await writeFileRecursive(join(targetDir, 'apps/web/src/pages/index.tsx'), webIndexPage());
  await writeFileRecursive(join(targetDir, 'apps/web/src/lib/api.ts'), webLibApi());

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
  await writeFileRecursive(join(targetDir, 'packages/db/migrations/0000_items.sql'), dbMigration0000());

  // packages/api-client — typed Hono RPC client for web/api/mobile (decision 17/18)
  await writeFileRecursive(join(targetDir, 'packages/api-client/package.json'), apiClientPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/api-client/tsconfig.json'), apiClientTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/api-client/src/index.ts'), apiClientIndexTs());
}

// ---------- root templates -------------------------------------------------

function rootPackageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      type: 'module',
      description: 'Scaffolded from create-fs-starter (TS-monolith + Vite+TanStack).',
      engines: { node: '>=20.0.0' },
      packageManager: 'pnpm@10.17.1',
      scripts: {
        dev: 'task dev',
        test: 'task test',
        build: 'task build',
      },
    },
    null,
    2,
  ) + '\n';
}

function rootPnpmWorkspaceYaml(): string {
  return `packages:
  - "apps/*"
  - "packages/*"
`;
}

function rootTaskfileYml(): string {
  return `# Taskfile.yml — scaffolded orchestrator.
#
# Boot the stack with \`task dev\`. Each subtask delegates to a
# workspace's \`pnpm\` script. Per-workspace detail lives in that
# workspace's own package.json.

version: "3"

tasks:
  default:
    desc: List available tasks
    cmds:
      - task --list
    silent: true

  dev:
    desc: Boot the full stack (web + api) in parallel
    cmds:
      - 'task dev:web & task dev:api & wait'

  dev:web:
    dir: apps/web
    cmds:
      - pnpm dev

  dev:api:
    dir: apps/api
    cmds:
      - pnpm dev

  test:
    desc: Run all tests
    cmds:
      - task: test:web
      - task: test:api
      - task: test:shared
      - task: test:db

  test:web:
    dir: apps/web
    cmds:
      - pnpm test

  test:api:
    dir: apps/api
    cmds:
      - pnpm test

  test:shared:
    dir: packages/shared
    cmds:
      - pnpm test

  test:db:
    desc: Run db tests (skips items repo test if DATABASE_URL is unset)
    dir: packages/db
    cmds:
      - pnpm test

  migrate:
    desc: Apply pending DB migrations (DATABASE_URL must be set)
    dir: packages/db
    cmds:
      - pnpm migrate

  db:generate:
    desc: Generate a new migration from the Drizzle schema
    dir: packages/db
    cmds:
      - pnpm generate

  build:
    desc: Build all workspaces
    cmds:
      - task: build:web
      - task: build:api
      - task: build:shared

  build:web:
    dir: apps/web
    cmds:
      - pnpm build

  build:api:
    dir: apps/api
    cmds:
      - pnpm build

  build:shared:
    dir: packages/shared
    cmds:
      - pnpm build
`;
}

function rootGitignore(): string {
  return `node_modules/
dist/
build/
coverage/
.env
.env.local
*.tsbuildinfo
.DS_Store
`;
}

function rootReadme(name: string): string {
  return `# ${name}

A fullstack TypeScript monorepo scaffolded from
[create-fs-starter](https://github.com/Johna210/starter).

## What's in here

- \`apps/web\` — Vite + React + TanStack Router + TanStack Query. Reaches
  the api through the typed \`api-client\` (see \`apps/web/src/lib/api.ts\`).
- \`apps/api\` — Hono on Node, modular-monolith structure: each domain lives
  in \`apps/api/src/internal/<name>/\` with a typed interface, mounted at a
  prefix. The \`items\` demo domain (decision 13) is wired end-to-end.
- \`packages/db\` — Drizzle + pg + zod. The TS schema is the single source
  of truth; \`drizzle-kit\` emits versioned SQL migrations into
  \`packages/db/migrations/\`.
- \`packages/api-client\` — typed Hono RPC client (decision 17/18). The web
  (and later, mobile) reach the api through this client with end-to-end
  type inference; no codegen, no separate OpenAPI artifact.
- \`packages/shared\` — shared TS package (zod schemas + utils, empty for now).

## The items demo (decision 13)

The scaffold ships a single trivial domain, \`items\`, to prove the whole
stack composes end-to-end on day one:

- \`GET /items\` returns the list (Hono route → \`ItemsRepo.list()\` → Drizzle → Postgres).
- \`POST /items\` with \`{ "name": "..." }\` creates a row and returns it.

It's a 5-minute delete when you start your real domain, not a refactor.

## Quickstart

\`\`\`sh
# 1. Install Taskfile (go-task) if you don't have it:
#   go install github.com/go-task/task/v3/cmd/task@latest
#   or see https://taskfile.dev/installation/

# 2. Bring up Postgres any way you like (docker, native, etc.) and set
#    DATABASE_URL in apps/api/.env and packages/db/.env.

# 3. Install deps, apply migrations, and boot the stack.
pnpm install
task migrate
task dev
\`\`\`

The web app boots on http://localhost:5173 and the api on
http://localhost:3000.

## Tasks

| Task | What it does |
|------|--------------|
| \`task dev\` | Boot web + api in parallel |
| \`task test\` | Run all workspace tests (skips items repo test if \`DATABASE_URL\` is unset) |
| \`task migrate\` | Apply pending DB migrations |
| \`task db:generate\` | Generate a new migration from the Drizzle schema |
| \`task build\` | Build all workspaces |

## Where to extend

- **Add an api domain**: \`apps/api/src/internal/<name>/\` with
  \`<name>.repo.ts\` (interface) + \`<name>.routes.ts\` (Hono) +
  \`index.ts\` (mountable module); mount it in \`apps/api/src/index.ts\`.
- **Add a db table**: edit \`packages/db/src/schema/\`, then
  \`task db:generate\` to emit a migration, then \`task migrate\`.
- **Add a web page**: create a route in \`apps/web/src/pages/\` and
  register it in \`apps/web/src/router.tsx\`; reach the api through
  \`apiClient\` (re-exported from \`apps/web/src/lib/api\`).
`;
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
      <h1>Scaffolded app</h1>
      <p>Hello from create-fs-starter. This page is intentionally empty.</p>
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
// Builds the apiClient (Hono RPC, decision 17/18) from a runtime-resolved
// base URL and gives the rest of the app a single canonical import:
// \`import { apiClient } from '@/lib/api'\`. Pages call
// \`apiClient.items.\$get()\` / \`\$post(...)\` and get end-to-end type
// inference against apps/api/src/index.ts's Hono router. Auth integration
// (issue 06) wraps this client to add transparent refresh-on-401
// (decision 16).

import { createApiClient } from '@starter/api-client';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const apiClient = createApiClient(API_URL);
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
        '@starter/db': 'workspace:*',
        'drizzle-orm': '^0.36.0',
        hono: '^4.6.0',
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

import { Hono } from 'hono';
import { makeItemsModule } from './internal/items/index.js';

export function buildApp() {
  return new Hono()
    .get('/health', (c) => c.json({ status: 'ok' }))
    .route('/items', makeItemsModule());
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
  return `// @starter/db — Drizzle client + items schema barrel.
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
