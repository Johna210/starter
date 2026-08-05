#!/usr/bin/env tsx
// ci/materialize-test-project.ts — materialize a scaffolded project for CI.
//
// Called by the GitHub Actions workflow (issues 11, 12, 13) to produce a
// fresh scaffolded project that can be installed, migrated, and tested
// (unit + contract + the one E2E over items, decision 22).
//
// Usage: npx tsx ci/materialize-test-project.ts [target-dir] [shape]
//
// shape: 'ts-monolith' (default, with Expo) | 'ts-microservices' (with Expo) | 'go-monolith' (with Flutter) | 'go-microservices' (with Flutter) | 'go-microservices-ai'
// target-dir defaults to /tmp/test-project.
//
// Decision 29: the blessed matrix runs the 4 combos with **mobile on** —
// Expo for TS shapes, Flutter for Go shapes (web + mobile are blessed;
// AI is not). The AI-on row is the unblessed extra and stays
// mobile-off (no Flutter scaffold there).

import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import {
  type Composition,
  GO_MICROSERVICES_NEXT,
  GO_MICROSERVICES_NEXT_AI,
  GO_MICROSERVICES_NEXT_FLUTTER,
  GO_MONOLITH_NEXT,
  GO_MONOLITH_NEXT_FLUTTER,
  TS_MICROSERVICES_VITE_EXPO,
  TS_MONOLITH_VITE_EXPO,
} from '../packages/cli/src/composition.js';
import { materialize } from '../packages/cli/src/materialize.js';

function compositionForShape(shape: string): Composition {
  switch (shape) {
    case 'ts-monolith':
    case '':
    case undefined:
      return TS_MONOLITH_VITE_EXPO;
    case 'ts-microservices':
      return TS_MICROSERVICES_VITE_EXPO;
    case 'go-monolith':
      return GO_MONOLITH_NEXT_FLUTTER;
    case 'go-microservices':
      return GO_MICROSERVICES_NEXT_FLUTTER;
    case 'go-microservices-ai':
      return GO_MICROSERVICES_NEXT_AI;
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
