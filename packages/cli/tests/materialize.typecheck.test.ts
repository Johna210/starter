// End-to-end contract test: materialize the scaffolded project, install
// its deps, and verify tsc --noEmit passes in every workspace.
//
// This is the strongest test the CLI can run: it proves the materialized
// code typechecks end-to-end (cross-package imports, Hono RPC inference
// from @starter/api into @starter/api-client, etc.). The catch: it shells
// out to pnpm and tsc, which is slow. Gated on RUN_TYPE_CHECK=1 so the
// fast suite stays fast.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { TS_MONOLITH_VITE, TS_MICROSERVICES_VITE } from '../src/composition.js';
import { materialize } from '../src/materialize.js';

const exec = promisify(execFile);

const SHOULD_RUN = process.env.RUN_TYPE_CHECK === '1';
const describeIt = SHOULD_RUN ? describe : describe.skip;

describeIt('materialize + install + typecheck (RUN_TYPE_CHECK=1)', () => {
  let targetDir: string;
  const TIMEOUT = 10 * 60 * 1000; // 10 min for pnpm install

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'create-fs-starter-e2e-'));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  it(
    'the materialized TS-monolith project typechecks end-to-end',
    async () => {
      // 1. Materialize
      await materialize({ targetDir, name: 'e2e-app' }, TS_MONOLITH_VITE);

      // 2. Install
      await exec('pnpm', ['install', '--prefer-offline'], { cwd: targetDir });

      // 3. Typecheck each workspace
      for (const ws of [
        'packages/db',
        'packages/api-client',
        'apps/api',
        'apps/web',
      ]) {
        const { stdout, stderr } = await exec('pnpm', ['typecheck'], {
          cwd: join(targetDir, ws),
        });
        expect(stdout + stderr, `tsc failed in ${ws}`).not.toMatch(/error TS/);
      }
    },
    TIMEOUT,
  );

  it(
    'the materialized TS-microservices project typechecks end-to-end (issue #12)',
    async () => {
      // 1. Materialize
      await materialize({ targetDir, name: 'e2e-app' }, TS_MICROSERVICES_VITE);

      // 2. Install
      await exec('pnpm', ['install', '--prefer-offline'], { cwd: targetDir });

      // 3. Typecheck each workspace (shape 2 has apps/api-auth too)
      for (const ws of [
        'packages/db',
        'packages/api-client',
        'apps/api',
        'apps/api-auth',
        'apps/web',
      ]) {
        const { stdout, stderr } = await exec('pnpm', ['typecheck'], {
          cwd: join(targetDir, ws),
        });
        expect(stdout + stderr, `tsc failed in ${ws}`).not.toMatch(/error TS/);
      }
    },
    TIMEOUT,
  );
});
