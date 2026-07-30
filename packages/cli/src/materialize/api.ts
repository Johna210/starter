// Materializer: apps/api templates (Hono app + items module + auth wiring).
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 14 files written into apps/api (package.json, tsconfig, .env
// example, src/index.ts, src/server.ts, src/config.ts, plus the items
// module under src/internal/items/: items.repo.ts, items.repo.drizzle.ts,
// items.routes.ts, index.ts, items.repo.test.ts; the auth module lives
// in api-auth.ts and is composed by buildApp()). The orchestrator
// (materialize.ts) calls writeApi(ctx); template functions are private
// to this module.

import { join } from 'node:path';
import { type Composition } from '../composition.js';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeApi(ctx: ProjectContext, composition?: Composition): Promise<void> {
  const { targetDir } = ctx;
  const isMicroservices = composition?.topology === 'microservices';

  await writeFileRecursive(join(targetDir, 'apps/api/package.json'), apiPackageJson(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/api/tsconfig.json'), apiTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/api/.env.example'), apiEnvExample(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/api/src/index.ts'), apiIndexTs(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/api/src/server.ts'), apiServerTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/config.ts'), apiConfigTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/items.repo.ts'), apiItemsRepoTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/items.repo.drizzle.ts'), apiItemsRepoDrizzleTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/items.routes.ts'), apiItemsRoutesTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/index.ts'), apiItemsIndexTs());
  await writeFileRecursive(join(targetDir, 'apps/api/src/internal/items/items.repo.test.ts'), apiItemsRepoTestTs());

  // Shape 2 (microservices): apps/api doesn't own auth — it verifies
  // tokens locally via the shared @starter/auth package. The verify
  // middleware lives at apps/api/src/middleware/auth.ts.
  if (isMicroservices) {
    await writeFileRecursive(join(targetDir, 'apps/api/src/middleware/auth.ts'), apiVerifyMiddlewareTs());
  }
}

