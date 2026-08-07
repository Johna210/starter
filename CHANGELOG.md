# Changelog

All notable changes to this project are recorded here — the "should I
upgrade?" signal (decision 38). The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Phase: pre-1.0 (0.x).** Every change is breaking (decision 35): users
re-scaffold to upgrade, so there are **no migration notes** — the
`docs/migrations/` directory is reserved for post-1.0 breaking changes.
The CLI version and this repo's tags share one version (decision 35);
how to cut a release is in `docs/contributing/release.md`.

## [Unreleased]

No unreleased changes.

## [0.2.0] - 2026-08-07

### Added

- **Release flow (ticket 20)**:
  - `CHANGELOG.md` (this file) — the two-artifact release notes'
    "what changed" artifact (decision 38).
  - `docs/migrations/` — the reserved location + convention for
    post-1.0 per-version upgrade recipes (the "how to upgrade"
    artifact; empty pre-1.0 by design).
  - `starterVersion` field written by the CLI into every scaffolded
    project (`package.json` in all shapes, the root `Taskfile.yml`
    `vars` block in Go shapes) — the migration-note lookup key
    (decision 38).
  - The CLI's doc generator mirrors the release-note artifacts into
    the scaffolded project: a `CHANGELOG.md` keyed to the generating
    version, and a `docs/migrations/` whose content is conditional on
    `starterVersion` (empty lookup pre-1.0) — in **all** shapes, TS
    and Go.
  - The CLI's version now has a single source
    (`packages/cli/package.json`), so the CLI, the npm package, and
    the tag cannot drift (decision 35).
  - Release pipeline (`.github/workflows/release.yml`): cutting a
    `vX.Y.Z` tag on `master` gates on the CI matrix being green for
    the tagged commit **and** the commit being on `master`,
    verifies the tag / `package.json` / CHANGELOG versions agree,
    publishes the CLI to npm, and verifies the published version
    (decision 37).
  - Release playbook in `docs/contributing/release.md` (decision 34).

## [0.1.0] - 2026-07-25

### Added

- **The scaffolder itself** — `create-fs-starter`, a CLI that
  composes a fullstack project from five axes (backend language,
  topology, web variant, mobile, AI) and emits a monorepo with a
  contract spine and a capability-split example.
- **Blessed shapes 1–4** (decisions 7/24):
  - TS-monolith + Vite + TanStack (Hono RPC contract spine,
    modular monolith, auth shim, items demo).
  - TS-microservices (the example split: `apps/api-auth` as the sole
    JWT minter, local verification in `apps/api`).
  - Go-monolith + Next.js (Gin + Huma, OpenAPI generated from Go
    structs, committed; generated TS + Dart clients).
  - Go-microservices + Next.js (example split + JWKS-verified api).
- **Mobile peer apps** (decision 4/23): Expo for TS shapes,
  Flutter for Go shapes — secure-storage token handling, Bearer
  attachment, body-refresh rotation.
- **AI primitives** (decision 5/20): `packages/ai` (TS-monolith) and
  the Python/FastAPI `apps/ai` service (Go-microservices) — chat
  completion with streaming, embeddings, vector store, tool calling.
  Generatable but **not** CI-tested (decisions 24/29); no example
  composition ships.
- **The one E2E over `items`** (decision 22) — a Playwright flow
  proving the blessed compositions compose end-to-end.
- **Auto-filled docs** (decisions 30/31): the scaffolded project
  ships a composition-specific `/docs/` tree (architecture Mermaid,
  wire-it-in fences, ADR convention, standards).
- **Full CI matrix** (decisions 18/29, ticket 18): unit + contract +
  the one E2E on all 4 blessed combos, mobile build-and-boot smokes,
  AI-on row (unit + ruff, no E2E), dependency caching.
- **Starter repo docs** (decision 34): the `docs/contributing/`
  playbook (web variants, api frameworks, mobile options, fences,
  contract mechanisms, blessed combinations) and the contribution
  workflow.

[Unreleased]: https://github.com/Johna210/starter/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Johna210/starter/releases/tag/v0.2.0
[0.1.0]: https://www.npmjs.com/package/create-fs-starter/v/0.1.0
