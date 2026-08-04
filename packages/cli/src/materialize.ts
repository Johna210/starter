// Materializer: writes the scaffolded project for a given composition.
//
// The TS-monolith + Vite+TanStack + no-mobile composition is
// materializable with AI on or off (issue #17: AI on adds packages/ai).
// Unimplemented compositions throw an UnimplementedCompositionError;
// the CLI's own tests assert both paths.
//
// Per issue #27, the per-workspace templates + writes live in
// ./materialize/<workspace>.ts; this file is a flat orchestrator that
// delegates to each module's `write<Workspace>(ctx)`. The public API
// (`materialize`, `UnimplementedCompositionError`, `ProjectContext`)
// is re-exported here unchanged so external imports keep working.

import { type Composition, describeComposition, isGoMicroservicesNext, isGoMicroservicesNextAi, isGoMonolithNext, isImplemented, isTsMicroservicesVite } from './composition.js';
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
import { writeApiAuthService } from './materialize/api-auth-service.js';
import { writeDocs } from './materialize/docs.js';
import { writeE2e } from './materialize/e2e.js';
import { writeGoApi } from './materialize/go-api.js';
import { writeGoApiAuthService } from './materialize/go-api-auth.js';
import { writeGoApiMs } from './materialize/go-api-ms.js';
import { writeGoApiMsAi } from './materialize/go-api-ms-ai.js';
import { writeGoAiService } from './materialize/go-ai-service.js';
import { writeGoContract } from './materialize/go-contract.js';
import { writeGoContractMs } from './materialize/go-contract-ms.js';
import { writeGoContractMsAi } from './materialize/go-contract-ms-ai.js';
import { writeAi } from './materialize/ai.js';
import { writeNextWeb } from './materialize/web-next.js';

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
  if (isGoMicroservicesNextAi(composition)) {
    await writeGoMicroservicesNextAi(ctx, composition);
  } else if (isGoMicroservicesNext(composition)) {
    await writeGoMicroservicesNext(ctx, composition);
  } else if (isGoMonolithNext(composition)) {
    await writeGoMonolithBase(ctx, composition);
  } else if (isTsMicroservicesVite(composition)) {
    await writeTsMicroservicesVite(ctx, composition);
  } else {
    await writeTsMonolithVite(ctx, composition);
  }
}

async function writeGoMicroservicesNextAi(ctx: ProjectContext, composition: Composition): Promise<void> {
  // Shape 4 + AI on (issue #16): everything shape 4 ships, plus the
  // Python/FastAPI AI service (decision 5) exposed over its own
  // contract surface (openapi.ai.yaml + the generated Go client in
  // packages/contract) and consumed by apps/api through that client.
  await writeRoot(ctx, composition);
  await writeGoApiMs(ctx);
  await writeGoApiMsAi(ctx);
  await writeGoApiAuthService(ctx);
  await writeGoContractMs(ctx);
  await writeGoContractMsAi(ctx);
  await writeGoAiService(ctx);
  await writeNextWeb(ctx, composition);
  await writeE2e(ctx, composition);
}

async function writeGoMicroservicesNext(ctx: ProjectContext, composition: Composition): Promise<void> {
  await writeRoot(ctx, composition);
  await writeGoApiMs(ctx);
  await writeGoApiAuthService(ctx);
  await writeGoContractMs(ctx);
  await writeNextWeb(ctx, composition);
  await writeE2e(ctx, composition);
}

async function writeGoMonolithBase(ctx: ProjectContext, composition: Composition): Promise<void> {
  await writeRoot(ctx, composition);
  await writeGoApi(ctx);
  await writeGoContract(ctx);
  await writeNextWeb(ctx, composition);
  await writeE2e(ctx, composition);
}

async function writeTsMonolithVite(ctx: ProjectContext, composition: Composition): Promise<void> {
  const isAiOn = composition.ai === 'on';
  await writeRoot(ctx, composition);
  await writeWeb(ctx);
  await writeApi(ctx);
  await writeApiAuth(ctx);

  await writeShared(ctx);
  await writeDb(ctx, { aiOn: isAiOn });

  await writeApiClient(ctx);
  await writeAuth(ctx);
  if (isAiOn) {
    // Shape 1 + AI on (issue #17): packages/ai — the composable AI
    // primitives (decision 20) as an embedded TS library (decision 5).
    // Absent entirely when AI is off (decision 21: zero AI dependency
    // surface for non-AI projects).
    await writeAi(ctx);
  }
  await writeDocs(ctx, composition);
  await writeE2e(ctx, composition);
}

async function writeTsMicroservicesVite(ctx: ProjectContext, composition: Composition): Promise<void> {
  await writeRoot(ctx, composition);
  await writeWeb(ctx, composition);
  await writeApi(ctx, composition);
  await writeApiAuthService(ctx);

  await writeShared(ctx);
  await writeDb(ctx);

  await writeApiClient(ctx, composition);
  await writeAuth(ctx);
  await writeDocs(ctx, composition);
  await writeE2e(ctx, composition);
}
