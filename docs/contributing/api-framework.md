# Contributing: adding a new api framework

The playbook entry for adding an api framework to the composition
(decision 18). Today the api framework is a **fixed default, not a
variant**: **Hono** in the TS shapes (1, 2), **Gin + Huma** in the Go
shapes (3, 4) — deliberately, and this entry explains why a new
framework is a bigger deal than it looks.

## Why the framework is not a variant

Decision 18 made web a *variant* (decision 15) because web apps have
different **rendering architectures** that change what the project
*is*. The api framework is **plumbing over the contract** — less
architecturally transformative — and the contract mechanism (decision
17) is what makes the api legible to the web client, not the framework's
ergonomics. Making the framework a variant would double shape 2's CI
surface and couple the contract-mechanism axis to the framework choice
— two coupled axes for little architectural gain.

So "adding a new api framework" is not a prompt option; it is either a
**documented peer-app swap** (the user's job, decision 10's api-as-peer)
or a **decision-level change** (a new ADR reopening decision 18). This
playbook is for the latter: what the change would actually take.

## The framework's typed-RPC story

The first question to answer about any candidate framework:

- **Does it have a native typed RPC?** Hono does (`hc<typeof app>()`),
  which is *why* the contract mechanism is Hono RPC (decision 17's
  override: no redundant tRPC runtime bolted on).
- **Does it need the tRPC bolt-on?** If the framework has no typed RPC,
  the implicit contract mechanism either retreats to tRPC (reopening
  decision 17's override) or becomes an explicit contract — both are
  contract-mechanism changes, not framework swaps.
- **Is it runtime-agnostic?** Hono's runtime-agnosticism (Node/Bun/
  Deno/Cloudflare/edge) is what makes decision 10's "swappable api
  peer" real. A runtime-locked framework (e.g. Bun-only) directly
  fights that thesis — the rejected Elysia path in decision 18.
- **Does it have OpenAPI continuity?** Hono's `@hono/zod-openapi` is
  the only option with a path from the implicit contract to the
  explicit one without re-authoring the api. A framework without a
  continuity story makes the polyglot trigger (decision 3) a rewrite.

## The contract-mechanism implications

The framework choice and the contract mechanism are **coupled**
(decision 17's override fires on the framework choice):

- TS shapes: the implicit contract is realized by the framework's
  typed RPC. A new TS framework without one reopens the mechanism.
- Go shapes: the OpenAPI spec is **generated from the framework's
  route structs** (Huma+Gin, decision 19). A new Go framework without
  spec-generation reverts to hand-authored OpenAPI — the tedium
  decision 19 explicitly rejected.

## The CI matrix entry

A framework change touches every shape it serves: the materialize
templates, the contract tests (the tripwires), and the CI matrix rows
(see the `blessed-combination.md` playbook for the envelope). Adding a
framework *alongside* Hono would mean either a new shape family or a
variant-coupled matrix — the exact doubling decision 18 rejected.

## The bar

The default answer is **no**: the framework is fixed (Hono for TS,
Gin + Huma for Go), and a user who wants Fastify/Chi/Echo is doing a
documented peer-app swap, not asking for a different project shape. A
contributor proposing a new framework must argue it *through* the
typed-RPC story, the contract-mechanism coupling, and the CI cost —
and record the decision as an ADR superseding decision 18, with the
rejected options recorded (per the Starter's ADR convention,
[`../adr/README.md`](../adr/README.md)).
