# Standards: adding a workspace to the materializer

The Starter's contribution standard for growing the workspace grammar —
how a new `apps/*` or `packages/*` workspace becomes something the CLI
actually materializes. Companion to `cli-templates.md` (how to write
the template) and the `contributing/` playbook (what to change when
adding a new variant/option).

## The workspace grammar (decisions 2, 9)

A scaffolded project is a monorepo with workspaces (`apps/*` +
`packages/*`). The grammar:

- **TS shapes (1, 2)** — implicit contract: `packages/{db,auth,shared,ai}`
  are real TS workspaces imported by `apps/{web,api,mobile?}`. No
  contract artifact. (Shape 2 splits `apps/api` into `apps/api-*`
  microservices.)
- **Polyglot shapes (3, 4)** — explicit contract: `packages/contract`
  is the **only** package — `openapi.yaml` + generated clients + stubs.
  No `packages/db` / `packages/auth` shared across languages; each
  backend owns its own.
- **Mobile** is a peer **app** workspace sharing `packages/*` (TS) or
  only the contract (polyglot) — never a bolt-on, always a
  delete-the-folder toggle.

A new workspace must slot into one of these grammars. A workspace that
crosses the grammar boundary (e.g. a TS package shared into a Go shape)
contradicts decision 3/9's language-purity trigger — flag it, don't
silently extend the grammar.

## Where a workspace is wired in

Adding a workspace touches more than the template file. The checklist:

1. **Template module** — `materialize/<workspace>.ts` with
   `write<Workspace>(ctx, composition)` (see `cli-templates.md`).
2. **Orchestrator** — wire it into `materialize.ts` (conditionally on
   the composition predicates from `composition.ts`).
3. **Workspace manifests** — `package.json` (TS) / `go.mod` /
   `pyproject.toml` (polyglot) + the root `pnpm-workspace.yaml` /
   Taskfile wiring so the generated project's `task dev` / `task test`
   reach it.
4. **The generated Taskfile** — the workspace's tasks compose under the
   root orchestrator (decision 8: one orchestrator fans out across
   languages).
5. **Config & secrets** — if the workspace needs env vars: a
   zod-validated `config.ts` (decision 28), committed `.env.example`,
   no raw `process.env` reads.
6. **Docs templates** — the workspace's doc surface in `docs.ts`
   (composition-conditional per decision 31).
7. **Tests** — the materialize test + the workspace's own unit tests;
   typecheck coverage (the materialized project must typecheck).
8. **CI** — if the workspace is part of a blessed combination, the CI
   matrix gains a step (see `ci-matrix.md`); if it's an unblessed
   composition, it still materializes but carries the "generatable but
   not CI-tested" warning (decision 24).

## The seam rule

The workspace's *boundary* is the contract (decision 3): in TS shapes
the typed imports are the seam; in polyglot shapes the workspace
reaches others only through `packages/contract`. A new workspace that
bypasses the contract (raw HTTP to a sibling service, direct DB access
from a web workspace) re-creates the bypass decision 15 explicitly
rejected for the web — the contract stays the only door.
