# Standards: writing a new CLI template

The Starter's contribution standard for templates — the *how* of adding
or changing a template in the materializer. These are the mechanical
rules; the `contributing/` playbook entries are the product-level
"what to change when adding a new X."

## Where templates live

Templates are **not** static files with `{{variable}}` interpolation
(decision 1 explicitly rejected static templates as the form). They are
**TypeScript functions** in `packages/cli/src/materialize/<workspace>.ts`
that take the composition and return file contents:

- each workspace has one module (`root.ts`, `web.ts`, `api.ts`,
  `docs.ts`, `go-api.ts`, …) exporting a `write<Workspace>` function;
  the signatures vary with the workspace — composition is passed where
  the workspace is composition-conditional (`writeDocs(ctx,
  composition)`, `writeWeb(ctx, composition?)`), and a workspace that
  never branches on the composition takes `ctx` only;
- `materialize.ts` is the flat orchestrator delegating to each module;
- every file write goes through `writeFileRecursive` from `_shared.ts`.

A template is a **type-checked value, not embedded bytes** (decision 25):
the CLI shares the Starter's TS monorepo so templates import as values,
with one toolchain, one test runner (vitest), one type-checker.

## The rules

### 1. Composition-conditional, not static

Templates branch on the five axes (`backend`, `topology`, `web`,
`mobile`, `ai`). The predicate functions live in `composition.ts`
(`isTsMonolithVite`, `isGoMicroservicesNextAi`, …) — use those, or add
a predicate there; never inline raw axis comparisons scattered across
template modules.

### 2. One template family per shape family

The modular-monolith structure is shared across monolith and
microservices (decision 27): the template difference between the two
is the example split (exists or not), never a structural rewrite. A
change to `internal/*` lands in both the monolith and microservices
templates at once.

### 3. Docs are templates too

The scaffolded project's `/docs/` is materialized by `docs.ts` from the
same composition (decision 31) — code and docs are both produced by the
same composition. Changing a workspace's shape usually means changing
its doc templates too (see `regenerate-docs.md`).

### 4. The warning label

Unblessed combinations (decision 24) get a documented "generatable but
not CI-tested" warning at scaffold time and no E2E guarantee. A
template for an unblessed combo carries that warning in the generated
README.

### 5. Tests prove the composition

Each materializable composition has a test in
`packages/cli/tests/materialize*.test.ts` asserting "scaffold shape X →
working project" (decision 25b), and the CLI's own suite runs in CI
before any scaffolded-project work (decision 22). A new template
family ships its materialize test in the same commit.

## How to write one (the workflow)

1. Add the composition predicate(s) to `composition.ts` if new.
2. Create `materialize/<workspace>.ts` with `write<Workspace>(ctx, composition)`,
   or extend an existing one with composition-conditional branches.
3. Wire it into the `materialize.ts` orchestrator.
4. Add/update the materialize test (and the typecheck test — the
   materialized project must typecheck, decision 22's compile-time
   contract).
5. Update the scaffolded-project `/docs/` templates (`docs.ts`) to
   match — see `regenerate-docs.md`.
6. Run `task test` (starter suite) + the full materialize/typecheck
   tests before pushing.
