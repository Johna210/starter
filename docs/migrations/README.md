# Migration notes (the canonical set)

This directory holds the Starter's **second release-note artifact**
(decision 38): per-version upgrade recipes for **post-1.0 breaking
changes** — *how* to upgrade past a breaking change. The first artifact
is the root `CHANGELOG.md` (*what* changed, the "should I upgrade?"
signal).

**Pre-1.0 (the phase this Starter is in):** there are **no migration
notes** — every 0.x change is breaking (decision 35) and users
re-scaffold to upgrade. `docs/migrations/` is the *reserved location*
for post-1.0, established now so the mechanism exists when the first
breaking 1.x lands (ticket 21's transition makes the directory real).

## The convention (post-1.0)

- **One file per version transition**: `v1.2-to-v1.3.md`.
- **Structure** — a structured upgrade recipe:
  1. **What changed** — 1–2 paragraphs.
  2. **If you're on X** — steps.
  3. **If you're on Y** — steps.
  4. **Verify** — what to check after the upgrade.
- **Linked from the CHANGELOG** entry of the breaking release (the
  CHANGELOG flags it `BREAKING:` and links the recipe).
- **The lookup mechanism** (decision 38): the CLI stamps the generating
  version into every scaffolded project (`starterVersion` in
  `package.json` for TS shapes, the root `Taskfile.yml` `vars` block for
  Go shapes). The scaffolded project's doc generator mirrors the notes
  whose range covers its `starterVersion`
  (`packages/cli/src/materialize/docs.ts` → `migrationNotesFor`). When a
  breaking change ships, add the recipe here **and** the entry in that
  function so scaffolds pick it up.

## When to write one

A breaking change that lands in a major version bump (post-1.0 SemVer,
decision 35) gets a recipe. Patch/minor changes do not — the CHANGELOG
entry suffices.
