# Starter repo docs

This is the Starter's `/docs/` — the contributor-facing documentation
tree. It mirrors the four **domain subdirs** of a scaffolded project's
`/docs/` (decision 30), each rewritten for the contributor, *plus* a
Starter-repo-only `contributing/` subdir (decision 34's deliberate
asymmetry).

> A contributor who reads the Starter repo's `/docs/` finds the same
> domain subdirs as the scaffolded project (the recursion wins), *plus*
> a `contributing/` they can use (the Starter-repo-specific value).

## The map

| Subdir | What it is | The scaffolded project's analog |
|---|---|---|
| [`architecture/`](architecture/) | what the **generator produces** — the blessed 2×2, the contract spine, the split-seam, the modular monolith, the auth subtree, the typed-RPC transport | `docs/architecture/` (composition-specific, "your … spine") |
| [`wire-it-in/`](wire-it-in/) | the **fence-extension convention** — how to add a new fence across the shim, the guide, and the prompt | `docs/wire-it-in/` ("how to fill in this fence") |
| [`adr/`](adr/) | the Starter's **own future decisions** — `CONTEXT.md` is the predecessor; new decisions land as `NNNN-….md` | `docs/adr/` (the user's project decisions) |
| [`standards/`](standards/) | the **how of contributing to the Starter** — templates, workspaces, contract-mechanism mechanics, the CI matrix, doc regeneration | `docs/standards/` (the how of working in a scaffolded project) |
| [`contributing/`](contributing/) | the **contribution playbook** — how to add a new X to the five-axis composition (decision 24) | *none* — Starter-repo-only |

## The contribution playbook (`contributing/`)

Six entries — how to add a new X to the five-axis composition
(decision 24):

- [Add a new web variant](contributing/web-variant.md) (decision 15)
- [Add a new api framework](contributing/api-framework.md) (decision 18)
- [Add a new mobile option](contributing/mobile-option.md) (decision 4)
- [Add a new fence](contributing/fence.md) (decision 12)
- [Bump the contract mechanism](contributing/contract-mechanism.md) (decisions 17/19)
- [Add a new blessed combination](contributing/blessed-combination.md) (decisions 7/24/29)

## The domain subdirs in one line

- **`architecture/`** — the blessed 2×2 (7/24) + how each cell maps to
  workspaces; the contract spine (3/9/17/19); the split-seam (10/27);
  the modular monolith (27); the auth subtree (11/12/16/23); the
  typed-RPC transport (17b).
- **`wire-it-in/`** — the fence-extension guide: a fence lives in three
  places (a `packages/*` shim, a `/docs/wire-it-in/` guide, a CLI
  prompt), and adding one touches all three.
- **`adr/`** — the Starter's own ADR convention; `CONTEXT.md` is the
  predecessor, new decisions get recorded in `docs/adr/NNNN-….md`.
- **`standards/`** — the Starter's contribution standards (the *how*),
  distinct from the scaffolded project's `docs/standards/` (the *how*
  of working in a scaffolded project, decision 32).

## Entry points

- **`CONTEXT.md`** (repo root) — the living glossary + the locked
  decisions (the predecessor of the ADR convention). Read it for the
  domain vocabulary; every doc here references its decisions by number.
- **`docs/agents/`** — the agent-skill conventions (issue tracker,
  domain docs).
- **`README.md`** (repo root) — the five-axis composition (decision 24)
  and the contribution model at a high level; this tree is the deep
  reference.
