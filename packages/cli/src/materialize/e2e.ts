// Materializer: end-to-end test (Playwright) for the items flow.
//
// Per issue #9 the starter owns exactly one E2E (decision 22) — the
// `items` flow that exercises the full web→api→db composition. The
// E2E lives at the project root (not inside a single workspace)
// because it spans the whole stack: it boots the web + api via
// `task dev`, drives the items flow through a real browser, and
// asserts that a created item persists across reload.
//
// This module owns the three files: `e2e/items-flow.spec.ts`
// (the test), `playwright.config.ts` (the config with webServer =
// `task dev`), and the docs page `docs/test-strategy.md` (the
// one-E2E-only discipline, decision 22). The orchestrator
// (materialize.ts) calls `writeE2e(ctx)`; template functions are
// private to this module.
//
// Per-feature E2Es are the user's job — see the doc page this module
// writes, which states the discipline explicitly.

import { join } from 'node:path';
import { type Composition } from '../composition.js';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeE2e(ctx: ProjectContext, composition: Composition): Promise<void> {
  const { targetDir } = ctx;
  const isGo = composition.backend === 'go';
  const isMicroservices = composition.topology === 'microservices';

  await writeFileRecursive(join(targetDir, 'e2e/items-flow.spec.ts'), e2eItemsFlowSpec(isGo, isMicroservices));
  await writeFileRecursive(join(targetDir, 'playwright.config.ts'), e2ePlaywrightConfig(isGo, isMicroservices));
  await writeFileRecursive(join(targetDir, 'docs/test-strategy.md'), e2eTestStrategyMd(isGo, isMicroservices));
}