function apiPackageJson(isMicroservices: boolean): string {
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

function apiEnvExample(isMicroservices: boolean): string {
  if (isMicroservices) {
    return `# @starter/api — local dev env (git-ignored; copy to .env).
#
# Shape 2 (TS-microservices): apps/api is the CONSUMER of tokens, not
# the minter. apps/api-auth (sibling service) holds the signing key and
# issues tokens. apps/api only calls verifyToken() from @starter/auth
# (decision 10/11: the "wrap, not replace" pattern — the shared
# packages/auth package is the seam, the service just wraps it).
#
# JWT_SECRET must still be set here because HS256 is symmetric: apps/api
# needs the same secret to verify the tokens apps/api-auth signs. The
# invariant (decision 11) is about who SIGNS, not who holds the key —
# apps/api never calls signToken / issueTokenPair.

# api runtime config (decision 28). Loaded by src/config.ts via dotenv.
# PORT — port the api binds to (default 3000).
# DATABASE_URL — Postgres connection string; consumed via @starter/db's
# zod schema (decision 14).
#
# JWT_SECRET — HS256 verification secret. Must match apps/api-auth's
# JWT_SECRET (the signing key lives there). Must be at least 32 chars
# (256 bits). Generate a fresh one with: openssl rand -base64 48
JWT_SECRET=replace-me-with-a-32-plus-char-random-secret

# Optional: token TTLs in seconds. Must match apps/api-auth's settings.
# ACCESS_TOKEN_TTL=900
# REFRESH_TOKEN_TTL=604800

PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
`;
  }
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
# refresh 604_800 (7 days). Decision 16: short-lived access,
# longer-lived refresh; the refresh rotation (/auth/refresh) issues
# a new pair on every successful call.
# ACCESS_TOKEN_TTL=900
# REFRESH_TOKEN_TTL=604800

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

function apiIndexTs(isMicroservices: boolean): string {
  if (isMicroservices) {
    return `// @starter/api — Hono app definition (decision 18, 27).
//
// Shape 2 (TS-microservices): apps/api is the MAIN API. It owns the
// business domains (items here) and verifies tokens LOCALLY via the
// @starter/auth package — no network hop for verification (decision 10/11).
//
// Auth surface is served by a SIBLING service, apps/api-auth (separate
// deployable). The wrap-not-replace pattern: apps/api-auth wraps the
// same @starter/auth package; both services import the canonical
// implementation. Sole-minter invariant (decision 11): apps/api-auth
// is the only process that calls signToken / issueTokenPair; apps/api
// only calls verifyToken().
//
// Modular monolith (decision 27): each domain lives in
// src/internal/<name>/ as a self-contained module with a typed
// interface, mounted at a prefix on the root router.
//
// buildApp() is called at server startup, not at import time. This
// means type-only imports of this file (e.g. from the api-client) are
// cheap: no env parsing, no Postgres connection.
//
// Auth wiring (decision 10/11/12/16):
// - /items is wrapped in a \`requireAuth\`-protected subtree: every
//   request to /items must carry a valid Bearer access token, else 401.
//   The protected subtree is its own Hono() with
//   \`.use('*', requireAuth(authConfig))\` so the items module itself
//   stays auth-agnostic.
// - requireAuth verifies via the shared @starter/auth package
//   (decision 10: wrap, not replace). The config is read once and
//   threaded through.

import { Hono } from 'hono';
import { readAuthConfig } from '@starter/auth';
import { makeItemsModule } from './internal/items/index.js';
import { requireAuth } from './middleware/auth.js';

export function buildApp() {
  const authConfig = readAuthConfig();

  return new Hono()
    .get('/health', (c) => c.json({ status: 'ok' }))
    .route(
      '/items',
      new Hono().use('*', requireAuth(authConfig)).route('/', makeItemsModule()),
    );
}

export type AppType = ReturnType<typeof buildApp>;
`;
  }
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
// Auth wiring (decision 12, 16):
// - /auth is mounted *unprotected* — register/login are public.
// - /items is wrapped in a \`requireAuth\`-protected subtree (issue 06):
//   every request to /items must carry a valid Bearer access token,
//   else 401. The protected subtree is its own Hono() with
//   \`.use('*', requireAuth(authConfig))\` so the items module itself
//   stays auth-agnostic (it just sees a verified userId on the context).
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

  // /items is now protected (issue 06). The protected subtree is its
  // own Hono so the \`.use('*', requireAuth(...))\` middleware fires
  // on every /items request without leaking into the rest of the app.
  // Chained (not const-then-mutate) so Hono RPC type inference flows
  // end-to-end into the api-client.
  return new Hono()
    .get('/health', (c) => c.json({ status: 'ok' }))
    .route('/auth', auth)
    .route(
      '/items',
      new Hono().use('*', requireAuth(authConfig)).route('/', makeItemsModule()),
    );
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
//
// Type-inference note: the routes are defined in a chained
// \`new Hono().get(...).post(...)\` style rather than a
// \`const r = new Hono(); r.get(...); r.post(...); return r;\` style.
// Hono's per-route schema is preserved through the chained builder;
// the const-then-mutate pattern collapses the function's return type
// to the default \`Hono\`, which loses the route schema and breaks
// the api-client's Hono RPC inference (issue 05 surfaced this).

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { CreateItemInput, ItemsRepo } from './items.repo.js';

const createItemSchema = z.object({
  name: z.string().min(1).max(256),
});

export type ItemsRoutes = ReturnType<typeof makeItemsRoutes>;

export function makeItemsRoutes(repo: ItemsRepo) {
  return new Hono()
    .get('/', async (c) => {
      const list = await repo.list();
      return c.json(list);
    })
    .post('/', zValidator('json', createItemSchema), async (c) => {
      const body = c.req.valid('json');
      const input: CreateItemInput = { name: body.name };
      const item = await repo.create(input);
      return c.json(item, 201);
    });
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

function apiVerifyMiddlewareTs(): string {
  return `// @starter/api — verifyToken middleware (decision 10, 11, 27).
//
// Shape 2 (TS-microservices): apps/api is the TOKEN CONSUMER, not the
// minter. apps/api-auth (sibling service) holds the signing key and
// issues tokens; apps/api only calls verifyToken() from the shared
// @starter/auth package (decision 10: wrap, not replace — the package
// is the seam, the services are deployable wrappers around it).
//
// Protects a route (or a router subtree) by requiring a valid access
// token in the \`Authorization: Bearer …\` header. On success the
// verified \`userId\` is set on the Hono context (\`c.get('userId')\`)
// so downstream handlers can use it.
//
// 401 (with a JSON error body) on any failure — missing header, wrong
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
