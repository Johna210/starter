#!/usr/bin/env tsx
// ci/materialize-test-project.ts — materialize a TS-monolith project for CI.
//
// Called by the GitHub Actions workflow (issue 11) to produce a fresh
// scaffolded project that can be installed, migrated, and tested
// (unit + contract + the one E2E over items, decision 22).
//
// Usage: npx tsx ci/materialize-test-project.ts [target-dir]
//
// The target dir defaults to /tmp/test-project.

import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import { TS_MONOLITH_VITE } from '../packages/cli/src/composition.js';
import { materialize } from '../packages/cli/src/materialize.js';

async function main() {
  const targetDir = resolve(process.argv[2] ?? '/tmp/test-project');

  // Clean slate — CI runners are ephemeral but idempotent is cheaper
  // than reasoning about stale state.
  await rm(targetDir, { recursive: true, force: true });

  await materialize({ targetDir, name: 'test-project' }, TS_MONOLITH_VITE);

  console.log(`Materialized TS-monolith project to ${targetDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
