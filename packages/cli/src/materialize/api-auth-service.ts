// Materializer: apps/api-auth templates (standalone auth service, decision 10/11).
//
// Per issue #12 (shape 2 — TS-microservices), the auth module is extracted
// from apps/api into its own deployable service: apps/api-auth. This service
// wraps the shared @starter/auth package and owns the /auth/* HTTP surface
// (register, login, refresh, logout). It is the SOLE MINTER of JWTs in
// shape 2 (decision 11).
//
// apps/api (the main API) no longer holds an internal/auth module; it
// verifies tokens locally via the @starter/auth import (no network hop).
// The "wrap, not replace" pattern (decision 10): both services import the
// canonical @starter/auth package; apps/api-auth just owns the HTTP surface
// + the signing key.
//
// Per issue #27 the materializer is split by workspace; this module owns
// the files written into apps/api-auth/ (package.json, tsconfig,
// .env.example, src/index.ts, src/server.ts, src/config.ts, plus the
// auth module under src/internal/auth/ which is the same content as
// the shape-1 apps/api/src/internal/auth/ but relocated as its own
// deployable).

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeApiAuthService(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeFileRecursive(join(targetDir, 'apps/api-auth/package.json'), apiAuthServicePackageJson());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/tsconfig.json'), apiAuthServiceTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/.env.example'), apiAuthServiceEnvExample());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/src/index.ts'), apiAuthServiceIndexTs());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/src/server.ts'), apiAuthServiceServerTs());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/src/config.ts'), apiAuthServiceConfigTs());

  // The auth module — same content as shape 1's apps/api/src/internal/auth/
  // but living in its own deployable.
  await writeFileRecursive(
    join(targetDir, 'apps/api-auth/src/internal/auth/auth.repo.ts'),
    apiAuthServiceRepoTs(),
  );
  await writeFileRecursive(
    join(targetDir, 'apps/api-auth/src/internal/auth/auth.repo.drizzle.ts'),
    apiAuthServiceRepoDrizzleTs(),
  );
  await writeFileRecursive(
    join(targetDir, 'apps/api-auth/src/internal/auth/auth.routes.ts'),
    apiAuthServiceRoutesTs(),
  );
  await writeFileRecursive(
    join(targetDir, 'apps/api-auth/src/internal/auth/index.ts'),
    apiAuthServiceAuthIndexTs(),
  );
  await writeFileRecursive(
    join(targetDir, 'apps/api-auth/src/internal/auth/auth.repo.test.ts'),
    apiAuthServiceRepoTestTs(),
  );
}

function apiAuthServicePackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/api-auth',
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

