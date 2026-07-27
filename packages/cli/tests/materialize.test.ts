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