function e2eItemsFlowSpec(isGo: boolean, isMicroservices: boolean): string {
  const authFlowNote = isGo
    ? `Log in via the UI (the Next SSR variant's access-token-in-cookie +
//      refresh-in-httpOnly-cookie flow, decision 16).`
    : `Log in via the UI (the SPA's access-token-in-memory + refresh-
//      in-httpOnly-cookie flow, decision 16).`;
  const createNote = isGo
    ? `Create a new item via the form (the client component's typed
//      api-client call, decision 15/19).`
    : `Create a new item via the form (TanStack Query mutation
//      against the typed api-client, decision 15/18).`;
  const appearNote = isGo
    ? `Assert the new item appears in the list (router.refresh() re-ran the
//      server component, which refetched through the api-client).`
    : `Assert the new item appears in the list (TanStack Query
//      invalidation refreshed it).`;
  const proxyNote = isGo
    ? isMicroservices
      ? `// \`baseURL\` is set in playwright.config.ts to the web's URL. The web
// rewrites \`/api/auth/*\` to api-auth at http://localhost:3001 and
// \`/api/*\` to api at http://localhost:3000 (see
// apps/web/next.config.ts), so the E2E uses the same origin for the
// UI and the api calls — same-origin means the httpOnly refresh
// cookie is first-party end-to-end, and the auth flow runs through
// the sole-minter service (decision 11).`
      : `// \`baseURL\` is set in playwright.config.ts to the web's URL. The web
// rewrites \`/api/...\` to the api at http://localhost:3000 (see
// apps/web/next.config.ts), so the E2E uses the same origin for both
// the UI and the api calls — same-origin means the httpOnly refresh
// cookie is first-party end-to-end.`
    : `// \`baseURL\` is set in playwright.config.ts to the web's URL. The web
// proxies \`/api/...\` to the api at http://localhost:3000 (see
// apps/web/vite.config.ts), so the E2E uses the same origin for both
// the UI and the api calls — same-origin means the httpOnly refresh
// cookie is first-party end-to-end.`;
  const envNote = isGo
    ? isMicroservices
      ? `provides a Postgres service; local devs set DATABASE_URL in
// apps/api/.env + apps/api-auth/.env per the README's Quickstart.`
      : `provides a Postgres service; local devs set DATABASE_URL in
// apps/api/.env per the README's Quickstart.`
    : `provides a Postgres service; local devs set DATABASE_URL in
// apps/api/.env + packages/db/.env per the README's Quickstart.`;

  return `// e2e/items-flow.spec.ts — the starter's one and only E2E (decision 22).
//
// Exercises the full spine the \`items\` demo exists to prove (decision
// 13): a real browser drives a real web app talking to a real api
// talking to a real Postgres. The flow is
//
//   1. Register a user (via the api, so the test owns its data).
//   2. ${authFlowNote}
//   3. Land on /items and assert the test item isn't in the list yet
//      (the "known state" branch of the spec — we don't need a clean
//      DB because every test run uses a unique item name).
//   4. ${createNote}
//   5. ${appearNote}
//   6. Reload the page (real HTTP GET, refetch from the api).
//   7. Assert the item is still there (proves web→api→db persistence).
//
// Requires DATABASE_URL to be set — the api won't boot without it,
// and \`task migrate\` must have been run. The CI matrix (issue 11)
// ${envNote}
//
// Per-feature E2Es are NOT this test's job. See ../docs/test-strategy.md
// for the one-E2E-only discipline (decision 22).

import { test, expect, type Page } from '@playwright/test';

// Skip cleanly when DATABASE_URL is not set (mirrors the per-workspace
// \`describeDb = TEST_URL ? describe : describe.skip\` pattern in
// packages/auth + apps/api/internal/*). The E2E needs a real Postgres
// (the api won't boot without it); environments without a DB can
// still run the rest of the suite (\`task test\`) without this E2E
// failing the build. The CI matrix (issue 11) provides a Postgres
// service for the real run.
test.skip(
  !process.env.DATABASE_URL,
  'DATABASE_URL is not set; the E2E needs a running Postgres. Run \`task migrate\` against a real DB and retry.',
);

${proxyNote}
const API = '/api';

async function registerUser(
  page: Page,
  user: { email: string; password: string },
): Promise<void> {
  const res = await page.request.post(\`\${API}/auth/register\`, {
    data: user,
  });
  // 201 = created; 409 = already registered (a previous run). Both
  // are fine for this test — we only need the user to exist before
  // we POST /auth/login.
  if (res.status() !== 201 && res.status() !== 409) {
    throw new Error(\`register failed: \${res.status()} \${await res.text()}\`);
  }
}

test('items flow: register → login → list → create → see → refresh → still there', async ({
  page,
}) => {
  // Unique per run — the test asserts the *specific* item it created
  // is in the list, not that the list is empty. Robust to other items
  // being in the DB.
  const stamp = Date.now();
  const email = \`e2e-\${stamp}@example.com\`;
  const password = 'password1234';
  const itemName = \`E2E item \${stamp}\`;

  // 1. Register the test user (idempotent on re-runs).
  await registerUser(page, { email, password });

  // 2. Navigate to the login page.
  await page.goto('/login');

  // 3. Log in via the UI.
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // 4. We should land on /items (the SPA's post-login destination).
  await expect(page).toHaveURL(/\\/items$/);

  // 5. The test item is not in the list yet (known-state branch).
  await expect(page.locator('li').filter({ hasText: itemName })).toHaveCount(0);

  // 6. Create a new item via the form (the items page's <form>).
  await page.locator('input[aria-label="Item name"]').fill(itemName);
  await page.locator('button[type="submit"]').click();

  // 7. The new item appears in the list (TanStack Query invalidation
  //    refreshed the \`['items']\` query after the mutation).
  await expect(page.locator('li').filter({ hasText: itemName })).toBeVisible();

  // 8. Reload the page — a real HTTP GET refetches from the api.
  await page.reload();

  // 9. The item is still there. This is the persistence assertion
  //    (decision 13's "web→api→db composes" promise, made automated).
  await expect(page.locator('li').filter({ hasText: itemName })).toBeVisible();
});
`;
}

function e2ePlaywrightConfig(isGo: boolean, isMicroservices: boolean): string {
  const bootNote = isGo
    ? isMicroservices
      ? `\`webServer\` boots the full stack via \`task dev\` (Go api-auth +
// Go api + Next web in parallel) and waits for the web's URL. First
// run takes a while (pnpm install + task migrate + services boot); CI
// caches pnpm so subsequent runs are fast. The services need
// DATABASE_URL — see apps/api/.env.example + apps/api-auth/.env.example
// and the README's Quickstart.`
      : `\`webServer\` boots the full stack via \`task dev\` (Go api + Next web
// in parallel) and waits for the web's URL. First run takes a while
// (pnpm install + task migrate + api boot); CI caches pnpm so
// subsequent runs are fast. The api needs DATABASE_URL — see
// apps/api/.env.example and the README's Quickstart.`
    : `\`webServer\` boots the full stack via \`task dev\` (web + api in
// parallel) and waits for the web's URL. First run takes a while
// (pnpm install + drizzle migrate + api boot); CI caches pnpm so
// subsequent runs are fast. The api needs DATABASE_URL — see
// apps/api/.env.example and the README's Quickstart.`;
  const migrateNote = isGo
    ? `// idempotent (already-applied migrations are skipped).`
    : `// idempotent (drizzle-kit skips already-applied migrations).`;
  const bootTimeNote = isGo
    ? `// 3 min: cold pnpm install + migrate + api + web boot.`
    : `// 3 min: cold pnpm install + drizzle migrate + api boot.`;
  return `import { defineConfig } from '@playwright/test';

// playwright.config.ts — the one E2E (decision 22).
//
// ${bootNote}
//
// Single worker, sequential: there's only one test today, and the
// items page is auth-scoped per test, so a second worker would race
// the first on the shared api + DB. Per-feature E2Es (user's job,
// not the starter's) can bump this.
//
// Per-feature E2Es are NOT this config's job — see
// ../docs/test-strategy.md for the one-E2E-only discipline.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  // The one E2E is integration-heavy (real browser + api + Postgres,
  // often under 4 parallel CI jobs on one runner). A single retry on
  // CI rides out the occasional cold-boot timeout instead of failing
  // the whole PR; the 'trace: on-first-retry' option below captures
  // the retry.
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  // Boot the stack only when a DB is available: the spec skips cleanly
  // when DATABASE_URL is unset (see e2e/items-flow.spec.ts), and
  // without a DB there is nothing to boot — so \`task test\` stays
  // runnable on a fresh scaffold (decision 22's pyramid without a
  // Postgres). CI provides a Postgres service and sets DATABASE_URL.
  ...(process.env.DATABASE_URL
    ? {
        webServer: {
          // Migrate first so the api's first request doesn't 500 on a
          // missing table; then boot the full stack. \`task migrate\` is
          ${migrateNote}
          command: 'task migrate && task dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          ${bootTimeNote}
          timeout: 180_000,
        },
      }
    : {}),
  // The items flow does a register + login + query + mutation + reload
  // and waits for the network on each step; generous default below.
  timeout: 60_000,
});
`;
}

