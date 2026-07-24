# Starter

A reusable starting point for new fullstack projects. A CLI scaffolder
that composes a TypeScript-or-Go backend, a web app (Next.js or Vite +
TanStack), optional mobile (Expo or Flutter), and optional AI from a
single five-axis prompt — emitting a monorepo with a contract spine
(Hono RPC in TS shapes, OpenAPI in polyglot shapes) and a
capability-split example to teach the seam.

This repository is **the Starter itself** — the code, tooling, and
docs that produce a scaffolded project. See `CONTEXT.md` for the
locked product decisions, `docs/agents/` for contributor conventions,
and `docs/adr/` for architecture records.

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Task** (go-task) — the cross-language orchestrator. Install with
  `go install github.com/go-task/task/v3/cmd/task@latest`, or see
  [taskfile.dev/installation](https://taskfile.dev/installation/).

## Quickstart

```sh
# List available tasks
task

# Start development (no-op until the CLI workspace is scaffolded in a later ticket)
task dev

# Run the test suite
task test

# Build everything
task build
```

The CI workflow at `.github/workflows/ci.yml` runs `task build` on
every pull request and on every push to `master`.

## Layout

```
.
├── AGENTS.md              # Agent-skill conventions for this repo
├── CONTEXT.md             # Domain glossary + locked decisions
├── Taskfile.yml           # Cross-language orchestrator (dev/test/build)
├── biome.json             # TS lint+format config (one-tool, per decision 29)
├── package.json           # Root workspace manifest
├── pnpm-workspace.yaml    # pnpm workspace globs
├── tests/                 # Repo-level tests (e.g. Taskfile contract)
└── .github/workflows/     # GitHub Actions
```

## Contributing

Read `CONTEXT.md` for the design language and `docs/agents/issue-tracker.md`
for how work is tracked. Issues live on
[GitHub](https://github.com/Johna210/starter/issues).