function apiAuthServiceTsconfigJson(): string {
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

function apiAuthServiceEnvExample(): string {
  return `# @starter/api-auth — local dev env (git-ignored; copy to .env).
#
# Shape 2 (TS-microservices): apps/api-auth is the SOLE MINTER of JWTs
# (decision 11). It holds the signing key and owns the /auth/* HTTP
# surface. apps/api (the main API) verifies tokens locally via the
# shared @starter/auth package — no network hop.
#
# JWT_SECRET must be at least 32 chars (256 bits). apps/api must set
# the SAME secret to verify (HS256 is symmetric). Generate a fresh one
# with: openssl rand -base64 48
JWT_SECRET=replace-me-with-a-32-plus-char-random-secret

# Optional: token TTLs in seconds. Defaults: access 900 (15 min),
# refresh 604_800 (7 days). Decision 16: short-lived access,
# longer-lived refresh.
# ACCESS_TOKEN_TTL=900
# REFRESH_TOKEN_TTL=604800

# Port the auth service binds to (default 3001). apps/api runs on
# 3000 by default; the web's vite proxy routes /api/auth/* here.
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
`;
}

function apiAuthServiceConfigTs(): string {
  return `// @starter/api-auth — zod-validated config (decision 28).
//
// Composes @starter/db's databaseUrlSchema with api-auth-specific
// env vars. The parse is lazy: the schema runs at the first call to
// \`loadConfig()\`, not at import time, so importing this file
// (e.g. from a test) does not require DATABASE_URL to be set.

import 'dotenv/config';
import { z } from 'zod';
import { databaseUrlSchema } from '@starter/db';

const apiAuthConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(3001),
  databaseUrl: databaseUrlSchema,
});

export type ApiAuthConfig = z.infer<typeof apiAuthConfigSchema>;

let cached: ApiAuthConfig | undefined;

export function loadConfig(): ApiAuthConfig {
  if (!cached) {
    cached = apiAuthConfigSchema.parse({
      port: process.env.PORT,
      databaseUrl: process.env.DATABASE_URL,
    });
  }
  return cached;
}
`;
}

function apiAuthServiceIndexTs(): string {
  return `// @starter/api-auth — Hono app definition (decision 10, 11, 18).
//
// Shape 2 (TS-microservices): this service is the SOLE MINTER of JWTs
// (decision 11) and owns the /auth/* HTTP surface (register, login,
// refresh, logout). It wraps the shared @starter/auth package
// (decision 10: wrap, not replace — the package is the seam, the
// service is the deployable).
//
// Sole-minter invariant: only this process calls signToken /
// issueTokenPair. apps/api (sibling service) only calls verifyToken
// from the same package. The JWT_SECRET env var is set in both
// services (HS256 is symmetric), but only this process ever SIGNS.
//
// buildApp() is called at server startup, not at import time. This
// means type-only imports of this file are cheap: no env parsing,
// no Postgres connection. The auth config and database connection
// string are read once at buildApp() and threaded through, so we
// don't parse env twice.

import { Hono } from 'hono';
import { readAuthConfig } from '@starter/auth';
import { loadConfig } from './config.js';
import { makeAuthModule } from './internal/auth/index.js';

export function buildApp() {
  const { databaseUrl } = loadConfig();
  const authConfig = readAuthConfig();
  const auth = makeAuthModule(authConfig, databaseUrl);

  return new Hono()
    .get('/health', (c) => c.json({ status: 'ok' }))
    .route('/auth', auth);
}

export type AppType = ReturnType<typeof buildApp>;
`;
}

function apiAuthServiceServerTs(): string {
  return `// @starter/api-auth — dev server entry. Runs the Hono app on PORT.
//
// This file is the \`dev\` script target. Production deployments can
// invoke \`node dist/server.js\` (after \`pnpm build\`).

import { serve } from '@hono/node-server';
import { buildApp } from './index.js';
import { loadConfig } from './config.js';

const config = loadConfig();
serve({ fetch: buildApp().fetch, port: config.port }, (info) => {
  console.log(\`api-auth listening on http://localhost:\${info.port}\`);
});
`;
}

function apiAuthServiceRepoTs(): string {
  return `// @starter/api-auth — auth repo interfaces (decision 27: split-seam).
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

function apiAuthServiceRepoDrizzleTs(): string {
  return `// @starter/api-auth — Drizzle-backed auth stores.
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

function apiAuthServiceRoutesTs(): string {
  return `// @starter/api-auth — auth routes (decision 12: /auth/{register,login,refresh,logout}).
//
// Shape 2 (TS-microservices): this is the SOLE MINTER (decision 11).
// The four endpoints here are the only place JWTs are issued. apps/api
// (sibling service) verifies tokens locally via the same @starter/auth
// package — no network hop for verification (decision 10/11).
//
// The four endpoints. Each depends on a \`UserStore\` and a
// \`RefreshTokenStore\` (interfaces in auth.repo.ts) plus an
// \`AuthConfig\` (from @starter/auth). The Drizzle impls are wired in
// ./index.ts (which buildApp() calls via makeAuthModule()).
//
// All four endpoints return JSON. On any auth failure, the response
// is 401 with a generic \`{ error }\` body — we don't leak whether
// the email exists (login) or which field was wrong (register).
//
// Web-auth flow (decision 16): login + register set the refresh token
// in an **httpOnly cookie** and return both tokens in the response
// body. The cookie is the durable, XSS-safe channel (browser sends
// it automatically on /auth/refresh); the body is what the SPA's
// api-client stores in memory as the access token.

import { Hono } from 'hono';
import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
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

/**
 * The single source of truth for the refresh-cookie name. Web +
 * api-client read it implicitly by name; the route file owns it so
 * the api-client can hard-code the same string in its refresh-on-401
 * logic (or, in a future ticket, read it from a contract endpoint).
 */
export const REFRESH_COOKIE_NAME = 'starter_refresh';

/** Set the httpOnly refresh cookie on the response. */
function setRefreshCookie(c: Context, refreshToken: string, config: AuthConfig): void {
  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    // \`lax\` is the right default for a top-level nav: it sends on same-site
    // top-level navigations (the typical login flow) but blocks cross-site
    // POSTs. Strict would be safer for a banking app; lax is the web-auth
    // (decision 16) default.
    sameSite: 'Lax',
    path: '/',
    // The refresh TTL is the cookie's hard ceiling. Aligns with the
    // JWT \`exp\` so an attacker who steals the cookie at second N
    // still has at most (expiresAt - now) to use it.
    maxAge: config.refreshTokenTtl,
    // The starter scaffolds http (localhost dev). In production,
    // flip this to true — the cookie is already httpOnly + sameSite
    // so the only missing piece is transport security.
    secure: false,
  });
}

/** Read the refresh token from the httpOnly cookie, falling back to body. */
function readRefreshToken(c: Context, body: { refresh?: unknown }): string | null {
  const fromCookie = getCookie(c, REFRESH_COOKIE_NAME);
  if (fromCookie) return fromCookie;
  if (typeof body?.refresh === 'string' && body.refresh.length > 0) return body.refresh;
  return null;
}

export interface AuthRoutesDeps {
  users: UserStore;
  refreshTokens: RefreshTokenStore;
  config: AuthConfig;
}

export type AuthRoutes = ReturnType<typeof makeAuthRoutes>;

export function makeAuthRoutes(deps: AuthRoutesDeps) {
  return new Hono()
    // POST /auth/register — { email, password } → { access, refresh, userId } (201)
    .post('/register', zValidator('json', registerSchema), async (c) => {
      const { email, password } = c.req.valid('json');
      const existing = await deps.users.findByEmail(email);
      if (existing) {
        return c.json({ error: 'email already registered' }, 409);
      }
      const passwordHash = await hashPassword(password);
      const user = await deps.users.create({ email, passwordHash });
      const pair = await issueTokenPair(String(user.id), deps.config, deps.refreshTokens);
      setRefreshCookie(c, pair.refresh, deps.config);
      return c.json({ access: pair.access, refresh: pair.refresh, userId: String(user.id) }, 201);
    })
    // POST /auth/login — { email, password } → { access, refresh, userId } + httpOnly cookie
    .post('/login', zValidator('json', loginSchema), async (c) => {
      const { email, password } = c.req.valid('json');
      const user = await deps.users.findByEmail(email);
      if (!user) {
        // Generic message — don't leak whether the email exists.
        return c.json({ error: 'invalid credentials' }, 401);
      }
      const ok = await verifyPassword(user.passwordHash, password);
      if (!ok) {
        return c.json({ error: 'invalid credentials' }, 401);
      }
      const pair = await issueTokenPair(String(user.id), deps.config, deps.refreshTokens);
      setRefreshCookie(c, pair.refresh, deps.config);
      return c.json({ access: pair.access, refresh: pair.refresh, userId: String(user.id) });
    })
    // POST /auth/refresh — cookie (web) OR body (mobile) → { access, refresh } + new cookie
    .post('/refresh', async (c) => {
      const body = (await c.req.json().catch(() => ({}))) as { refresh?: string };
      const refresh = readRefreshToken(c, body);
      if (!refresh) {
        return c.json({ error: 'missing refresh token' }, 401);
      }
      try {
        const pair = await rotateTokenPair(refresh, deps.config, deps.refreshTokens);
        setRefreshCookie(c, pair.refresh, deps.config);
        return c.json({ access: pair.access, refresh: pair.refresh });
      } catch (err) {
        if (err instanceof InvalidRefreshTokenError || err instanceof InvalidTokenError) {
          return c.json({ error: 'invalid refresh token' }, 401);
        }
        throw err;
      }
    })
    // POST /auth/logout — cookie (web) OR body (mobile) → { ok: true } (revoke the refresh + clear cookie)
    .post('/logout', async (c) => {
      const body = (await c.req.json().catch(() => ({}))) as { refresh?: string };
      const refresh = readRefreshToken(c, body);
      if (refresh) {
        try {
          await revokeRefreshToken(refresh, deps.config, deps.refreshTokens);
        } catch (err) {
          if (!(err instanceof InvalidTokenError)) throw err;
          // Invalid/expired refresh is fine on logout — we just
          // report success (idempotent) and clear the cookie.
        }
      }
      // Clear the cookie. Setting maxAge=0 instructs the browser to
      // remove it immediately.
      setCookie(c, REFRESH_COOKIE_NAME, '', { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 0 });
      return c.json({ ok: true });
    });
}
`;
}

function apiAuthServiceAuthIndexTs(): string {
  return `// @starter/api-auth — auth module barrel (decision 27: split-seam).
//
// Wires the Drizzle-backed UserStore + RefreshTokenStore to the route
// factory and exports a Hono router ready to mount at /auth. The
// consumer (apps/api-auth/src/index.ts) calls \`buildApp().route('/auth',
// makeAuthModule(authConfig, databaseUrl))\` — both the auth config and
// the database connection string are passed in, so we parse env only
// once at buildApp() time.
//
// makeAuthModule() builds the router on demand, so importing this file
// is cheap: no Postgres connection is opened at import time, and a
// missing JWT_SECRET only fails when the module is actually built (at
// service startup), not at type-only import.

import { getDb } from '@starter/db';
import type { AuthConfig } from '@starter/auth';
import { makeDrizzleUserStore, makeDrizzleRefreshTokenStore } from './auth.repo.drizzle.js';
import { makeAuthRoutes } from './auth.routes.js';

export function makeAuthModule(authConfig: AuthConfig, databaseUrl: string) {
  const db = getDb({ connectionString: databaseUrl });
  const users = makeDrizzleUserStore(db);
  const refreshTokens = makeDrizzleRefreshTokenStore(db);
  return makeAuthRoutes({ users, refreshTokens, config: authConfig });
}
`;
}

function apiAuthServiceRepoTestTs(): string {
  return `// @starter/api-auth — auth repo unit tests (decision 22).
//
// Real Postgres via @starter/db. Skips cleanly when DATABASE_URL is
// not set (so the suite is green in environments without a DB), and
// the CI matrix (issue 11) provides a Postgres service for the real run.

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