function e2eTestStrategyMd(isGo: boolean, isMicroservices: boolean): string {
  const unitLevel = isGo
    ? isMicroservices
      ? `### Unit tests

The modules. Each service's \`*_test.go\` exercises its own code in
isolation. The auth shim's \`apps/api-auth/internal/auth/*_test.go\`
files run **real** \`argon2\` + RSA/JWT signing (no mocks — decision
22: real libraries, not mocks). The main api's
\`apps/api/internal/jwks/jwks_test.go\` proves the local-verify
mechanism (fetch → cache on TTL → verify) against a stub JWKS server.
The items repo's \`apps/api/internal/items/items.repo_test.go\` runs
against a real Postgres and skips cleanly when \`DATABASE_URL\` is
not set (so the suite is green in environments without a DB). The web
app's \`apps/web/src/lib/server.test.ts\` proves the server-side
api-client's auth properties (token forwarding + refresh-on-401,
decision 16).

\`\`\`
apps/api/internal/items/items.repo_test.go       # unit: real DB
apps/api/internal/jwks/jwks_test.go              # unit: JWKS fetch/cache/verify
apps/api-auth/internal/auth/{passwords,tokens,refresh}_test.go  # unit: real crypto
apps/api-auth/internal/auth/auth.repo_test.go    # unit: real DB
apps/web/src/lib/server.test.ts                  # unit: the api-client's auth properties
\`\`\``
      : `### Unit tests

The modules. Each module's \`*_test.go\` exercises its own code in
isolation. The auth shim's \`internal/auth/*_test.go\` files run
**real** \`argon2\` + JWT signing (no mocks — decision 22: real
libraries, not mocks). The items repo's \`internal/items/items.repo_test.go\`
runs against a real Postgres and skips cleanly when \`DATABASE_URL\` is
not set (so the suite is green in environments without a DB). The web
app's \`apps/web/src/lib/server.test.ts\` proves the server-side
api-client's auth properties (token forwarding + refresh-on-401,
decision 16).

\`\`\`
apps/api/internal/items/items.repo_test.go       # unit: real DB
apps/api/internal/auth/{passwords,tokens,refresh}_test.go  # unit: real crypto
apps/web/src/lib/server.test.ts                  # unit: the api-client's auth properties
\`\`\``
    : `### Unit tests

The modules. Each workspace's \`src/<area>.test.ts\` exercises its own
code in isolation. The auth shim's \`packages/auth/src/<name>.test.ts\`
files run
**real** \`argon2\` + \`jose\` (no mocks — decision 22: real libraries,
not mocks). The items repo's \`apps/api/src/internal/items/items.repo.test.ts\`
runs against a real Postgres and skips cleanly when \`DATABASE_URL\` is
not set (so the suite is green in environments without a DB).

\`\`\`
packages/auth/src/<name>.test.ts                  # unit: real crypto
apps/api/src/internal/items/items.repo.test.ts    # unit: real DB
apps/api/src/internal/auth/auth.repo.test.ts      # unit: real DB
\`\`\``;
  const contractLevel = isGo
    ? isMicroservices
      ? `### Contract tests

The spine. In polyglot shapes (this scaffold is one) the contract is
the **committed specs** in \`packages/contract\` (decision 19: Go is
the canonical side — each service's spec is generated from ITS Go
structs). Shape 4 has two Go services, so the tripwires are:

- \`apps/api/contract_test.go\` — proves the committed
  \`openapi.api.yaml\` equals the main api's live spec (regenerate
  from Go, commit — never hand-edit).
- \`apps/api-auth/contract_test.go\` — proves the committed
  \`openapi.auth.yaml\` equals the auth service's live spec.
- \`packages/contract/test/generated.test.ts\` — proves the merged
  \`openapi.yaml\` equals the merge of the two partials, and that the
  committed TS client is byte-identical to what the generator produces
  from the merged spec (regenerate via \`task contract:generate\`, commit).`
      : `### Contract tests

The spine. In polyglot shapes (this scaffold is one) the contract is
the **committed \`openapi.yaml\`** in \`packages/contract\` (decision 19:
Go is the canonical side — the spec is generated from the Go structs).
Two tripwires keep it honest:

- \`apps/api/contract_test.go\` — proves the committed spec equals the
  live spec (regenerate from Go, commit — never hand-edit).
- \`packages/contract/test/generated.test.ts\` — proves the committed TS
  client is byte-identical to what the generator produces from the
  committed spec (regenerate via \`task contract:generate\`, commit).`
    : `### Contract tests

The spine. In TS shapes (this scaffold is one) the **Hono RPC
type-inference is checked at compile time** — \`@starter/api-client\`
imports \`AppType\` from \`@starter/api\`, so a type error *is* a
contract test (decisions 3, 9, 17/18). Add a runtime contract test
in \`apps/api\` if a route's response shape ever drifts from the
inferred type.`;
  const runNote = isGo
    ? `# Just the per-workspace subsets.
task go:test
task test:contract
task test:web`
    : `# Just the per-workspace subsets.
task test:web
task test:api
task test:auth
task test:shared
task test:db`;
  return `# Test strategy

The scaffolded project follows a **three-level test pyramid** (decision 22):
**unit** (modules), **contract** (the spine), and **exactly one E2E**
(the items flow). This page is the rulebook; the per-level details live
in the workspaces that own the tests.

## The three levels

${unitLevel}

${contractLevel}

### E2E test — exactly one

The composition. **The starter owns exactly one E2E: the items flow**
(\`e2e/items-flow.spec.ts\`). It boots the full stack via
\`task dev\`, drives the web→api→db path through a real browser, and
asserts an item created via the UI persists across a page reload.

The one-E2E ownership is **the starter's, not yours**: it proves the
\`items\` demo's spine-composition claim (decision 13), the way
\`apps/api-auth\` proves the example split's seam. Per-feature E2Es
are **your** job — you add them, you maintain them, the starter
doesn't impose a structure for them.

## The one-E2E-only discipline (decision 22)

The starter ships **exactly one** E2E. Reasoning, lifted from CONTEXT:

> *The one E2E proves the composition the \`items\` demo exists to
> demonstrate (decision 13's promise made automated, not manual). One-
> E2E-only discipline (mirrors decision 10's "one example split"): the
> starter owns exactly one E2E, the items flow, and documents "add your
> own per feature" — a line against E2E creep.*

What this means in practice:

- **Don't add a second E2E to \`e2e/\`** for a feature the starter ships.
  The starter's one E2E is the items flow; that's it.
- **Do add per-feature E2Es** under your own \`e2e/<feature>/\` or in a
  per-workspace test dir, and **wire them into \`task test\` alongside
  the starter's one** — or into a separate \`task test:e2e:feature\`
  if you want the starter's E2E to stay runnable on its own.
- **Don't try to make this one E2E cover every flow**. It's a
  composition check, not a feature suite. \`/auth/login\` already has
  unit + contract coverage; the items E2E just walks through the
  login on the way to proving the items flow.

## Running the tests

\`\`\`sh
# Unit + contract (fast; items-repo tests skip if DATABASE_URL is unset).
task test

# Just the one E2E (requires DATABASE_URL + \`task migrate\` first).
task test:e2e

${runNote}
\`\`\`

## What each level catches

| Level   | Catches                                                   | Doesn't catch |
|---------|-----------------------------------------------------------|---------------|
| Unit    | Logic bugs in a single module (auth crypto, repo SQL)     | Cross-module wiring, real HTTP, real DB, real cookies |
| Contract| Spine type drift, route schema changes                    | Real auth flow, browser-level UX, persistence |
| E2E     | **Composition**: web→api→db composes end-to-end           | Per-module regressions (too coarse) |

The E2E is the only level that proves the *whole story works
together*. That's why there's exactly one.
`;
}
