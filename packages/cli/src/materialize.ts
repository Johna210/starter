// Materializer: writes the scaffolded project for a given composition.
//
// Per issue #3, only the TS-monolith + Vite+TanStack + no-mobile + no-AI
// composition is materializable. All other compositions throw an
// UnimplementedCompositionError; the CLI's own tests assert both paths.
//
// Per issue #27, the per-workspace templates + writes live in
// ./materialize/<workspace>.ts; this file is a flat orchestrator that
// delegates to each module's `write<Workspace>(ctx)`. The public API
// (`materialize`, `UnimplementedCompositionError`, `ProjectContext`)
// is re-exported here unchanged so external imports keep working.

import { type Composition, describeComposition, isImplemented } from './composition.js';
// Re-exported to preserve the public API: external code imports
// `ProjectContext` from '../src/materialize.js'.
export type { ProjectContext } from './materialize/_shared.js';
import { type ProjectContext } from './materialize/_shared.js';
import { writeRoot } from './materialize/root.js';
import { writeShared } from './materialize/shared.js';
import { writeWeb } from './materialize/web.js';
import { writeApiClient } from './materialize/api-client.js';
import { writeDb } from './materialize/db.js';
import { writeAuth } from './materialize/auth.js';
import { writeApi } from './materialize/api.js';
import { writeApiAuth } from './materialize/api-auth.js';
import { writeDocs } from './materialize/docs.js';
import { writeE2e } from './materialize/e2e.js';

export class UnimplementedCompositionError extends Error {
  public readonly composition: Composition;
  constructor(composition: Composition) {
    super(`Composition not yet implemented: ${describeComposition(composition)}.\n` +
      `The CLI materializer ships one composition in this ticket; the other 23+ are ` +
      `scheduled for later issues. Please choose another combination.`);
    this.name = 'UnimplementedCompositionError';
    this.composition = composition;
  }
}

/** Public API. Throws UnimplementedCompositionError if composition is not yet wired. */
export async function materialize(ctx: ProjectContext, composition: Composition): Promise<void> {
  if (!isImplemented(composition)) {
    throw new UnimplementedCompositionError(composition);
  }
  await writeTsMonolithVite(ctx, composition);
}

async function writeTsMonolithVite(ctx: ProjectContext, composition: Composition): Promise<void> {
  await writeRoot(ctx, composition);
  await writeWeb(ctx);
  await writeApi(ctx);
  await writeApiAuth(ctx);

  await writeShared(ctx);
  await writeDb(ctx);

  await writeApiClient(ctx);
  await writeAuth(ctx);
  await writeDocs(ctx, composition);
  await writeE2e(ctx);
}
