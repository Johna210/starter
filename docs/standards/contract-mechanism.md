# Standards: bumping the contract mechanism

The Starter's contribution standard for the **mechanics** of changing
the contract mechanism — the concrete rules a contributor follows. The
`contributing/contract-mechanism.md` playbook entry is the product-level
view (what the change means for the five-axis composition); this doc is
the mechanical standard (how the change is made and verified).

## What the mechanism is

The **contract mechanism** is *how* the contract spine (decision 3) is
realized mechanically:

- **TS shapes (1, 2): implicit** — shared TS packages, no artifact,
  realized as **Hono RPC** (`hc<typeof app>()`): the router's TS type
  *is* the wire contract, inferred end-to-end. (tRPC is the general
  principle; Hono RPC instantiates it — decision 17's override, fired
  by decision 18's Hono choice.)
- **Polyglot shapes (3, 4): explicit** — `packages/contract` →
  OpenAPI, with **Go-driven authorship** (decision 19): `openapi.yaml`
  is generated from the Go api's structs via Huma+Gin during build and
  **committed** as the seam; TS/Dart clients are generated downstream.

The trigger between them is **language purity** (decision 3): the
explicit contract fires the moment any non-TS language enters the build.

## The mechanical rules

### The polyglot trigger is a fork, not a toggle

The implicit→explicit switch is gated by language purity — Flutter
mobile alone forces it even with a TS backend. "Bumping the mechanism"
means changing *which* mechanism a shape uses, which is a **shape-level
decision** (a new ADR), not a template tweak. The fork must stay
deterministic: any composition either is pure-TS (implicit) or has a
non-TS component (explicit) — no third state.

### The Huma-with-Gin regen workflow (explicit shapes)

The OpenAPI file is **generated, not authored**:

1. Change the typed Go input/output structs on the Gin routes.
2. Build — Huma regenerates the spec.
3. **Commit** the regenerated `openapi.yaml` (the committed file is the
   seam, decision 19).
4. Regenerate TS/Dart clients from the committed file.

A spec change is a build step, not a free symmetric edit. The committed
file is the tripwire: contract tests validate it against the running
server (decision 22).

### OpenAPI-committed-as-seam rule

The committed `openapi.yaml` is the agreed wire-format boundary all
sides are generated from — the spine survives even though Go writes it.
Never hand-edit the committed spec as an end-run around the generator:
the next build overwrites it, and the "committed client == generator
output" tripwires fail.

### Client-codegen downstream

TS/Dart clients are generated from the committed file — never
hand-maintained. A mechanism bump that changes the codegen path must
update the generator tooling and re-run the tripwire tests
(`packages/cli/tests/materialize*.test.ts`, the contract client's own
"committed client == generator output" test).

### The typecheck-as-contract-test rule (implicit shapes)

In TS shapes, a type error in the api is a compile error in the web
client (decision 22) — the materialized project's typecheck is part of
the contract surface. A mechanism bump that weakens this (e.g. moving
the implicit contract to an artifact) requires reopening decision 3/17
in an ADR; it's not a template-level change.

## Verification checklist

- [ ] Materialized TS shapes typecheck (web client typed against the api).
- [ ] Polyglot shapes: regenerate + commit the spec; contract tests pass
      against the running server.
- [ ] Generated clients == committed clients (tripwire).
- [ ] Unblessed combinations still materialize with the documented warning.
- [ ] The scaffolded-project docs (`docs.ts`) name the mechanism in the
      diagrams (decision 31) — a "your Hono RPC contract spine" vs
      "your OpenAPI contract spine" distinction, never a footnote.
