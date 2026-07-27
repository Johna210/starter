// Materializer: packages/shared templates.
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 3 files written into packages/shared (package.json, tsconfig,
// src/index.ts). The orchestrator (materialize.ts) calls writeShared(ctx);
// template functions are private to this module.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeShared(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeFileRecursive(join(targetDir, 'packages/shared/package.json'), sharedPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/shared/tsconfig.json'), sharedTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/shared/src/index.ts'), sharedIndexTs());
}

function sharedPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/shared',
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        build: 'tsc -p tsconfig.build.json',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        zod: '^3.23.0',
      },
      devDependencies: {
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function sharedTsconfigJson(): string {
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
        declaration: true,
      },
      include: ['src/**/*'],
    },
    null,
    2,
  ) + '\n';
}

function sharedIndexTs(): string {
  return `// @starter/shared — zod schemas + pure utils shared by apps.
// This package is empty for now; later tickets add the first zod
// schemas (likely the \`items\` demo, decision 13).

export {};
`;
}
