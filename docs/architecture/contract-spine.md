# The contract spine (decisions 3, 9, 17, 19)

This is the *generator's* contract doc: what the CLI produces for the
contract spine in each shape, and the decision chain that drives it.
The scaffolded project's `docs/architecture/contract-spine.md` shows
the reader *their* composition; this doc is the contributor-facing
map of the mechanism itself.

## The trigger: language purity (decision 3)

The contract mechanism is gated by **language purity**, not by "is it
polyglot on the backend":

- **Implicit contract** (shared TS packages, no artifact) — only when
  the **entire build is TypeScript**: TS backend + (Expo mobile or no
  mobile).
- **Explicit contract** (`packages/contract` → OpenAPI, codegen for TS
  clients and server stubs) — **the moment any non-TS language enters
  the build**: Dart (Flutter), Go, or Python anywhere.

Flutter mobile alone forces the explicit contract, even with a TS
backend. A pure-TS microservices build stays implicit (decision 6).

## The mechanism per shape

### TS shapes (1, 2) — Hono RPC, implicit

In TS-only shapes the contract is **implicit** — shared TS types, no
artifact. The api framework is Hono (decision 18), so the contract
mechanism is **Hono RPC** (`hc<typeof app>()`): the router's TS type
*is* the wire contract, inferred end-to-end (inputs, outputs, error
shapes), no codegen, no separate source of truth to drift.

Decision 17 originally named tRPC as the implicit-contract mechanism;
decision 18's Hono choice fires the override — tRPC retreats to the
*general principle* ("the contract is inferred from the implementation,
not authored as an artifact"), instantiated here by Hono's native typed
RPC. Bolting tRPC onto Hono would be redundant: Hono already provides
the typed RPC tRPC would.

The spine's last hop: `api-client` is the **only door** into the api for
every web variant (decision 15) — a type error in the api is a compile
error in the web client (decision 22: type-inference *is* the contract
test in TS shapes).

### Go shapes (3, 4) — OpenAPI, explicit, Go-driven authorship

In polyglot shapes the contract is **explicit** — an `openapi.yaml` in
`packages/contract`, the only shared package. The api framework is
**Gin + Huma** (decision 19): operations are defined as typed Go
input/output structs on Gin routes; Huma validates at runtime *and*
generates the OpenAPI spec from those structs.

**Authorship flip (decision 19 revises decision 9):** the committed
`openapi.yaml` is **generated from the Go api's structs** during build
and **committed** — not hand-authored as a symmetric source of truth.
Go is the canonical side; TS/Dart clients are generated downstream from
the committed file. A spec change = regenerate-from-Go-and-commit before
clients can pick it up (a build step, not a free symmetric edit).

## The spine is the seam

In both mechanisms the contract is the **spine** — the thing that never
changes across variants. Backends and clients are swappable
implementations around it. The contract mechanism choice carries into
the scaffolded project's diagrams (decision 31): a Vite+TanStack+
TS-monolith scaffold gets a diagram labeled "your Hono RPC contract
spine"; a Next+Go-monolith scaffold gets one labeled "your OpenAPI
contract spine" — the mechanism is not a footnote, it's the headline.

## Extending the contract (the contributor's seam)

- **TS shapes:** add a route to the Hono router; `hc<typeof app>()`
  infers it end-to-end. No codegen, no artifact.
- **Go shapes:** add typed input/output structs to a Gin route; Huma
  regenerates the spec at build; regenerate and commit the spec; the
  committed file feeds the client codegen.

Bumping the mechanism itself (a new contract mechanism on the implicit
axis, or re-opening the Go-driven authorship) is a `contributing/` and
`standards/` playbook entry — see
[`../contributing/contract-mechanism.md`](../contributing/contract-mechanism.md)
and [`../standards/contract-mechanism.md`](../standards/contract-mechanism.md).
