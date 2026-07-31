import { join } from 'node:path';
import { type Composition } from '../composition.js';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeRoot(ctx: ProjectContext, composition: Composition): Promise<void> {
  const { targetDir, name } = ctx;

  await writeFileRecursive(join(targetDir, 'package.json'), rootPackageJson(name, composition));
  await writeFileRecursive(join(targetDir, 'pnpm-workspace.yaml'), rootPnpmWorkspaceYaml());
  await writeFileRecursive(join(targetDir, 'Taskfile.yml'), rootTaskfileYml(composition));
  await writeFileRecursive(join(targetDir, '.gitignore'), rootGitignore());
  await writeFileRecursive(join(targetDir, 'README.md'), rootReadme(name, composition));
}

function rootPackageJson(name: string, composition: Composition): string {
  if (composition.backend === 'go') {
    // Shape 3 base has no web/E2E yet (ticket 12); the root is a thin
    // Taskfile shim — the Go api owns the work.
    return JSON.stringify(
      {
        name,
        version: '0.1.0',
        private: true,
        type: 'module',
        description: 'Scaffolded from create-fs-starter (Go-monolith + Gin + Huma).',
        engines: { node: '>=20.0.0' },
        scripts: {
          dev: 'task dev',
          test: 'task test',
          build: 'task build',
        },
      },
      null,
      2,
    ) + '\n';
  }
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
  if (composition.backend === 'go') {
    return `# Taskfile.yml — scaffolded orchestrator (shape 3: Go-monolith base).
#
# Boot the stack with \`task dev\`. Per decision 19 the Go api is the
# canonical side: the contract (packages/contract/openapi.yaml + the TS
# client) is generated FROM the Go structs and committed — never edited
# by hand.
#
# Shape 3 base has no web yet (that's ticket 12, the Next.js variant):
# \`task dev\` boots the Go api only.

version: "3"

tasks:
  default:
    desc: List available tasks
    cmds:
      - task --list
    silent: true

  dev:
    desc: Boot the Go api (no web yet — ticket 12 adds Next.js)
    cmds:
      - task dev:api

  dev:api:
    desc: "Boot the api on http://localhost:3000 (OpenAPI: /openapi.json)"
    dir: apps/api
    cmds:
      - go run ./cmd/api

  test:
    desc: Run all tests (unit + contract, decision 22). The one E2E arrives with the web (ticket 12).
    cmds:
      - task go:test

  go:test:
    desc: Go unit + contract tests. Repo/contract tests skip cleanly when DATABASE_URL is unset.
    dir: apps/api
    cmds:
      - go test ./...

  go:build:
    desc: Compile the api
    dir: apps/api
    cmds:
      - go build ./...

  go:vet:
    desc: Vet the api
    dir: apps/api
    cmds:
      - go vet ./...

  migrate:
    desc: "Apply pending DB migrations (DATABASE_URL and JWT_SIGNING_KEY must be set in apps/api/.env — config.go validates both)"
    dir: apps/api
    cmds:
      - go run ./cmd/migrate

  contract:generate:
    desc: Regenerate the contract from Go (decision 19) — openapi.yaml from the structs, then the TS client. Commit the diff.
    cmds:
      - 'cd apps/api && go run ./cmd/specgen && cd ../.. && pnpm --filter @starter/contract generate'

  build:
    desc: Build all workspaces
    cmds:
      - task go:build
`;
  }

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
  if (composition.backend === 'go') {
    return `# ${name}

A fullstack monorepo scaffolded from
[create-fs-starter](https://github.com/Johna210/starter) — **shape 3:
Go-monolith** (Gin + Huma api, the OpenAPI contract as the seam).

## Quickstart — the items demo (decision 13)

The scaffold ships a single trivial domain, \`items\`, to prove the whole
stack composes end-to-end on day one. \`/items\` is **protected** — a
valid Bearer access token is required on every request:

\`\`\`sh
# 1. Install Taskfile (go-task) if you don't have it:
#   go install github.com/go-task/task/v3/cmd/task@latest
#   or see https://taskfile.dev/installation/

# 2. Bring up Postgres any way you like (docker, native, etc.) and set
#    DATABASE_URL in apps/api/.env (copy apps/api/.env.example).
# 3. Set JWT_SIGNING_KEY in apps/api/.env (at least 32 chars):
#      openssl rand -base64 48

# 4. Install the contract tooling, apply migrations, and boot the api.
pnpm install
task migrate
task dev
\`\`\`

\`task dev\` boots \`apps/api\` on http://localhost:3000 (the Go api;
the Next.js web variant is scheduled — this shape is api-only for now).
The OpenAPI document is served live at \`/openapi.json\` and
\`/openapi.yaml\`.

Try the flow with curl:

\`\`\`sh
# Register an account (sets the httpOnly refresh cookie, returns a token pair)
curl -i -c cookies.txt -X POST http://localhost:3000/auth/register \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"you@example.com","password":"password123"}'

# Login (refresh token also lands in the cookie jar)
curl -i -c cookies.txt -X POST http://localhost:3000/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"you@example.com","password":"password123"}'

# Create an item with the access token
curl -X POST http://localhost:3000/items -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <access>' -d '{"name":"first item"}'

# List items
curl http://localhost:3000/items -H 'Authorization: Bearer <access>'

# Rotate the refresh token (cookie-first; a body fallback also works)
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/auth/refresh

# Log out (revokes the refresh token, clears the cookie)
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/auth/logout
\`\`\`

It's a 5-minute delete when you start your real domain, not a refactor.

## What you just saw

You just saw the **OpenAPI contract spine** (decisions 3, 9, 17, 19) in
action — with **Go as the canonical side**: \`packages/contract/openapi.yaml\`
is **generated from the Go api's structs** (Huma codegens the spec from the
typed Gin routes) and **committed**. The TS client in \`packages/contract/src/\`
is generated from the committed file, never hand-written.

**The modular monolith** (decision 27): \`apps/api\` holds two modules
(\`internal/auth\`, \`internal/items\`) with typed interfaces
(\`items.repo.go\`, \`auth.repo.go\`) mounted at \`/auth\` and \`/items\` —
the same split-seam a microservices shape would extract. The **auth
shim** (decision 12) is the four endpoints (\`/register\`, \`/login\`,
\`/refresh\`, \`/logout\`) over argon2id + JWT + refresh-token rotation;
\`/items\` sits behind its \`requireAuth\` Bearer gate. \`apps/api\` is the
**sole minter** (decision 11): one process holds the signing key.

**Your contract spine**: change a Go struct, run \`task contract:generate\`,
commit — the spec and the TS client follow (the scaffold's tests enforce
this: \`apps/api/contract_test.go\` proves the committed spec equals the live
spec, and the contract package's own test proves the committed client
equals the generator's output).

\`\`\`mermaid
graph LR
    subgraph "apps/api (Gin + Huma, :3000)"
        R["huma.API<br/>/auth/* + /items"]
        AUTH["internal/auth<br/>argon2id + JWT + rotation<br/>(sole minter)"]
        ITEMS["internal/items<br/>typed ItemsRepo"]
        DB1["Postgres (pgx)"]
    end
    subgraph "packages/contract (the only package)"
        YAML["openapi.yaml<br/>generated from Go structs, committed"]
        TS["src/ — generated TS client"]
        DART["clients/dart/ — Dart client (Flutter, ticket 17)"]
    end
    R -->|mounts| AUTH
    R -->|requireAuth + mounts| ITEMS
    AUTH -->|uses| DB1
    ITEMS -->|uses| DB1
    YAML -. "task contract:generate" .-> R
    TS -. "generated from" .-> YAML
    DART -. "generated from" .-> YAML
\`\`\`

## Where to extend

The scaffold ships honest seams — each is a documented extension point:

- **Add a db table**: append a \`migrations/000N_*.sql\` file, then
  \`task migrate\`.
- **Add an api domain**: \`apps/api/internal/<name>/\` with
  \`<name>.repo.go\` (interface) + \`<name>.repo.pg.go\` (pgx) +
  \`<name>.routes.go\` (Huma structs) + \`index.go\` (mountable module);
  mount it in \`apps/api/internal/router/router.go\`. Behind
  \`requireAuth\` if it needs an authenticated principal.
- **Change the contract**: edit the Go structs (the canonical side), run
  \`task contract:generate\`, and commit the spec + client diff (decision 19).
- **Wire a fence from the auth shim** (email-verify, password reset,
  MFA, OAuth, RBAC): the auth shim's scope is fixed by decision 12 —
  fenced capabilities land in the module's route handlers.

## How to grow

The scaffold is designed for seam-preserving upgrades — copy the pattern,
don't refactor:

- **Add the web variant** (ticket 12): the Next.js app consumes the
  generated TS client — the contract is invariant, only the rendering
  shell changes.
- **Add the Flutter mobile** (ticket 17): consumes the Dart client in
  \`packages/contract/clients/dart/\`.
- **Split a capability out** (decisions 10, 27): extract
  \`internal/auth\` into a sibling service, exactly as the TS shapes'
  example split — the modular monolith's \`internal/*\` structure is
  already prepared for it.
- **Record your decisions** (decision 30): use \`docs/adr/\` to record
  architectural decisions.

## Tasks

| Task | What it does |
|------|--------------|
| \`task dev\` | Boot the Go api (no web yet — that's ticket 12) |
| \`task test\` | Run all tests: Go unit + contract (decision 22). The one E2E arrives with the web |
| \`task go:test\` | Go unit + contract tests (repo/contract tests skip cleanly when \`DATABASE_URL\` is unset) |
| \`task go:build\` | Compile the api |
| \`task migrate\` | Apply pending DB migrations (the Go migration runner) |
| \`task contract:generate\` | Regenerate \`openapi.yaml\` from the Go structs + regenerate the TS client (commit the diff) |
| \`task build\` | Build all workspaces |

## Tests — unit + contract (decision 22)

The scaffold ships two test levels (the E2E arrives with the web in
ticket 12):

- **Unit** — \`apps/api/internal/{auth,items}\`: the repo layers against a
  real Postgres, the auth shim against real argon2 + jwt. Skipped
  cleanly when \`DATABASE_URL\` is unset.
- **Contract** — \`apps/api/contract_test.go\` validates the committed
  \`packages/contract/openapi.yaml\` against the running server
  (spec equality + schema-checked route flows).
`;
  }

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
