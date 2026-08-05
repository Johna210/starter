# Contributing: bumping the contract mechanism

The playbook entry for changing the **contract mechanism** — how the
contract spine is realized (decisions 17, 19). The mechanical standard
(the regen workflow, the committed-as-seam rule, the verification
checklist) is in [`../standards/contract-mechanism.md`](../standards/contract-mechanism.md);
this entry is the product-level view: what a bump means for the
five-axis composition and when it fires.

## The mechanism today

- **TS shapes (1, 2): implicit** — shared TS packages, no artifact,
  realized as **Hono RPC** (`hc<typeof app>()`): the router's TS type
  *is* the wire contract, inferred end-to-end. (tRPC is the general
  principle; Hono RPC instantiates it — decision 17's override fired by
  decision 18's Hono choice.)
- **Polyglot shapes (3, 4): explicit** — `packages/contract` →
  OpenAPI, **Go-driven authorship** (decision 19): the spec is
  generated from the Go api's structs (Huma+Gin) during build and
  **committed** as the seam; TS/Dart clients are generated downstream.

## When a bump fires

### The polyglot trigger (decision 3)

The implicit→explicit switch fires on **language purity**: the explicit
contract the moment any non-TS language enters the build — Dart
(Flutter), Go, or Python anywhere. Flutter mobile alone forces it even
with a TS backend. This trigger is the *normal* bump: it's how a shape
moves between the implicit and explicit families, and it's deterministic
per composition.

### The framework-driven bump (decisions 17, 18)

The mechanism *tracks* the api framework: Hono's native typed RPC fires
decision 17's override (tRPC retreats to the general principle). A new
TS framework without a typed-RPC story would force a mechanism bump —
see the `api-framework.md` playbook.

### The shape-level bump (the ADR case)

A bump that isn't triggered by language purity or the framework — e.g.
replacing Hono RPC with something else within pure-TS shapes, or
re-opening Go-driven authorship in polyglot shapes — is a
**decision-level change**: a new ADR superseding decision 17/19, with
the rejected options recorded. It is never a template-level tweak.

## What the bump touches across the composition

1. **The materializer** — the contract workspace/package templates
   (`packages/api-client` in TS shapes; `packages/contract` + codegen
   in polyglot shapes).
2. **The docs** — the scaffolded-project diagrams are
   composition-specific (decision 31): "your Hono RPC contract spine"
   vs "your OpenAPI contract spine" — the mechanism is the headline,
   not a footnote. `docs.ts` + this repo's `docs/architecture/`
   mirror it.
3. **The test pyramid** — the compile-time contract in TS shapes (a
   type error in the api is a compile error in the web client,
   decision 22); the regen+commit+contract-tests tripwires in Go
   shapes.
4. **The CI matrix** — the affected shapes' rows run the new mechanism's
   surface (see `blessed-combination.md` for the envelope rules).

## The downstream: client-codegen

Whatever the mechanism, the clients are **generated or inferred from
the contract** — never hand-maintained. A bump that changes the codegen
path (or abandons inference for an artifact) updates the generator
tooling and the "committed client == generator output" tripwires. The
one rule that never changes: the contract is the only door (decision
15), and the web/mobile variants consume it through the typed client.

## The bar

A mechanism bump is accepted when: the trigger is real (language
purity, framework change, or a superseding ADR); the mechanics follow
the standard (regen workflow, committed-as-seam, codegen downstream);
and the docs + tests + CI stay in sync across every shape the bump
touches. A bump that "works for one shape" but leaves the mirror
(decisions 30/34) or the matrix inconsistent is not done.
