# Standards: the CI matrix and blessed combinations

The Starter's contribution standard for the CI envelope — how the
matrix is structured and how a new **blessed combination** gets added.
Companion to the `contributing/blessed-combination.md` playbook entry
(what blessing a combination means product-level).

## The envelope (decisions 7, 24, 29)

- **Blessed 2×2** (decision 7): {monolith, microservices} × {TS, Go} —
  the only fully CI-tested combinations. Each runs **unit + contract +
  the one E2E over `items`** (decision 22) with **mobile on** (Expo for
  TS shapes, Flutter for Go shapes — decision 29: web + mobile are
  blessed).
- **Generatable-anything** (decision 24): every other composition is
  materializable but **not CI-tested**, produced with a documented
  "generatable but not CI-tested" warning and no E2E guarantee.
- **AI is NOT in the blessed matrix** (decision 29): it's opt-in
  (decision 21) and ships no example composition to E2E (decision 20);
  a mocked-LLM round-trip is a unit test, not a CI integration.

## How the matrix is wired

The matrix lives in `.github/workflows/ci.yml`:

1. A `strategy.matrix.include` row per shape (with `backend` for Go-
   only steps; an `ai: 'true'` **string** for the unblessed AI row —
   a YAML boolean would depend on runtime type coercion).
2. Steps guard on `matrix.*`: `if: matrix.backend == 'go'`, `if:
   matrix.ai != 'true'`, etc.
3. The starter repo's own tests (`task test`) run first; then the CLI
   materializes a fresh scaffolded project via
   `ci/materialize-test-project.ts` and runs its full suite including
   the Playwright E2E.
4. Caches are keyed on the materializer source tree (the deterministic
   input to every scaffolded project's manifests) — a template change
   busts the key exactly when the dep set can change (issue 38).

## Adding a new blessed combination (the standard)

"Blessing" a combination means committing to the full envelope for it.
The checklist:

1. **The composition exists** — the combination materializes via the
   CLI with its predicate in `composition.ts` and a materialize test
   (see `materializer-workspaces.md`).
2. **Matrix row** — add the `include` row; make every existing step's
   `if:` guard cover or exclude it correctly.
3. **Test surface (decision 22)** — the row runs the full pyramid:
   per-workspace unit tests, the contract tests (typecheck for TS
   shapes; regenerate+commit spec + contract tests for Go shapes), and
   the one E2E over `items` with mobile on.
4. **Mobile smoke** — Expo (TS shapes) or Flutter (Go shapes)
   build-and-boot: compiles, boots, and the mobile auth flow
   (decision 23) runs against the api (secure storage + Bearer +
   body-refresh, ACCESS_TOKEN_TTL=1 forcing a real 401).
5. **E2E envelope** — the items E2E runs in a real browser against the
   full stack (web → api → db).
6. **Docs** — the matrix comment block at the top of `ci.yml` (the
   per-issue history) gains the new row's entry; the blessed-2×2 docs
   (`docs/architecture/blessed-2x2.md`) and the scaffolded-project
   README warning behavior stay in sync.

## The gate

Blessing is a **big deal**: the blessed-4 envelope is the stability
surface the 1.0 transition mechanically checks (decision 36's criteria
— the CI matrix passing green on all 4 blessed combos). A new blessed
combination is an ADR-level decision (it grows the stability surface),
not a drive-by config change. The default for a new composition is
**generatable but not CI-tested** (the honest label, decision 24) —
blessing it is the exception, justified by the contribution model
(decisions 7/24/29).
