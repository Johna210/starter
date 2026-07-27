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
import { writeShared } from './materialize/shared.js';
import { writeWeb } from './materialize/web.js';
import { writeApiClient } from './materialize/api-client.js';
import { writeDb } from './materialize/db.js';
import { writeAuth } from './materialize/auth.js';
import { writeApi } from './materialize/api.js';

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
  await writeWeb(ctx);
  await writeApi(ctx);

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

  await writeShared(ctx);
  await writeDb(ctx);

  await writeApiClient(ctx);
  await writeAuth(ctx);

  // docs/wire-it-in/auth.md — the fences the shim does NOT ship (decision 12, 30/31)
  await writeFileRecursive(join(targetDir, 'docs/wire-it-in/auth.md'), wireItInAuthMd());
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
