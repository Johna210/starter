import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { VERSION } from '../src/version.js';

// Decision 35: the CLI version, the npm package version, and the Starter
// repo tag share ONE version — packages/cli/package.json is the single
// source. The release pipeline (docs/contributing/release.md) enforces
// tag == package.json; this test enforces the runtime value ==
// package.json, so a version bump can never drift from what the CLI
// reports (and what the materializer stamps as `starterVersion`).

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

describe('VERSION (single version source, decision 35)', () => {
  it('equals packages/cli/package.json version', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('is a semver string (vX.Y.Z tag-able)', () => {
    expect(VERSION).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+$/);
  });

  it('is stamped as starterVersion into scaffolded projects', async () => {
    const { materialize } = await import('../src/materialize.js');
    const { TS_MONOLITH_VITE } = await import('../src/composition.js');
    const { mkdtemp, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const targetDir = await mkdtemp(join(tmpdir(), 'create-fs-version-test-'));
    try {
      await materialize({ targetDir, name: 'version-test' }, TS_MONOLITH_VITE);
      const pkgJson = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf8')) as {
        starterVersion?: string;
      };
      expect(pkgJson.starterVersion).toBe(VERSION);
    } finally {
      await rm(targetDir, { recursive: true, force: true });
    }
  });
});
