import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../src/cli.js';

describe('runCli', () => {
  let workDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'create-fs-cli-test-'));
    originalCwd = process.cwd();
    process.chdir(workDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(workDir, { recursive: true, force: true });
  });

  describe('usage', () => {
    it('returns usage error when no target is given', async () => {
      const result = await runCli([], { noExit: true });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('usage');
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Usage');
    });

    it('returns help text for --help', async () => {
      const result = await runCli(['--help'], { noExit: true });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('usage');
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('Usage');
      expect(result.message).toContain('--yes');
    });
  });

  describe('successful scaffold', () => {
    it('materializes the TS-monolith composition when answers are provided', async () => {
      const result = await runCli(['my-app'], {
        noExit: true,
        answers: {
          backend: 'ts',
          topology: 'monolith',
          web: 'vite',
          mobile: 'none',
          ai: 'off',
        },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.composition).toEqual({
        backend: 'ts',
        topology: 'monolith',
        web: 'vite',
        mobile: 'none',
        ai: 'off',
      });
      expect(result.targetDir).toBe(join(workDir, 'my-app'));

      // Verify the scaffold was actually written
      const targetDir = join(workDir, 'my-app');
      expect((await stat(targetDir)).isDirectory()).toBe(true);
      for (const file of ['package.json', 'pnpm-workspace.yaml', 'Taskfile.yml']) {
        expect((await stat(join(targetDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
      const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('my-app');
    });
  });

  describe('unimplemented composition', () => {
    it('returns unimplemented error for Go backend', async () => {
      const result = await runCli(['my-app'], {
        noExit: true,
        answers: {
          backend: 'go',
          topology: 'monolith',
          web: 'vite',
          mobile: 'none',
          ai: 'off',
        },
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('unimplemented');
      expect(result.exitCode).toBe(1);
      expect(result.message).toMatch(/not yet implemented/i);
    });

    it('does not write any files when composition is unimplemented', async () => {
      await runCli(['my-app'], {
        noExit: true,
        answers: {
          backend: 'go',
          topology: 'monolith',
          web: 'vite',
          mobile: 'none',
          ai: 'off',
        },
      });
      const targetDir = join(workDir, 'my-app');
      // mkdir -p still creates the directory, but no scaffold files inside
      const exists = await stat(targetDir).then(() => true).catch(() => false);
      if (exists) {
        const entries = await readdir(targetDir);
        expect(entries, 'no scaffold files should be written').toEqual([]);
      }
    });

    it('error mentions every axis that differs from the supported composition', async () => {
      const result = await runCli(['my-app'], {
        noExit: true,
        answers: {
          backend: 'go',
          topology: 'microservices',
          web: 'next',
          mobile: 'flutter',
          ai: 'on',
        },
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      const msg = result.message;
      // describeComposition should include all the differing values
      expect(msg).toContain('go');
      expect(msg).toContain('microservices');
      expect(msg).toContain('next');
      expect(msg).toContain('flutter');
    });
  });

  describe('--dry-run', () => {
    it('does not write any files', async () => {
      const result = await runCli(['my-app', '--dry-run'], {
        noExit: true,
        answers: {
          backend: 'ts',
          topology: 'monolith',
          web: 'vite',
          mobile: 'none',
          ai: 'off',
        },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.dryRun).toBe(true);

      const targetDir = join(workDir, 'my-app');
      const exists = await stat(targetDir).then(() => true).catch(() => false);
      expect(exists, 'target dir should not exist in dry-run').toBe(false);
    });
  });
});
