// Materializer: apps/api internal/auth templates.
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 7 files written into apps/api/src/internal/auth/ (auth.repo.ts,
// auth.repo.drizzle.ts, auth.routes.ts, auth.middleware.ts, index.ts,
// auth.repo.test.ts). The orchestrator (materialize.ts) calls
// writeApiAuth(ctx); template functions are private to this module.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeApiAuth(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

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
}

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
// Web-auth flow (decision 16, issue 06): login + register set the
// refresh token in an **httpOnly cookie** and return both tokens in
// the response body. The cookie is the durable, XSS-safe channel
// (browser sends it automatically on /auth/refresh); the body is what
// the SPA's api-client stores in memory as the access token. The
// mobile flow (issue 12) just doesn't use the cookie \u2014 the body
// tokens alone are enough for secure storage + body-refresh.
//
// Type-inference note: the routes are defined in a chained
// \`new Hono().post(...).post(...)\` style rather than a
// \`const r = new Hono(); r.post(...); r.post(...); return r;\` style.
// Hono's per-route schema is preserved through the chained builder;
// the const-then-mutate pattern collapses the function's return type
// to the default \`Hono\`, which loses the route schema and breaks
// the api-client's Hono RPC inference (issue 05 surfaced this).

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
    // flip this to true \u2014 the cookie is already httpOnly + sameSite
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
    // POST /auth/register \u2014 { email, password } \u2192 { access, refresh, userId } (201)
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
    // POST /auth/login \u2014 { email, password } \u2192 { access, refresh, userId } + httpOnly cookie
    .post('/login', zValidator('json', loginSchema), async (c) => {
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
      setRefreshCookie(c, pair.refresh, deps.config);
      return c.json({ access: pair.access, refresh: pair.refresh, userId: String(user.id) });
    })
    // POST /auth/refresh \u2014 cookie (web) OR body (mobile) \u2192 { access, refresh } + new cookie
    .post('/refresh', async (c) => {
      // Read the body if present; the cookie path doesn't need a body.
      // \`safeJson\` swallows malformed JSON (returns 400) \u2014 for
      // /refresh, the cookie fallback means an empty body is fine.
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
    // POST /auth/logout \u2014 cookie (web) OR body (mobile) \u2192 { ok: true } (revoke the refresh + clear cookie)
    .post('/logout', async (c) => {
      const body = (await c.req.json().catch(() => ({}))) as { refresh?: string };
      const refresh = readRefreshToken(c, body);
      if (refresh) {
        try {
          await revokeRefreshToken(refresh, deps.config, deps.refreshTokens);
        } catch (err) {
          if (!(err instanceof InvalidTokenError)) throw err;
          // Invalid/expired refresh is fine on logout \u2014 we just
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
