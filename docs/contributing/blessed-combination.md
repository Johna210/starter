# Contributing: adding a new blessed combination

The playbook entry for growing the **CI-tested envelope** — "how to add
a new blessed combination to the CI matrix" (decisions 7, 24, 29). The
mechanical standard (how the matrix is wired, the caching, the guards)
is in [`../standards/ci-matrix.md`](../standards/ci-matrix.md); this
entry is the product-level view: what "blessing" commits you to.

## What "blessed" means

The **blessed 2×2** (decision 7) — {monolith, microservices} × {TS, Go}
— is the only fully CI-tested envelope: every blessed combination runs
**unit + contract + the one E2E over `items`** (decision 22) with
**mobile on** (Expo for TS shapes, Flutter for Go shapes, decision 29:
web + mobile are blessed). Everything else is **generatable but not
CI-tested** (decision 24) — an honest label, not a refusal. AI is not
in the blessed matrix by construction (decision 29): it's opt-in
(decision 21) and ships no example composition to E2E (decision 20).

Blessing a combination is how the stability surface grows — the blessed
envelope is what the 1.0 transition mechanically checks (decision 36).
It is an **ADR-level decision**, not a drive-by config change.

## The checklist

### 1. The composition exists and materializes

The combination is a real `Composition` with a predicate in
`composition.ts` and a materialize test (`materialize*.test.ts`),
landing via the `contributing/` playbook that matches its axis (web
variant, mobile option, api framework, …). You can't bless what doesn't
materialize.

### 2. The matrix entry (`.github/workflows/ci.yml`)

Add the `strategy.matrix.include` row; audit every existing step's
`if:` guard so the new row runs exactly the steps its shape supports
(Go steps for Go rows, mobile smoke for mobile-on rows, AI steps only
for the unblessed AI row). Keep the per-issue comment history at the
top of the workflow accurate.

### 3. The test surface (decision 22's pyramid)

- **Unit** — every workspace the shape ships has runnable tests.
- **Contract** — TS shapes: the compile-time contract (the materialized
  project typechecks, web typed against api). Go shapes: regenerate +
  commit the spec, contract tests validate it against the running
  server, the generated-client tripwires hold.
- **The one E2E over `items`** — boots the full stack (web → api → db)
  through the Taskfile orchestrator and drives the flow in a real
  browser (Playwright).

### 4. The E2E envelope

The items flow is the *only* E2E the starter owns (decision 22's
one-E2E discipline): create an item via the web UI, see it in the list,
verify it persisted web→api→db. A blessed combination runs it against
its own stack — no skipped steps, no reduced surface.

### 5. Mobile smoke (web + mobile are blessed)

The shape's mobile app (if mobile is on — and the blessed envelope runs
**mobile on**) gets the build-and-boot smoke: compiles, boots, and the
mobile auth flow (decision 23) runs against the api — secure storage +
Bearer + body-refresh, with `ACCESS_TOKEN_TTL=1` forcing a real 401 so
rotation is exercised.

### 6. The docs stay in sync

The blessed-2×2 docs
([`../architecture/blessed-2x2.md`](../architecture/blessed-2x2.md)),
the matrix standard
([`../standards/ci-matrix.md`](../standards/ci-matrix.md)), the
scaffolded-project README warning behavior (decision 24's "generatable
but not CI-tested" label flips to a blessed label), and the workflow's
own comment history all describe the new envelope. The recursion
(decisions 30/34) applies to the envelope too: what the CI claims, the
docs must claim.

## The bar

A combination is blessed when the full envelope above is green **and
documented** — the matrix row, the pyramid, the E2E, the mobile smoke,
and the docs all land in the same change. The default for any new
composition stays **generatable but not CI-tested**; blessing is the
exception, justified by the contribution model (decisions 7/24/29) and
recorded as an ADR.
