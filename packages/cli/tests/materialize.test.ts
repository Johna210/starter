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
