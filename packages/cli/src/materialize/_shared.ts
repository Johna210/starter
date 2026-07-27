// Shared helpers for the per-workspace materializer modules.
//
// Per issue #27: src/materialize.ts is split by workspace; the
// per-workspace modules in ./<workspace>.ts share these primitives.
// Kept tiny on purpose — anything more (template helpers, conditional
// file skipping, etc.) belongs in its own module.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Absolute path to the (empty) target directory the scaffold is written into. */
export interface ProjectContext {
  /** Absolute path to the (empty) target directory the scaffold is written into. */
  targetDir: string;
  /** npm package name for the scaffolded project. */
  name: string;
}

/** Write `content` to `path`, creating any missing parent directories. */
export async function writeFileRecursive(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}
