// Materializer: root templates (workspace-level config + README).
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 5 files written at the project root (package.json, pnpm-workspace
// YAML, Taskfile, .gitignore, README). The orchestrator (materialize.ts)
// calls writeRoot(ctx); template functions are private to this module.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeRoot(ctx: ProjectContext): Promise<void> {
  const { targetDir, name } = ctx;

  await writeFileRecursive(join(targetDir, 'package.json'), rootPackageJson(name));
  await writeFileRecursive(join(targetDir, 'pnpm-workspace.yaml'), rootPnpmWorkspaceYaml());
  await writeFileRecursive(join(targetDir, 'Taskfile.yml'), rootTaskfileYml());
  await writeFileRecursive(join(targetDir, '.gitignore'), rootGitignore());
  await writeFileRecursive(join(targetDir, 'README.md'), rootReadme(name));
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
        build: 'task build',
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

function rootTaskfileYml(): string {
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
    desc: Run all tests
    cmds:
      - task: test:web
      - task: test:api
      - task: test:auth
      - task: test:shared
      - task: test:db

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

function rootReadme(name: string): string {
  return `# ${name}

A fullstack TypeScript monorepo scaffolded from
[create-fs-starter](https://github.com/Johna210/starter).

## What's in here

- \`apps/web\` — Vite + React + TanStack Router + TanStack Query. Reaches
  the api through the typed \`api-client\` (see \`apps/web/src/lib/api.ts\`).
- \`apps/api\` — Hono on Node, modular-monolith structure: each domain lives
  in \`apps/api/src/internal/<name>/\` with a typed interface, mounted at a
  prefix. The \`items\` and \`auth\` modules are wired end-to-end.
- \`packages/db\` — Drizzle + pg + zod. The TS schema is the single source
  of truth; \`drizzle-kit\` emits versioned SQL migrations into
  \`packages/db/migrations/\`.
- \`packages/auth\` — the auth shim (decision 12): argon2id passwords,
  jose-signed JWTs, refresh-token rotation. Thin typed layer over vetted
  libraries; owns the surface, not the crypto.
- \`packages/api-client\` — typed Hono RPC client (decision 17/18). The web
  (and later, mobile) reach the api through this client with end-to-end
  type inference; no codegen, no separate OpenAPI artifact.
- \`packages/shared\` — shared TS package (zod schemas + utils, empty for now).

## The items demo (decision 13)

The scaffold ships a single trivial domain, \`items\`, to prove the whole
stack composes end-to-end on day one. \`/items\` is **protected** —
a valid Bearer access token is required on every request:

- \`GET /items\` returns the list (Hono route → \`requireAuth\` → \`ItemsRepo.list()\` → Drizzle → Postgres).
- \`POST /items\` with \`{ "name": "..." }\` creates a row and returns it.

It's a 5-minute delete when you start your real domain, not a refactor.

## Auth (decision 12)

Four public endpoints on the api, mounted at \`/auth/\`:

- \`POST /auth/register\` — \`{ email, password }\` → \`{ access, refresh, userId }\` (201). Sets an httpOnly refresh cookie.
- \`POST /auth/login\` — \`{ email, password }\` → \`{ access, refresh, userId }\`. Sets an httpOnly refresh cookie.
- \`POST /auth/refresh\` — accepts the refresh via the httpOnly cookie (web) or \`{ refresh }\` in the body (mobile) → \`{ access, refresh }\` (rotation; old refresh is revoked). Sets a new httpOnly cookie on the web path.
- \`POST /auth/logout\` — same dual-channel \`refresh\` lookup → \`{ ok: true }\` (idempotent). Clears the httpOnly cookie on the web path.

\`apps/api\` is the **sole minter** of JWTs in this monorepo (decision 11):
no other service reads \`JWT_SECRET\`. Generate one with
\`openssl rand -base64 48\` and put it in \`apps/api/.env\`; the rest of
the env contract is in \`apps/api/.env.example\`.

The shim is intentionally narrow. Email verification, password reset,
MFA, OAuth, and RBAC are explicitly *fences* (not features) — see
\`docs/wire-it-in/auth.md\` for the seams.

## Quickstart

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

## Tasks

| Task | What it does |
|------|--------------|
| \`task dev\` | Boot web + api in parallel |
| \`task test\` | Run all workspace tests (skips items-repo test if \`DATABASE_URL\` is unset) |
| \`task test:auth\` | Run the auth shim's unit tests (real argon2 + jose, no mocks) |
| \`task migrate\` | Apply pending DB migrations |
| \`task db:generate\` | Generate a new migration from the Drizzle schema |
| \`task build\` | Build all workspaces |

## Where to extend

- **Add an api domain**: \`apps/api/src/internal/<name>/\` with
  \`<name>.repo.ts\` (interface) + \`<name>.routes.ts\` (Hono) +
  \`index.ts\` (mountable module); mount it in \`apps/api/src/index.ts\`.
  Behind \`requireAuth\` if it needs an authenticated principal.
- **Add a db table**: edit \`packages/db/src/schema/\`, then
  \`task db:generate\` to emit a migration, then \`task migrate\`.
- **Wire a fence from the auth shim** (email-verify, password reset,
  MFA, OAuth, RBAC): see \`docs/wire-it-in/auth.md\` for the seams.
- **Add a web page**: create a route in \`apps/web/src/pages/\` and
  register it in \`apps/web/src/router.tsx\`; reach the api through
  \`apiClient\` (re-exported from \`apps/web/src/lib/api\`).
`;
}
