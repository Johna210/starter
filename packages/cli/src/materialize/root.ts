import { join } from 'node:path';
import { type Composition } from '../composition.js';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeRoot(ctx: ProjectContext, composition: Composition): Promise<void> {
  const { targetDir, name } = ctx;

  await writeFileRecursive(join(targetDir, 'package.json'), rootPackageJson(name));
  await writeFileRecursive(join(targetDir, 'pnpm-workspace.yaml'), rootPnpmWorkspaceYaml());
  await writeFileRecursive(join(targetDir, 'Taskfile.yml'), rootTaskfileYml(composition));
  await writeFileRecursive(join(targetDir, '.gitignore'), rootGitignore());
  await writeFileRecursive(join(targetDir, 'README.md'), rootReadme(name, composition));
}

function rootPackageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      type: 'module',
      description: 'Scaffolded from create-fs-starter (TS-monolith + Vite+TanStack).',
      engines: { node: '>=20.0.0' },
      packageManager: 'pnpm@10.17.1',
      scripts: {
        dev: 'task dev',
        test: 'task test',
        'test:e2e': 'playwright test',
        build: 'task build',
      },
      devDependencies: {
        // The one E2E (decision 22): lives at the project root
        // (e2e/items-flow.spec.ts), driven by Playwright. Per-feature
        // E2Es are the user's job — see docs/test-strategy.md.
        '@playwright/test': '^1.48.0',
      },
    },
    null,
    2,
  ) + '\n';
}

function rootPnpmWorkspaceYaml(): string {
  return `packages:
  - "apps/*"
  - "packages/*"
`;
}

function rootTaskfileYml(composition: Composition): string {
  const isMicroservices = composition.topology === 'microservices';

  if (isMicroservices) {
    return `# Taskfile.yml — scaffolded orchestrator (shape 2: TS-microservices).
#
# Boot the stack with \`task dev\`. Each subtask delegates to a
# workspace's \`pnpm\` script. Per-workspace detail lives in that
# workspace's own package.json.
#
# Shape 2 boots THREE processes in parallel: web, api (main), and
# api-auth (sole minter). The vite proxy in apps/web routes /api/auth/*
# to api-auth and /api/* to api.

version: "3"

tasks:
  default:
    desc: List available tasks
    cmds:
      - task --list
    silent: true

  dev:
    desc: Boot the full stack (web + api + api-auth) in parallel
    cmds:
      - 'task dev:web & task dev:api & task dev:api-auth & wait'

  dev:web:
    dir: apps/web
    cmds:
      - pnpm dev

  dev:api:
    dir: apps/api
    cmds:
      - pnpm dev

  dev:api-auth:
    desc: Boot the auth service (sole minter, decision 11)
    dir: apps/api-auth
    cmds:
      - pnpm dev

  test:
    desc: Run all tests (unit + contract + the one E2E)
    cmds:
      - task: test:web
      - task: test:api
      - task: test:api-auth
      - task: test:auth
      - task: test:shared
      - task: test:db
      - task: test:e2e

  test:web:
    dir: apps/web
    cmds:
      - pnpm test

  test:api:
    dir: apps/api
    cmds:
      - pnpm test

  test:api-auth:
    desc: Run auth service tests (users + refresh tokens repos)
    dir: apps/api-auth
    cmds:
      - pnpm test

  test:auth:
    desc: Run auth shim unit tests (real argon2 + jose, no mocks)
    dir: packages/auth
    cmds:
      - pnpm test

  test:shared:
    dir: packages/shared
    cmds:
      - pnpm test

  test:db:
    desc: Run db tests (skips items repo test if DATABASE_URL is unset)
    dir: packages/db
    cmds:
      - pnpm test

  test:e2e:
    desc: Run the one E2E (items flow). Requires DATABASE_URL + task migrate.
    cmds:
      - pnpm test:e2e

  migrate:
    desc: Apply pending DB migrations (DATABASE_URL must be set)
    dir: packages/db
    cmds:
      - pnpm migrate

  db:generate:
    desc: Generate a new migration from the Drizzle schema
    dir: packages/db
    cmds:
      - pnpm generate

  build:
    desc: Build all workspaces
    cmds:
      - task: build:web
      - task: build:api
      - task: build:api-auth
      - task: build:shared

  build:web:
    dir: apps/web
    cmds:
      - pnpm build

  build:api:
    dir: apps/api
    cmds:
      - pnpm build

  build:api-auth:
    dir: apps/api-auth
    cmds:
      - pnpm build

  build:shared:
    dir: packages/shared
    cmds:
      - pnpm build
`;
  }

  return `# Taskfile.yml — scaffolded orchestrator.
#
# Boot the stack with \`task dev\`. Each subtask delegates to a
# workspace's \`pnpm\` script. Per-workspace detail lives in that
# workspace's own package.json.

version: "3"

tasks:
  default:
    desc: List available tasks
    cmds:
      - task --list
    silent: true

  dev:
    desc: Boot the full stack (web + api) in parallel
    cmds:
      - 'task dev:web & task dev:api & wait'

  dev:web:
    dir: apps/web
    cmds:
      - pnpm dev

  dev:api:
    dir: apps/api
    cmds:
      - pnpm dev

  test:
    desc: Run all tests (unit + contract + the one E2E)
    cmds:
      - task: test:web
      - task: test:api
      - task: test:auth
      - task: test:shared
      - task: test:db
      - task: test:e2e

  test:web:
    dir: apps/web
    cmds:
      - pnpm test

  test:api:
    dir: apps/api
    cmds:
      - pnpm test

  test:auth:
    desc: Run auth shim unit tests (real argon2 + jose, no mocks)
    dir: packages/auth
    cmds:
      - pnpm test

  test:shared:
    dir: packages/shared
    cmds:
      - pnpm test

  test:db:
    desc: Run db tests (skips items repo test if DATABASE_URL is unset)
    dir: packages/db
    cmds:
      - pnpm test

  test:e2e:
    desc: Run the one E2E (items flow). Requires DATABASE_URL + task migrate.
    cmds:
      - pnpm test:e2e

  migrate:
    desc: Apply pending DB migrations (DATABASE_URL must be set)
    dir: packages/db
    cmds:
      - pnpm migrate

  db:generate:
    desc: Generate a new migration from the Drizzle schema
    dir: packages/db
    cmds:
      - pnpm generate

  build:
    desc: Build all workspaces
    cmds:
      - task: build:web
      - task: build:api
      - task: build:shared

  build:web:
    dir: apps/web
    cmds:
      - pnpm build

  build:api:
    dir: apps/api
    cmds:
      - pnpm build

  build:shared:
    dir: packages/shared
    cmds:
      - pnpm build
`;
}

