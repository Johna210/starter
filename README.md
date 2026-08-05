# Starter

A reusable starting point for new fullstack projects. A CLI scaffolder
that composes a TypeScript-or-Go backend, a web app (Next.js or Vite +
TanStack), optional mobile (Expo or Flutter), and optional AI from a
single five-axis prompt — emitting a monorepo with a contract spine
(Hono RPC in TS shapes, OpenAPI in polyglot shapes) and a
capability-split example to teach the seam.

This repository is **the Starter itself** — the code, tooling, and
docs that produce a scaffolded project. See `CONTEXT.md` for the
locked product decisions, `docs/` for the contributor-facing
documentation tree (mirrored from the scaffolded project per decision
30, plus a `docs/contributing/` playbook per decision 34), and
`docs/agents/` for the agent-skill conventions.

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
├── docs/                  # Contributor docs (mirrors the scaffolded project,
│   ├── README.md          #   plus a Starter-only contributing/ playbook)
│   ├── architecture/      #   what the generator produces
│   ├── wire-it-in/        #   the fence-extension convention
│   ├── adr/               #   the Starter's own future decisions
│   ├── standards/         #   the how of contributing to the Starter
│   └── contributing/      #   the five-axis contribution playbook
└── .github/workflows/     # GitHub Actions
```

## Docs

The `/docs/` tree mirrors the scaffolded project's four domain subdirs
(decision 30), each rewritten contributor-facing, *plus* a
Starter-only `docs/contributing/` playbook (decision 34). Start at
[`docs/README.md`](docs/README.md); read `CONTEXT.md` for the domain
vocabulary every doc references by decision number.

## Contributing

Read `CONTEXT.md` for the design language, `docs/contributing/` for the
contribution playbook (how to add a new X to the five-axis
composition), `docs/standards/` for the contribution standards, and
`docs/agents/issue-tracker.md` for how work is tracked. Issues live on
[GitHub](https://github.com/Johna210/starter/issues).
