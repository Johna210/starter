// Materializer: packages/auth templates (auth shim, decision 12).
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 10 files written into packages/auth (package.json, tsconfig,
// src/index.ts, src/types.ts, src/config.ts, src/passwords.ts,
// src/tokens.ts, src/refresh.ts, src/passwords.test.ts,
// src/tokens.test.ts, src/refresh.test.ts). The orchestrator
// (materialize.ts) calls writeAuth(ctx); template functions are private
// to this module.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeAuth(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

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
}

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
  /** Refresh token TTL in seconds. Default 7 days. */
  refreshTokenTtl: z.coerce.number().int().positive().default(604_800),
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

    // The refresh tokens must differ (each has a unique jti).
    // Access tokens may be identical when generated in the same
    // millisecond with the same payload, so we don't compare them.
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