function rootGitignore(): string {
  return `node_modules/
dist/
build/
coverage/
.env
.env.local
*.tsbuildinfo
.DS_Store
`;
}

function rootReadme(name: string, composition: Composition): string {
  const isTs = composition.backend === 'ts';
  const isMicroservices = composition.topology === 'microservices';
  const contractLabel = isTs ? 'Hono RPC' : 'OpenAPI';
  const webLabel = isTs ? 'Vite + TanStack' : 'Next.js';
  const apiLabel = isTs ? 'Hono' : 'Gin + Huma';

  if (isMicroservices) {
    return `# ${name}

A fullstack TypeScript monorepo scaffolded from
[create-fs-starter](https://github.com/Johna210/starter) — **shape 2:
TS-microservices** (apps/api + apps/api-auth as sibling deployables,
packages/auth as the shared seam).

## Quickstart — the items demo (decision 13)

The scaffold ships a single trivial domain, \`items\`, to prove the whole
stack composes end-to-end on day one. \`/items\` is **protected** —
a valid Bearer access token is required on every request:

\`\`\`sh
# 1. Install Taskfile (go-task) if you don't have it:
#   go install github.com/go-task/task/v3/cmd/task@latest
#   or see https://taskfile.dev/installation/

# 2. Bring up Postgres any way you like (docker, native, etc.) and set
#    DATABASE_URL in apps/api/.env, apps/api-auth/.env, and packages/db/.env.
# 3. Set JWT_SECRET in BOTH apps/api/.env and apps/api-auth/.env
#    (they share the same secret — HS256 is symmetric). Generate one with:
#      openssl rand -base64 48

# 4. Install deps, apply migrations, and boot the stack.
pnpm install
task migrate
task dev
\`\`\`

\`task dev\` boots three processes in parallel: \`apps/web\` (port 5173),
\`apps/api\` (port 3000, main API with /items), and \`apps/api-auth\`
(port 3001, sole minter with /auth/*). Vite's dev proxy routes
\`/api/auth/*\` to api-auth and \`/api/*\` to api — the browser sees one
/api endpoint, the httpOnly refresh cookie is first-party.

Open http://localhost:5173, click **Sign in**, register an account,
and you land on the items page.

- \`GET /items\` returns the list (${apiLabel} route → \`requireAuth\` → \`ItemsRepo.list()\` → Drizzle → Postgres).
- \`POST /items\` with \`{ "name": "..." }\` creates a row and returns it.

It's a 5-minute delete when you start your real domain, not a refactor.

To run the one E2E:

\`\`\`sh
# DATABASE_URL must be set in the shell (the scaffolded project's
# .env is loaded by the api and the web, but the Playwright test
# process reads process.env directly). Skips cleanly if unset.
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
pnpm test:e2e
\`\`\`

## What you just saw

You just saw the **${contractLabel} contract spine** (decisions 3, 9, 17, 18) in
action: \`apps/web\` reaches \`apps/api\` and \`apps/api-auth\` through
\`@starter/api-client\`, which exports two typed clients — one per
service — built from each router's TS type via \`hc<typeof app>()\`.
No codegen, no OpenAPI artifact — the contract is the router itself.

**The example split** (decisions 10, 27): \`apps/api-auth\` is a
separate deployable that wraps the shared \`@starter/auth\` package.
It's the **sole minter** of JWTs in this shape (decision 11): only
this service calls \`signToken\` / \`issueTokenPair\`. \`apps/api\`
verifies tokens locally via the same \`@starter/auth\` import — no
network hop for verification. The split is along a **capability axis**
(auth/IAM), not a business domain — capability splits are real and
domain-neutral (decision 10).

**Your contract spine**: each service's router TS type is the
contract. The web client is generated from it by \`hc<typeof app>()\`
— no artifact, no codegen, no separate source of truth.

\`\`\`mermaid
graph LR
    subgraph "apps/web (${webLabel})"
        W["web pages"]
        AC["@starter/api-client<br/>createApiClient + createApiAuthClient"]
    end
    subgraph "apps/api (${apiLabel} on Node :3000)"
        R1["${apiLabel} app<br/>.route('/items')"]
        M1["internal/items"]
    end
    subgraph "apps/api-auth (${apiLabel} on Node :3001)"
        R2["${apiLabel} app<br/>.route('/auth')"]
        M2["internal/auth<br/>(sole minter)"]
    end
    subgraph "packages/"
        DB["@starter/db"]
        AUTH["@starter/auth<br/>(shared seam)"]
    end
    W -->|typed call| AC
    AC -->|/api/*| R1
    AC -->|/api/auth/*| R2
    R1 -->|mounts| M1
    R2 -->|mounts| M2
    M1 -->|uses| DB
    M1 -->|verifyToken| AUTH
    M2 -->|sign + verify| AUTH
    M2 -->|uses| DB
\`\`\`

For the full architecture, see [\`docs/architecture/\`](docs/architecture/).

## Where to extend

The scaffold ships honest seams — each is a documented extension point:

- **Add a db table**: edit \`packages/db/src/schema/\`, then
  \`task db:generate\` to emit a migration, then \`task migrate\`.
- **Add an api domain** in \`apps/api\`: \`apps/api/src/internal/<name>/\`
  with \`<name>.repo.ts\` (interface) + \`<name>.routes.ts\` (Hono) +
  \`index.ts\` (mountable module); mount it in \`apps/api/src/index.ts\`.
  Behind \`requireAuth\` if it needs an authenticated principal.
- **Split another capability out of \`apps/api\`** (decision 10): copy
  the example split pattern. Extract \`apps/api/src/internal/<cap>/\`
  into a new sibling service (e.g. \`apps/api-<cap>\`) that wraps
  \`@starter/auth\` (or whatever the capability's shared package is).
  The modular monolith's \`internal/*\` structure is already prepared
  for this.
- **Wire a fence from the auth shim** (email-verify, password reset,
  MFA, OAuth, RBAC): see \`docs/wire-it-in/auth.md\` for the seams.
  The fence lands in \`apps/api-auth\`'s \`internal/auth/\` module.
- **Add a web page**: create a route in \`apps/web/src/pages/\` and
  register it in \`apps/web/src/router.tsx\`; reach the api through
  \`apiClient\` / \`apiAuthClient\` (re-exported from \`apps/web/src/lib/api\`).

Each seam is one line + a link into [\`docs/standards/best-practices.md\`](docs/standards/best-practices.md).

## How to grow

The scaffold is designed for seam-preserving upgrades — copy the pattern,
don't refactor:

- **Add a web variant** (decision 15): create a new \`apps/web-\` with
  the same \`api-client\` — the contract is invariant, only the
  rendering shell changes.
- **Add an AI layer** (decisions 20, 21): AI is opt-in. Scaffold with
  \`ai: on\` to get \`packages/ai\` with composable primitives (chat,
  embeddings, tool calling). See \`docs/wire-it-in/\` when AI is on.
- **Record your decisions** (decision 30): use \`docs/adr/\` to record
  architectural decisions. Each ADR is a short document — see the
  convention in [\`docs/adr/README.md\`](docs/adr/README.md).

## Tasks

| Task | What it does |
|------|--------------|
| \`task dev\` | Boot web + api + api-auth in parallel |
| \`task dev:api-auth\` | Boot just the auth service (sole minter) |
| \`task test\` | Run all tests: unit + contract + the one E2E (decision 22) |
| \`task test:e2e\` | Run just the one E2E (the items flow; needs \`DATABASE_URL\` + \`task migrate\`; skips cleanly if \`DATABASE_URL\` is unset) |
| \`task test:auth\` | Run the auth shim's unit tests (real argon2 + jose, no mocks) |
| \`task migrate\` | Apply pending DB migrations |
| \`task db:generate\` | Generate a new migration from the Drizzle schema |
| \`task build\` | Build all workspaces |

## Tests — the one-E2E-only discipline (decision 22)

The scaffold ships exactly one end-to-end test, \`e2e/items-flow.spec.ts\`,
which drives the web→api→db composition through a real browser (Playwright).
It boots the stack via \`task dev\` (web + api + api-auth), logs in,
creates an item via the form, and asserts the item persists across a
page reload. This is the **only** E2E the starter owns — per-feature
E2Es are your job. The full rulebook is in
[\`docs/test-strategy.md\`](docs/test-strategy.md).
`;
  }

  return `# ${name}

A fullstack TypeScript monorepo scaffolded from
[create-fs-starter](https://github.com/Johna210/starter).

## Quickstart — the items demo (decision 13)

The scaffold ships a single trivial domain, \`items\`, to prove the whole
stack composes end-to-end on day one. \`/items\` is **protected** —
a valid Bearer access token is required on every request:

\`\`\`sh
# 1. Install Taskfile (go-task) if you don't have it:
#   go install github.com/go-task/task/v3/cmd/task@latest
#   or see https://taskfile.dev/installation/

# 2. Bring up Postgres any way you like (docker, native, etc.) and set
#    DATABASE_URL in apps/api/.env and packages/db/.env.
# 3. Set JWT_SECRET in apps/api/.env (openssl rand -base64 48).

# 4. Install deps, apply migrations, and boot the stack.
pnpm install
task migrate
task dev
\`\`\`

The web app boots on http://localhost:5173 and the api on
http://localhost:3000. Vite proxies \`/api\` to the api, so the web
talks to the api over a same-origin path (the httpOnly refresh cookie
is always first-party). Try it: open http://localhost:5173, click
**Sign in**, register an account, and you land on the items page.

- \`GET /items\` returns the list (${apiLabel} route → \`requireAuth\` → \`ItemsRepo.list()\` → Drizzle → Postgres).
- \`POST /items\` with \`{ "name": "..." }\` creates a row and returns it.

It's a 5-minute delete when you start your real domain, not a refactor.

To run the one E2E:

\`\`\`sh
# DATABASE_URL must be set in the shell (the scaffolded project's
# .env is loaded by the api and the web, but the Playwright test
# process reads process.env directly). Skips cleanly if unset.
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
pnpm test:e2e
\`\`\`

## What you just saw

You just saw the **${contractLabel} contract spine** (decisions 3, 9, 17, 18) in
action: \`apps/web\` reaches \`apps/api\` through \`@starter/api-client\`,
a typed client generated from the router's TS type via \`hc<typeof app>()\`.
No codegen, no OpenAPI artifact — the contract is the router itself.

The **modular monolith** (decision 27) under \`apps/api\` holds two
modules (\`internal/auth\`, \`internal/items\`) with typed interfaces and
a router mounting them at prefixes. The **auth shim** (decision 12) gates
\`/items\` behind a Bearer access token, with an httpOnly refresh cookie
for transparent renewal (decision 16).

**Your contract spine**: the router's TS type is the contract. The web
client is generated from it by \`hc<typeof app>()\` — no artifact,
no codegen, no separate source of truth.

\`\`\`mermaid
graph LR
    subgraph "apps/web (${webLabel})"
        W["web pages"]
        AC["@starter/api-client<br/>hc&lt;typeof app&gt;()"]
    end
    subgraph "apps/api (${apiLabel} on Node)"
        R["${apiLabel} app"]
        M["internal/auth<br/>internal/items"]
    end
    subgraph "packages/"
        DB["@starter/db"]
        AUTH["@starter/auth"]
    end
    W -->|typed call| AC
    AC -->|HTTP + Bearer| R
    R -->|mounts| M
    M -->|uses| AUTH
    M -->|uses| DB
\`\`\`

For the full architecture, see [\`docs/architecture/\`](docs/architecture/).

## Where to extend

The scaffold ships honest seams — each is a documented extension point:

- **Add a db table**: edit \`packages/db/src/schema/\`, then
  \`task db:generate\` to emit a migration, then \`task migrate\`.
- **Add an api domain**: \`apps/api/src/internal/<name>/\` with
  \`<name>.repo.ts\` (interface) + \`<name>.routes.ts\` (Hono) +
  \`index.ts\` (mountable module); mount it in \`apps/api/src/index.ts\`.
  Behind \`requireAuth\` if it needs an authenticated principal.
- **Wire a fence from the auth shim** (email-verify, password reset,
  MFA, OAuth, RBAC): see \`docs/wire-it-in/auth.md\` for the seams.
- **Add a web page**: create a route in \`apps/web/src/pages/\` and
  register it in \`apps/web/src/router.tsx\`; reach the api through
  \`apiClient\` (re-exported from \`apps/web/src/lib/api\`).

Each seam is one line + a link into [\`docs/standards/best-practices.md\`](docs/standards/best-practices.md).

## How to grow

The scaffold is designed for seam-preserving upgrades — copy the pattern,
don't refactor:

- **Monolith to microservices** (decisions 10, 27): copy the example
  split pattern — extract \`internal/auth\` into \`apps/api-auth\` as a
  separate deployable. The modular monolith's \`internal/*\` structure is
  already prepared for this.
- **Add a web variant** (decision 15): create a new \`apps/web-\` with
  the same \`api-client\` — the contract is invariant, only the
  rendering shell changes.
- **Add an AI layer** (decisions 20, 21): AI is opt-in. Scaffold with
  \`ai: on\` to get \`packages/ai\` with composable primitives (chat,
  embeddings, tool calling). See \`docs/wire-it-in/\` when AI is on.
- **Record your decisions** (decision 30): use \`docs/adr/\` to record
  architectural decisions. Each ADR is a short document — see the
  convention in [\`docs/adr/README.md\`](docs/adr/README.md).

## Tasks

| Task | What it does |
|------|--------------|
| \`task dev\` | Boot web + api in parallel |
| \`task test\` | Run all tests: unit + contract + the one E2E (decision 22) |
| \`task test:e2e\` | Run just the one E2E (the items flow; needs \`DATABASE_URL\` + \`task migrate\`; skips cleanly if \`DATABASE_URL\` is unset) |
| \`task test:auth\` | Run the auth shim's unit tests (real argon2 + jose, no mocks) |
| \`task migrate\` | Apply pending DB migrations |
| \`task db:generate\` | Generate a new migration from the Drizzle schema |
| \`task build\` | Build all workspaces |

## Tests — the one-E2E-only discipline (decision 22)

The scaffold ships exactly one end-to-end test, \`e2e/items-flow.spec.ts\`,
which drives the web→api→db composition through a real browser (Playwright).
It boots the stack via \`task dev\`, logs in, creates an item via the form,
and asserts the item persists across a page reload. This is the **only** E2E
the starter owns — per-feature E2Es are your job. The full rulebook is in
[\`docs/test-strategy.md\`](docs/test-strategy.md).
`;
}
