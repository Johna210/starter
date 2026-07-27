import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Composition, TS_MONOLITH_VITE } from '../src/composition.js';
import { materialize, UnimplementedCompositionError } from '../src/materialize.js';

describe('materialize', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'create-fs-starter-test-'));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  describe('TS-monolith + Vite+TanStack + no-mobile + no-AI', () => {
    it('writes the root scaffold files', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);

      for (const file of ['package.json', 'pnpm-workspace.yaml', 'Taskfile.yml', '.gitignore', 'README.md']) {
        const s = await stat(join(targetDir, file));
        expect(s.isFile(), `${file} should be a file`).toBe(true);
      }
    });

    it('writes the apps/web workspace (Vite+TanStack shell)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const webDir = join(targetDir, 'apps/web');
      expect((await stat(webDir)).isDirectory()).toBe(true);
      for (const file of ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html']) {
        expect((await stat(join(webDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
      const src = await readdir(join(webDir, 'src'));
      expect(src).toContain('main.tsx');
    });

    it('writes the apps/api workspace (Hono shell)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const apiDir = join(targetDir, 'apps/api');
      expect((await stat(apiDir)).isDirectory()).toBe(true);
      for (const file of ['package.json', 'tsconfig.json', 'src/index.ts']) {
        expect((await stat(join(apiDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('writes the packages/shared workspace', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const sharedDir = join(targetDir, 'packages/shared');
      expect((await stat(sharedDir)).isDirectory()).toBe(true);
      for (const file of ['package.json', 'tsconfig.json', 'src/index.ts']) {
        expect((await stat(join(sharedDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('root README documents the items demo, the db layer, and the migration command', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
      expect(readme).toMatch(/items/);
      expect(readme).toMatch(/db|migrate/i);
    });

    it('root Taskfile declares db-related targets (migrate, test:db)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      expect(tf).toContain('migrate:');
      expect(tf).toContain('test:db');
      expect(tf).toContain('packages/db');
    });

    it('apps/web depends on @starter/api-client and uses it in a typed smoke import', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'apps/web/package.json'), 'utf8'),
      );
      expect(pkg.dependencies['@starter/api-client']).toBe('workspace:*');

      const api = await readFile(join(targetDir, 'apps/web/src/lib/api.ts'), 'utf8');
      expect(api).toContain('@starter/api-client');
      expect(api).toContain('createApiClient');
    });

    it('writes the packages/auth workspace (passwords + tokens + refresh)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const authDir = join(targetDir, 'packages/auth');
      expect((await stat(authDir)).isDirectory()).toBe(true);
      for (const file of [
        'package.json',
        'tsconfig.json',
        'src/index.ts',
        'src/passwords.ts',
        'src/tokens.ts',
        'src/refresh.ts',
        'src/config.ts',
        'src/types.ts',
        'src/passwords.test.ts',
        'src/tokens.test.ts',
        'src/refresh.test.ts',
      ]) {
        expect((await stat(join(authDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('packages/auth/package.json declares @starter/auth and the right deps', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'packages/auth/package.json'), 'utf8'),
      );
      expect(pkg.name).toBe('@starter/auth');
      expect(pkg.dependencies['argon2']).toEqual(expect.any(String));
      expect(pkg.dependencies['jose']).toEqual(expect.any(String));
      expect(pkg.dependencies['zod']).toEqual(expect.any(String));
    });

    it('packages/auth passwords.ts uses argon2id with vetted library', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pw = await readFile(
        join(targetDir, 'packages/auth/src/passwords.ts'),
        'utf8',
      );
      expect(pw).toContain('hashPassword');
      expect(pw).toContain('verifyPassword');
      expect(pw).toMatch(/argon2id/);
      expect(pw).toContain('argon2');
    });

    it('packages/auth tokens.ts uses jose and exposes signToken/verifyToken', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tk = await readFile(
        join(targetDir, 'packages/auth/src/tokens.ts'),
        'utf8',
      );
      expect(tk).toContain('signToken');
      expect(tk).toContain('verifyToken');
      expect(tk).toContain('jose');
    });

    it('packages/auth refresh.ts implements issueTokenPair + rotateTokenPair', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const rf = await readFile(
        join(targetDir, 'packages/auth/src/refresh.ts'),
        'utf8',
      );
      expect(rf).toContain('issueTokenPair');
      expect(rf).toContain('rotateTokenPair');
      expect(rf).toContain('TokenPair');
    });

    it('packages/auth exports the TokenPair type from the barrel', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(
        join(targetDir, 'packages/auth/src/index.ts'),
        'utf8',
      );
      expect(idx).toContain('TokenPair');
      expect(idx).toContain('hashPassword');
      expect(idx).toContain('verifyPassword');
      expect(idx).toContain('signToken');
      expect(idx).toContain('verifyToken');
      expect(idx).toContain('issueTokenPair');
      expect(idx).toContain('rotateTokenPair');
    });

    it('packages/db ships users and refresh_tokens schemas (auth tables)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const dbDir = join(targetDir, 'packages/db');
      for (const file of [
        'src/schema/users.ts',
        'src/schema/refresh-tokens.ts',
        'migrations/0001_users.sql',
        'migrations/0002_refresh_tokens.sql',
      ]) {
        expect((await stat(join(dbDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
      // and the existing items schema/migrations still in place
      expect((await stat(join(dbDir, 'src/schema/items.ts'))).isFile()).toBe(true);
      expect((await stat(join(dbDir, 'migrations/0000_items.sql'))).isFile()).toBe(true);
    });

    it('users table has id, email (unique), passwordHash, createdAt', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const sql = await readFile(
        join(targetDir, 'packages/db/migrations/0001_users.sql'),
        'utf8',
      );
      expect(sql).toMatch(/CREATE TABLE/i);
      expect(sql).toContain('"id"');
      expect(sql).toContain('"email"');
      expect(sql).toMatch(/UNIQUE/i);
      expect(sql).toContain('"password_hash"');
      expect(sql).toContain('"created_at"');
    });

    it('refresh_tokens table has id, user_id (FK), jti (unique), expires_at, revoked_at', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const sql = await readFile(
        join(targetDir, 'packages/db/migrations/0002_refresh_tokens.sql'),
        'utf8',
      );
      expect(sql).toMatch(/CREATE TABLE/i);
      expect(sql).toContain('"id"');
      expect(sql).toContain('"user_id"');
      expect(sql).toContain('"jti"');
      expect(sql).toMatch(/UNIQUE/i);
      expect(sql).toContain('"expires_at"');
      expect(sql).toContain('"revoked_at"');
    });

    it('writes the apps/api internal/auth module (repo + routes + middleware + index)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const authDir = join(targetDir, 'apps/api/src/internal/auth');
      expect((await stat(authDir)).isDirectory()).toBe(true);
      for (const file of [
        'auth.repo.ts',
        'auth.repo.drizzle.ts',
        'auth.routes.ts',
        'auth.middleware.ts',
        'index.ts',
        'auth.repo.test.ts',
      ]) {
        expect((await stat(join(authDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('auth.routes.ts exposes register / login / refresh / logout endpoints', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const routes = await readFile(
        join(targetDir, 'apps/api/src/internal/auth/auth.routes.ts'),
        'utf8',
      );
      for (const path of ['/register', '/login', '/refresh', '/logout']) {
        expect(routes, `auth.routes should mount ${path}`).toContain(`'${path}'`);
      }
      expect(routes).toContain('hashPassword');
      expect(routes).toContain('verifyPassword');
      expect(routes).toContain('issueTokenPair');
      expect(routes).toContain('rotateTokenPair');
      expect(routes).toContain('revokeRefreshToken');
    });

    it('auth.middleware.ts exposes a verifyToken middleware factory', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const mw = await readFile(
        join(targetDir, 'apps/api/src/internal/auth/auth.middleware.ts'),
        'utf8',
      );
      expect(mw).toContain('verifyToken');
      expect(mw).toMatch(/requireAuth|verifyAuth/i);
      expect(mw).toMatch(/401/);
    });

    it('root README documents the auth endpoints and the JWT_SECRET requirement', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
      // Auth endpoints
      expect(readme).toMatch(/\/auth\/register|\/auth\/login|register|login/i);
      // JWT_SECRET requirement
      expect(readme).toContain('JWT_SECRET');
    });

    it('root Taskfile declares test:auth target (auth shim unit tests)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      expect(tf).toContain('test:auth');
      expect(tf).toContain('packages/auth');
    });

    it('scaffolded project ships docs/wire-it-in/auth.md (decision 30/31)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const wireItIn = join(targetDir, 'docs/wire-it-in/auth.md');
      expect((await stat(wireItIn)).isFile(), 'docs/wire-it-in/auth.md should exist').toBe(true);
      const md = await readFile(wireItIn, 'utf8');
      // The five fences the issue calls out
      for (const fence of ['email verif', 'password reset', 'MFA', 'OAuth', 'RBAC']) {
        expect(md, `auth.md should mention ${fence}`).toMatch(new RegExp(fence, 'i'));
      }
      // And points at the auth shim as the seam
      expect(md).toMatch(/@starter\/auth|seam|shim/i);
    });

    it('apps/api .env.example documents JWT_SECRET (sole minter, decision 11)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const env = await readFile(join(targetDir, 'apps/api/.env.example'), 'utf8');
      expect(env).toContain('JWT_SECRET');
      // optional TTLs should be documented too
      expect(env).toMatch(/ACCESS_TOKEN_TTL|REFRESH_TOKEN_TTL/);
    });

    it('apps/api buildApp mounts the auth module at /auth and protects /items with requireAuth', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(join(targetDir, 'apps/api/src/index.ts'), 'utf8');
      // /auth is mounted (unprotected — register/login are public)
      expect(idx).toMatch(/\.route\(\s*['"]\/auth['"]/);
      // /items is protected: requireAuth middleware is applied
      expect(idx).toContain('requireAuth');
      // the items module is composed via makeItemsModule
      expect(idx).toContain('makeItemsModule');
      // auth module is composed via makeAuthModule
      expect(idx).toContain('makeAuthModule');
    });

    it('auth.repo.drizzle.ts wires the Drizzle-backed UserStore + RefreshTokenStore', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const repo = await readFile(
        join(targetDir, 'apps/api/src/internal/auth/auth.repo.drizzle.ts'),
        'utf8',
      );
      expect(repo).toContain('usersTable');
      expect(repo).toContain('refreshTokensTable');
      expect(repo).toMatch(/@starter\/db/);
    });

    it('packages/db barrel re-exports usersTable and refreshTokensTable', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(join(targetDir, 'packages/db/src/index.ts'), 'utf8');
      expect(idx).toContain('usersTable');
      expect(idx).toContain('refreshTokensTable');
    });

    it('packages/auth unit tests use real libraries (no mocks)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pwTest = await readFile(
        join(targetDir, 'packages/auth/src/passwords.test.ts'),
        'utf8',
      );
      const tkTest = await readFile(
        join(targetDir, 'packages/auth/src/tokens.test.ts'),
        'utf8',
      );
      const rfTest = await readFile(
        join(targetDir, 'packages/auth/src/refresh.test.ts'),
        'utf8',
      );
      // decision 22: real libraries, not mocks
      expect(pwTest).not.toMatch(/vi\.mock/);
      expect(tkTest).not.toMatch(/vi\.mock/);
      expect(rfTest).not.toMatch(/vi\.mock/);
      // each test file uses the actual library it's testing
      expect(pwTest).toContain('hashPassword');
      expect(tkTest).toContain('signToken');
      expect(rfTest).toContain('issueTokenPair');
    });

    it('writes the packages/api-client workspace (typed Hono RPC client)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const dir = join(targetDir, 'packages/api-client');
      expect((await stat(dir)).isDirectory()).toBe(true);
      for (const file of ['package.json', 'tsconfig.json', 'src/index.ts']) {
        expect((await stat(join(dir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('packages/api-client exports createApiClient typed via Hono RPC', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(
        join(targetDir, 'packages/api-client/src/index.ts'),
        'utf8',
      );
      expect(idx).toContain('createApiClient');
      expect(idx).toContain('hono/client');
      expect(idx).toContain('@starter/api');
      expect(idx).toMatch(/hc</);
    });

    it('packages/api-client/package.json declares @starter/api-client and the right deps', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'packages/api-client/package.json'), 'utf8'),
      );
      expect(pkg.name).toBe('@starter/api-client');
      expect(pkg.dependencies['@starter/api']).toBe('workspace:*');
      expect(pkg.dependencies['hono']).toEqual(expect.any(String));
    });

    it('writes the apps/api internal/items module (repo + routes + drizzle impl)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const itemsDir = join(targetDir, 'apps/api/src/internal/items');
      expect((await stat(itemsDir)).isDirectory()).toBe(true);
      for (const file of [
        'items.repo.ts',
        'items.repo.drizzle.ts',
        'items.routes.ts',
        'index.ts',
      ]) {
        expect((await stat(join(itemsDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('items.repo.ts declares the typed ItemsRepo interface', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const repo = await readFile(
        join(targetDir, 'apps/api/src/internal/items/items.repo.ts'),
        'utf8',
      );
      expect(repo).toContain('ItemsRepo');
      expect(repo).toContain('list');
      expect(repo).toContain('create');
    });

    it('items.routes.ts exposes GET and POST handlers via a Hono router factory', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const routes = await readFile(
        join(targetDir, 'apps/api/src/internal/items/items.routes.ts'),
        'utf8',
      );
      expect(routes).toContain('Hono');
      expect(routes).toMatch(/items\.(get|post)\(/);
      expect(routes).toContain('makeItemsRoutes');
    });

    it('items.repo.drizzle.ts is the Drizzle-backed implementation of ItemsRepo', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const impl = await readFile(
        join(targetDir, 'apps/api/src/internal/items/items.repo.drizzle.ts'),
        'utf8',
      );
      expect(impl).toContain('ItemsRepo');
      expect(impl).toContain('@starter/db');
      expect(impl).toMatch(/drizzle-orm/);
    });

    it('writes the packages/db workspace (Drizzle + items schema + migration)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const dbDir = join(targetDir, 'packages/db');
      expect((await stat(dbDir)).isDirectory()).toBe(true);
      for (const file of [
        'package.json',
        'tsconfig.json',
        'drizzle.config.ts',
        '.env.example',
        'src/index.ts',
        'src/config.ts',
        'src/client.ts',
        'src/schema/items.ts',
        'migrations/0000_items.sql',
      ]) {
        expect((await stat(join(dbDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('packages/db/package.json declares @starter/db and the right deps', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'packages/db/package.json'), 'utf8'),
      );
      expect(pkg.name).toBe('@starter/db');
      expect(pkg.dependencies['drizzle-orm']).toEqual(expect.any(String));
      expect(pkg.dependencies['pg']).toEqual(expect.any(String));
      expect(pkg.dependencies['zod']).toEqual(expect.any(String));
      expect(pkg.devDependencies['drizzle-kit']).toEqual(expect.any(String));
    });

    it('packages/db migrations create the items table with id, name, created_at', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const sql = await readFile(
        join(targetDir, 'packages/db/migrations/0000_items.sql'),
        'utf8',
      );
      expect(sql).toMatch(/CREATE TABLE/i);
      expect(sql).toMatch(/items/i);
      expect(sql).toContain('"id"');
      expect(sql).toContain('"name"');
      expect(sql).toContain('"created_at"');
    });

    it('packages/db exports the itemsTable from the schema barrel', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const index = await readFile(join(targetDir, 'packages/db/src/index.ts'), 'utf8');
      expect(index).toContain('itemsTable');
    });

    it('packages/db ships a zod-validated config with a databaseUrl schema', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const cfg = await readFile(join(targetDir, 'packages/db/src/config.ts'), 'utf8');
      expect(cfg).toContain('zod');
      expect(cfg).toMatch(/databaseUrl/i);
    });

    it('substitutes the project name in the root package.json', async () => {
      await materialize({ targetDir, name: 'my-cool-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('my-cool-app');
    });

    it('declares pnpm workspaces in the root pnpm-workspace.yaml', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const ws = await readFile(join(targetDir, 'pnpm-workspace.yaml'), 'utf8');
      expect(ws).toContain('apps/*');
      expect(ws).toContain('packages/*');
    });

    it('declares dev / test / build in the root Taskfile.yml', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      for (const task of ['dev:', 'test:', 'build:']) {
        expect(tf, `Taskfile should declare ${task}`).toContain(task);
      }
    });
  });

  describe('unimplemented compositions', () => {
    it('throws UnimplementedCompositionError for Go backend', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
      await expect(materialize({ targetDir, name: 'test-app' }, composition)).rejects.toBeInstanceOf(
        UnimplementedCompositionError,
      );
    });

    it('throws UnimplementedCompositionError for TS + microservices', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, topology: 'microservices' };
      await expect(materialize({ targetDir, name: 'test-app' }, composition)).rejects.toBeInstanceOf(
        UnimplementedCompositionError,
      );
    });

    it('throws UnimplementedCompositionError when web variant differs', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, web: 'next' };
      await expect(materialize({ targetDir, name: 'test-app' }, composition)).rejects.toBeInstanceOf(
        UnimplementedCompositionError,
      );
    });

    it('error message mentions the composition and is human-readable', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
      try {
        await materialize({ targetDir, name: 'test-app' }, composition);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(UnimplementedCompositionError);
        const msg = (err as Error).message;
        expect(msg).toMatch(/not yet implemented/i);
        expect(msg).toContain('go');
        expect(msg).toContain('monolith');
      }
    });

    it('does not create any files when the composition is unimplemented', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
      await expect(materialize({ targetDir, name: 'test-app' }, composition)).rejects.toBeInstanceOf(
        UnimplementedCompositionError,
      );
      const entries = await readdir(targetDir);
      expect(entries, 'target dir should be empty after a failed materialize').toEqual([]);
    });
  });
});
