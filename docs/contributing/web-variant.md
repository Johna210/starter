# Contributing: adding a new web variant

The playbook entry for extending the **web** axis of the five-axis
composition (decision 24) — "how to add a new web variant" (decision
15). Today's variants: **Next.js** (App Router, RSC) and **Vite +
React + TanStack Router + TanStack Query**. **TanStack Start** is
reserved as a variant to add once it's stable enough to anchor
(decision 15).

## The invariant the variant must satisfy

Decision 15's core commitment: **every web variant is a client over the
contract, and no variant bypasses the api.** No server actions reaching
the DB directly, no RSC fetch-to-DB, no web-side data path except
through the typed `api-client`. The swap Next↔Vite↔TanStack-Start
changes only the **rendering/routing shell**; the data path is
invariant. A variant that can't honor this (its native ergonomics
demand direct DB access) fails the review.

## What adding a variant touches

### 1. The CLI prompt

The web axis is a scaffold-time prompt (decision 15a). Adding the
variant means a new prompt option — with the composition predicate in
`composition.ts` (`is<Name>Web(c)`) and the default-web-variant
behavior kept intact (decision 24b: Vite+TanStack for TS shapes, Next
for Go shapes — the default is chosen *because of* the contract
mechanism).

### 2. The materializer

A new `materialize/web-<variant>.ts` (or a branch in `web.ts`)
materializing the workspace — see
[`../standards/cli-templates.md`](../standards/cli-templates.md). The
workspace is a peer app: it shares `packages/*` (TS shapes) or the
generated contract client (polyglot shapes).

### 3. The contract-mechanism integration

This is the axis's hard part. The variant consumes the contract via
`api-client`:

- **TS shapes (Hono RPC, implicit):** the variant types against the
  router via `hc<typeof app>()` — no codegen. The client shape is the
  same Hono RPC typed client `apps/web` and Expo `apps/mobile` share
  (decision 26).
- **Go shapes (OpenAPI, explicit):** the variant consumes the
  **generated TS client** from `packages/contract`.

A new variant does not change the mechanism — it *consumes* it. If the
variant's framework can't consume the existing mechanism, that's a
contract-mechanism bump (see `contract-mechanism.md` playbook), not a
variant change.

### 4. The `api-client` shape

The typed client must be used the way the variant renders:
Next.js uses it inside loaders / server components / server actions;
Vite+TanStack via TanStack Query; TanStack Start would use it in its
loaders. Storage of the access token differs only by rendering shell
(decision 16: in-memory in the SPA variant, forwarded from the incoming
cookie into the server-side client in the SSR variant).

### 5. The typed-RPC transport (decision 17b)

One rule, keyed to a runtime property: **batch by default; unbatch only
where batching would defeat server-side fetch memoization.** For a new
variant, the question is not "which link?" but "does this variant's
server context patch global `fetch` for per-request memoization?" —
see [`../architecture/typed-rpc-transport.md`](../architecture/typed-rpc-transport.md).

### 6. The test-pyramid coverage (decision 22)

The variant ships in the test pyramid the shape uses: unit tests for
its workspace, the compile-time contract (a type error in the api is a
compile error in the variant's client), and — for blessed combinations
— the one E2E over `items` through the variant's rendering shell. An
unblessed combination materializes with the "generatable but not
CI-tested" warning (decision 24).

### 7. The docs

The scaffolded-project docs templates (`docs.ts`) gain the variant's
composition-conditional docs (decision 31), and this repo's
`docs/architecture/` + `docs/contributing/` mirror the change.

## The bar

A new web variant is **generatable-anything first, blessed second**
(decision 24): the default is an unblessed materialize, and blessing it
(CI envelope) is a separate, heavier step — see the
`blessed-combination.md` playbook.
