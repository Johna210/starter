#!/usr/bin/env tsx
// ci/materialize-test-project.ts — materialize a scaffolded project for CI.
//
// Called by the GitHub Actions workflow (issues 11, 12) to produce a
// fresh scaffolded project that can be installed, migrated, and tested
// (unit + contract + the one E2E over items, decision 22).
//
// Usage: npx tsx ci/materialize-test-project.ts [target-dir] [shape]
//
// shape: 'ts-monolith' (default) | 'ts-microservices'
// target-dir defaults to /tmp/test-project.

import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import { type Composition, TS_MONOLITH_VITE, TS_MICROSERVICES_VITE } from '../packages/cli/src/composition.js';
import { materialize } from '../packages/cli/src/materialize.js';

function compositionForShape(shape: string): Composition {
  switch (shape) {
    case 'ts-monolith':
    case '':
    case undefined:
      return TS_MONOLITH_VITE;
    case 'ts-microservices':
      return TS_MICROSERVICES_VITE;
    default:
      throw new Error(`Unknown shape: ${shape}`);
  }
}

async function main() {
  const targetDir = resolve(process.argv[2] ?? '/tmp/test-project');
  const shape = process.argv[3] ?? 'ts-monolith';
  const composition = compositionForShape(shape);

  // Clean slate — CI runners are ephemeral but idempotent is cheaper
  // than reasoning about stale state.
  await rm(targetDir, { recursive: true, force: true });

  await materialize({ targetDir, name: 'test-project' }, composition);

  console.log(`Materialized ${shape} project to ${targetDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
