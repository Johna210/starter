# CONTEXT — Starter (fullstack project starter, sometimes including mobile)

A living glossary of the domain language for this project. Updated inline as
decisions crystallize.

- **Contract** — the API agreement between apps. Either *implicit* (shared TS
  packages, no artifact) or *explicit* (an OpenAPI file in `packages/contract`,
  the source of truth for codegen). The contract is the spine of a scaffolded
  project; everything else is an implementation around it.
- **Contract authorship — Go-driven, not symmetric-authored** (polyglot shapes
  3 & 4): the OpenAPI file in `packages/contract` is **generated from the Go
  api's structs** (via Huma + Gin during build) and **committed** as the seam
  artifact — *not* hand-authored as a symmetric source of truth. The committed
  `openapi.yaml` is still the agreed boundary TS/Dart clients are generated from
  (the spine survives); what changes is *who writes it:* Go is the canonical
  side, clients are downstream. So a spec change = regenerate-from-Go-and-commit
  before TS/Dart clients can pick it up (a build step, not a free symmetric
  edit). [Revises decision 9 in the polyglot sub-bullets below.]
- **Contract mechanism** — *how* the implicit contract is realized mechanically
  in the TS shapes. **Realized: Hono RPC (`hc<typeof app>()`)** — because the api
  framework is Hono (decision 18), Hono's native typed RPC is used, *not* tRPC;
  bolting tRPC onto a framework that already has typed RPC would be redundant.
  The router/app's TS type is the contract, inferred end-to-end by `apps/web`'s
  `api-client`, no artifact, no codegen. (tRPC remains the *general principle*
  — "the contract is inferred from the implementation, not authored as an
  artifact" — that Hono RPC instantiates here.)
- **Typed-RPC transport (batch-by-default, unbatch-where-memoization-defeated)** —
  one rule keyed to a runtime property: batch by default; unbatch only where
  batching would defeat server-side fetch memoization (Next's RSC/loaders — the
  only such context in the starter's variants today). The mechanism is Hono
  RPC over HTTP (not tRPC's `httpLink`/`httpBatchLink` link system), but the
  same rule applies: the unbatch fires on a verifiable property (server-side
  fetch patching for per-request memoization), not on a variant label, so it
  extends to future variants (e.g. TanStack Start) by checking the same
  property.
- **Spine** — the contract. The thing that never changes across variants.
  Backends and clients are swappable implementations around the spine.

- **Split-seam** — in microservices shapes, the internal structure of
  `apps/api` that makes it *able* to split: internal modules with explicit
  interfaces, a router mounting them at prefixes, shared packages or the
  contract as the inter-service boundary. Present whether or not a split has
  happened yet.
- **Modular monolith** — the monolith shapes (1, 3) ship `apps/api` with the
  *same* internal-module structure as the microservices split-seam
  (`internal/{auth,items}` modules with explicit interfaces, router mounting
  them at `/auth`, `/items` prefixes). The *only* difference from a
  microservices shape is that the example split (decision 10) hasn't happened
  — auth is still an `internal/auth` module, not a separate deployable. So a
  monolith is literally "a microservices shape that hasn't split," and the
  monolith→microservices upgrade is a *seam-preserving extraction* (copy the
  example split), not a refactor-then-copy. [Names exactly what decision 10's
  "present whether or not a split has happened yet" already promised.]
- **Example split** — the single demonstrated extraction of one module from
  `apps/api` into a sibling `apps/api-*`, proving the split-seam is real (not
  theoretical) and teaching the copy-paste pattern. The user's own later splits
  follow it.
- **Capability split** — the axis the example split divides along: a
  *cross-cutting capability* every project has (auth/IAM), not a business
  domain. Teaches "carve out a separable concern as its own service" without
  imposing the user's business decomposition.
- **Wrap, not replace** — the example `apps/api-auth` is a deployable service
  that *wraps* `packages/auth` (the canonical auth implementation shared across
  both TS shapes 1 & 2), it doesn't replace it. The service owns the
  minting/login/register endpoints; `apps/api` imports `packages/auth` directly
  to verify tokens locally — no network hop for verification. The package is
  the library; the service is one deployable surface over part of it.
- **Sole minter invariant** — across *every* shape, exactly one process is
  configured to mint tokens: `apps/api` in monolith shapes (1, 3) and
  `apps/api-auth` in microservices shapes (2, 4). Every *other* service holds
  only public-key material — it can verify, never sign. The mechanism for
  distributing the public half differs by shape: a shared TS package import in
  shape 2 (`packages/auth` verify functions) and a fetched-and-cached JWKS
  document in shape 4 (public keys served at a contract-defined endpoint). The
  mechanism differs; the invariant is identical, and it matters more than the
  A/B/C mechanism choice that produced it.
- **Local-verify principle** — verification of an incoming token never costs a
  network hop on the request path. In shape 2 the verify function runs in-process
  via `packages/auth`; in shape 4 `apps/api` fetches `apps/api-auth`'s JWKS,
  caches it on a TTL, and verifies every signature locally against the cached
  key. `GET /verify` introspection (a per-request hop to `api-auth`) is
  explicitly *not* the pattern — its failure mode (hard-down on every request
  if `api-auth` is unreachable) is the opposite of local-verify's.
- **Mobile-auth flow (secure storage + Bearer, body-refresh)** — both mobile
  variants (Expo in TS shapes, Flutter in polyglot shapes) authenticate with
  **tokens in OS-managed secure storage** (`expo-secure-store` / `flutter_secure_storage`),
  not cookies: the access token is attached as a Bearer header; on 401 the
  client calls `/refresh` with the refresh token in the **body** (not a cookie)
  and swaps. `apps/api-auth`'s `/login` returns both tokens in the response body
  to mobile clients (web gets cookies *additionally*, mobile just doesn't use
  them). Secure storage is the platform-native mitigation — not a downgrade the
  way it would be on web. [Adds a body-only / cookie-also fork to `api-auth`'s
  endpoints, but does **not** broaden the auth shim's scope (decision 12) —
  OAuth/PKCE stays fenced as "wire it in: here's the seam" for a full app.]
- **Auth shim** — the depth of auth the starter ships: a *thin typed layer*
  over vetted upstream libraries, not a from-scratch implementation and not a
  stub. The starter owns the surface (token shape, argon2 params, the four
  endpoints, refresh rotation) but **not** the crypto — that lives in audited
  libraries. Everything beyond the shim's scope is fenced off as "wire it in:
  here's the seam," not silently absent. **OAuth/PKCE is one of the fenced
  items** — the starter ships mobile auth via secure storage + Bearer
  (decision 23), and a full app graduates to OAuth/PKCE by wiring it in at the
  seam, not by the starter shipping it.
- **Demo domain** (`items`) — the single trivial, explicitly-disposable
  resource the scaffolded project ships to prove the plumbing composes
  end-to-end. One migration, one table, one api route, one web page, protected
  by auth. The name `items` is chosen to signal "you will delete this" — it's a
  *proof the stack works*, not an imposed business domain. Demos `packages/db`
  (a real schema), the contract surface (a real operation), and gives the
  example split's "main api keeps the core" a concrete core to keep.
- **AI primitives, not AI products** — the AI layer ships *composable
  primitives* (chat completion with streaming, embeddings, a `VectorStore`
  interface with a pgvector default in TS, tool/function calling), each a thin
  typed shim over a vetted SDK — *not* an assembled "what AI is for."
  Composing them into a product (RAG = embeddings + vector store + chat;
  recommendation = embeddings + similarity; agentic = chat + tools) is the
  *user's* job, project-by-project — because AI's shape varies per app in a
  way that isn't an enumerable scaffold-time radio button (unlike web
  variants). Same principle as the capability split (decision 10): the starter
  owns the seams/primitives, the user owns the composition. Polymorphic across
  shapes per decision 5 (TS library in `packages/ai`; embedded Go module; Python
  service in Go-microservices). **No example composition shipped** — AI is
  opt-in and varies per app, so a demo would impose "AI is a thing this project
  does" on projects that don't, the same sin `apps/api-users` would have
  committed. (Contrast: auth *is* always-used, so decision 10's example split
  demonstrates it honestly.)
- **AI toggle (CLI-prompt opt-in, like mobile)** — AI is **not** scaffolded-in
  by default; the CLI asks "include AI?" alongside "include mobile?" (decision 4).
  If no, `packages/ai` (TS) / the embedded module (Go monolith) / the Python
  service (Go microservices) is **absent** from the scaffolded project, not
  present-but-unused — a non-AI project carries zero AI dependency surface.
  [Revises decision 5: "always available" now means "always available as a
  prompt option," not "always materialized."] Retro-adding AI later is a
  documented copy-from-README pattern, mirroring decision 10's "copy the
  example split" pedagogy.
- **Test pyramid (unit + contract + one E2E)** — three levels, each exercising
  a different class of seam. *Unit* tests prove the **modules** (decision 14's
  repo layer, decision 12's auth shim, decision 20's AI primitives). *Contract*
  tests prove the **spine** (decisions 3/9/17/19): in TS shapes the Hono RPC
  type-inference is checked at compile time (`api-client` typed against the
  router — a type error *is* a contract test), plus runtime contract tests
  hitting each route over HTTP and asserting the response shape; in polyglot
  shapes contract tests validate the committed `openapi.yaml` against the
  running server (schema validation per route). *E2E* — exactly **one**, the
  `items` flow (decision 13) booted via Taskfile + driven through a real
  browser (Playwright): create an item via the web UI, see it in the list,
  verify it persisted across web→api→db. The one E2E proves the *composition*
  the `items` demo exists to demonstrate (decision 13's promise made
  automated, not manual). **One-E2E-only discipline** (mirrors decision 10's
  "one example split"): the starter owns exactly one E2E, the `items` flow,
  and documents "add your own per feature" — a line against E2E creep.
- **DB layer (Drizzle, native migrations)** — `packages/db` (TS shapes) and
  the equivalent in each Go backend (polyglot shapes) ship a configured
  Drizzle client + **Drizzle-native migrations**: the **TS schema is the single
  source of truth**, `drizzle-kit generate` emits versioned SQL into a
  `migrations/` dir, `drizzle-kit migrate` applies them. Production-ready,
  versioned, and — because schema-as-TS *is* the shared typed workspace `apps/api`
  imports — the strongest expression of the implicit-contract thesis (decision 3).
  Note: migrations are a Drizzle artifact; the **ORM-swap seam is not the
  migration history** (it stays, as already-applied SQL) **but the repo layer
  inside `apps/api`** that wraps Drizzle. When an ORM changes you rewrite the
  repo layer, not re-migrate.
- **Web app variant** (scaffold-time variant selected by CLI prompt, alongside
  mobile yes/no and monolith/microservices & TS/Go) — `apps/web` is **not** a
  fixed default. Today the variants are **Next.js** and **Vite + React +
  TanStack Router/Query**; **TanStack Start** is added as a variant once it's
  stable enough to anchor. The CLI materializes one `apps/web` in the chosen
  style. Matches decisions 1 & 10: web is a *swappable peer app*, not a fixed
  default.
- **`api-client` (the single shared web->api data path)** — a typed client
  (in TS shapes, generated from the implicit contract / shared TS types;
  conceptually the web's handle on the contract) that **every** web variant
  uses. Next.js reaches the api through it inside loaders/server components;
  the Vite + TanStack variant uses it via TanStack Query; TanStack Start would
  use it in its loaders. **No web variant bypasses the api** — no server
  actions reaching the DB directly, no RSC fetch-to-DB, no web-side data path
  except through `api-client`. Makes the implicit-contract thesis (decisions 3 & 9)
  real at the web layer the same way Drizzle made it real at the DB layer.
  The swap Next↔Vite↔TanStack-Start changes only the rendering/routing shell;
  the data path is invariant. **Owns transparent token refresh-on-401**: when
  an api call 401s, `api-client` calls `/refresh` and retries, so refresh is a
  property of the client, not bespoke per web variant.
- **Web-auth flow (httpOnly refresh cookie + short-lived access token; uniform
  across variants)** — the one auth model both web variants share, so the swap
  (decision 15) stays true to "rendering shell only." `apps/api-auth` sets an
  **httpOnly refresh cookie** + returns a short-lived **access token** in the
  response body. `api-client` attaches the access token as a Bearer header to
  api calls; in the SPA variant it lives in memory; in the Next SSR variant
  it's forwarded from the incoming cookie into the server-side `api-client`.
  Refresh-on-401 is handled inside `api-client` (calls `/refresh`, which
  re-reads the httpOnly cookie). httpOnly protects the refresh token from XSS;
  the access token is briefly readable by XSS during its short life — the
  standard, accepted JWT tradeoff. **Scope: web variants only** (decision 16);
  mobile has its own flow (decision 23) — the two are legitimately different
  auth architectures for legitimately different runtimes, not an inconsistency.
- **Doc convention (README + /docs/, mirrored in scaffolded and Starter repos)** —
  the starter ships a `/docs/` tree in *both* the scaffolded project and the
  Starter repo. Each `/docs/` tree contains `architecture/` (Mermaid diagrams
  of the spine and seams: blessed 2×2, contract spine, split-seam, modular
  monolith, auth subtree, typed-RPC transport), `wire-it-in/` (the fences
  from decisions 12 and 20 turned into a *convention* the scaffolded project
  inherits — email-verify, MFA, OAuth; composing AI primitives), and `adr/`
  (the convention the scaffolded project uses to record its *own* future
  architecture decisions — `apps/ai-*` extractions, `packages/*` additions —
  extending the ADR pattern this Starter uses internally in `CONTEXT.md`).
  The README in each repo is the entry point; `/docs/` is the deep reference.
  The recursion (a contributor who learns the structure in the Starter repo
  finds the same structure in the scaffolded project) is paid back as
  discoverability.
- **Auto-filled docs (CLI composes both code and docs from the five axes)** —
  the CLI's materializer owns *both* which workspaces and which docs are
  written, parameterized by the same five-axis composition (decision 24).
  Composition-specific `architecture/` Mermaid (e.g., "your Hono RPC contract
  spine" vs "your OpenAPI contract spine" — decisions 17/19), composition-
  conditional `wire-it-in/` (AI fences only appear when AI is on, decision
  21), `adr/` empty (the user grows it). The Starter repo's `/docs/` is
  hand-curated, contributor-facing, and changes as decisions are added.
- **Standards & practices subdir (`docs/standards/`)** — the starter's
  *how* docs, separate from the *what/why* in `architecture/`, `wire-it-in/`,
  and `adr/`. Holds three sub-docs: per-language **code style** (Biome /
  golangci-lint / ruff — the *why* of decision 29's choices, pointing at the
  configs); per-seam **best practices** (how to add a module to `internal/*`,
  how to extend the contract, how to do the `apps/ai-*` extraction per
  decision 5, how to add a new web variant per decision 15); and
  **anti-patterns** — a "don't do this" list drawn from the rejected options
  across all decisions, a unique asset this starter has accumulated that
  generic code-style guides don't have. Mirrored per decision 30; auto-filled
  per decision 31 in the scaffolded project; hand-curated in the Starter repo.
- **Demonstrate-then-name README (scaffolded project)** — the scaffolded-
  project's auto-generated README (decision 31) **demonstrates the spine by
  running the `items` flow first** (decision 13 — the only thing the starter
  proves works end-to-end, decision 22), then a "what you just saw" section
  *names* the architecture (Hono RPC or OpenAPI contract spine, modular
  monolith, auth shim), then the seams ("where to extend"), then the
  upgrade paths ("how to grow"). The handoff's "demonstrating" verb is
  literal: the README *runs* the spine, then *names* it, so the spine is
  experienced before it's abstracted. A quickstart that *is* the spine
  demonstration, not a parallel track beside it.

## Core concepts

- **Starter** — the thing being built: a reusable starting point for new
  fullstack projects. Not a library, not an app — a *generator of projects*.
- **Scaffold** (verb) — the act of producing a new project from the Starter.
- **Scaffolded project** — a concrete project produced by scaffolding. What a
  user ends up with and then builds on.
- **CLI** — the scaffolder itself. Run as `npx create-…`. Treats the Starter
  as a small product with prompts, variants, and its own tests. **A separate
  application from the scaffolded project** — invoked once to generate, then
  the user walks away; the scaffolded project never depends on or imports the
  CLI. Owns the question "which workspaces do I materialize?" Composes five
  prompt axes — backend-language (TS/Go), topology (monolith/microservices),
  web variant (Next/Vite/TanStack-Start-later), mobile (Expo/Flutter/none),
  AI (on/off). Policy: **generatable-anything, CI-blessed-4** (decision 24).
  **Built in TypeScript**, lives in the Starter's pnpm monorepo (one toolchain,
  decision 8's JS spine); invoked via `npx create-…` — the canonical JS-
  ecosystem scaffolder invocation (no Node-free binary distribution; the
  `npx` invocation presumes Node, which is a no-brainer for the TS shapes and a
  mild prereq for Go shapes, accepted for the single-toolchain + canonical-
  lifecycle win). Built as a **custom Node CLI** — `@clack/prompts` for prompt
  UX + a hand-rolled materializer that reads the five-axis composition
  (decision 24) and writes workspaces per structural rules; TS templates can be
  imported as values / type-checked, not embedded as bytes (decision 25b).
- **Blessed combination** — one of the 2×2 {monolith, microservices} ×
  {TS, Go} combos that is **fully CI-tested** (unit + contract + the one E2E
  over `items`, decision 22). The four blessed combos carry a default web
  variant each (decision 24). Anything else the CLI can compose is
  **generatable but not CI-tested** — produced with a documented "untested"
  warning, no E2E guarantee.
- **Workspace** — a unit within a scaffolded monorepo. Either an **app**
  (`apps/*`) or a **package** (`packages/*`). Apps depend on packages;
  packages never depend on apps.
- **App** — a deployable workspace: `apps/web`, `apps/api`, `apps/mobile`
  (mobile optional). Apps are peers; no app is the "real" one.
- **Package** — shared, non-deployable code consumed by one or more apps:
  e.g. `packages/db`, `packages/auth`, `packages/shared`.
- **`packages/shared` (validation schemas + pure utils only, TS shapes)** —
  holds **shared zod schemas** (reused by both `apps/api` for input validation
  and `apps/web` / `apps/mobile` for form validation) and **pure-function utils**
  (date formatting, etc.) that genuinely cross apps. Does **not** hold domain
  types/DTOs: those come from the Hono RPC contract itself, inferred by
  `api-client`, which both `apps/web` and `apps/mobile` (Expo) use — so web and
  mobile type against the api router via the same client, not against a
  shared-types library. "Shared" means "literally imported by ≥2 apps and
  isn't part of the inferred contract."
- **Typed config (zod-validated `config.ts` per workspace, dev/prod loader
  split)** — each workspace that needs config (`apps/api`, `packages/db`,
  `apps/api-auth`, `apps/mobile`, `packages/ai` when scaffolded) ships a
  `config.ts` that defines a zod schema for the env vars it needs and exports
  a typed `config` parsed from `process.env` — fail-fast on missing/invalid at
  startup, typed access everywhere. **Code never reads `process.env`
  directly** — always through the typed `config`. Dev loads vars via `.env` +
  `dotenv` (git-ignored, with a committed `.env.example` documenting the
  surface); prod uses **real env vars** (the deploy platform's secret
  management — Vercel/Cloudflare/Fly/etc. inject them). Both loaders fill
  `process.env`, so the typed `config.ts` doesn't care which one ran —
  single *logical* source, two *loaders*, equivalent to the code.
- **Quality toolchain (per language, one-tool discipline)** — **Biome**
  (TS — lint + format, one tool, replaces ESLint+Prettier); **gofmt +
  golangci-lint** (Go — consensus, no real fork); **ruff** + `ruff format`
  (Python — shape 4 AI service — one tool, replaces Black+isort+Flake8).
  Parallels decision 8's "one orchestrator" discipline: refuse two tools when
  one does the job.
- **CI runner (GitHub Actions, matrix over the 4 blessed combos)** — OSS-
  default; matrix strategy runs unit + contract + the E2E over `items`
  (decision 22) on each of the 4 blessed combinations (decision 7/24). Mobile
  is part of the blessed matrix (web + mobile tested; AI is not — see
  decision 29).

## Decisions locked

1. **Form of the Starter:** a CLI scaffolder (not a static template, not a
   kitchen-sink clone). Variants — especially mobile yes/no — are selected via
   prompts.
2. **Shape of a scaffolded project:** a monorepo with workspaces
   (`apps/*` + `packages/*`). Mobile, when included, is a peer **app**
   workspace sharing `packages/*` with web and api — never a bolt-on.
3. **Contract-first spine, gated by language purity:**
   - *Implicit contract* (shared TS packages, no artifact) **only when the
     entire build is TypeScript** — TS backend + (Expo mobile or no mobile).
   - *Explicit contract* (`packages/contract` -> OpenAPI, with codegen producing
     TS clients and server stubs) **the moment any non-TS language enters the
     build** — Dart (Flutter), Go, or Python anywhere.
   The trigger is language purity, not "is it polyglot on the backend." Flutter
   mobile alone forces the explicit contract, even with a TS backend.
4. **Mobile default is Flutter.** Expo (React Native) is used only when the
   stack is fully TypeScript (so mobile can share packages) *or* when Expo is
   specifically requested. Flutter is a peer app that shares *only* the
   contract, never TS packages.
5. **AI capability is always available *as a prompt option*; its delivery
   shape and language track the backend.** [Revised by decision 21: "always
   available" means "always available as a CLI-prompt option," *not* "always
   materialized in every project." AI is opt-in like mobile (decision 4); if
   the prompt is declined, the AI workspace/module/service is absent, not
   present-but-unused.]
   - *Shape:* an **embedded module** inside a monolith; a **separate service**
     under microservices. So a distinct deployable "AI service" only exists in
     microservices mode — in a monolith, AI lives inside the monolith.
   - *Language:* **AI language follows the backend language in all shapes.**
     TS backend -> TS AI; Go backend -> Go AI. The single exception is
     **Go-microservices**, where the separate AI service is **Python/FastAPI**
     — justified by Python's AI ecosystem advantage once the build is already
     polyglot. (Go can host embedded AI fine: go-openai, langchaingo, etc.)
6. **Microservices can be TypeScript too.** A pure-TS build — even
   microservices — stays on the *implicit* contract (shared packages). The
   explicit OpenAPI contract fires only when Go or Python enters the build.
7. **Blessed combinations** (CI-tested as units) form a 2x2 of
   {monolith, microservices} x {TS, Go}, with AI as an optional add-on whose
   shape+language follow the backend, and mobile as a free delete-the-folder
   toggle:
   1. TS-monolith        | web = Vite+TanStack | Expo/none | implicit | AI = embedded TS module
   2. TS-microservices   | web = Vite+TanStack | Expo/none | implicit | AI = separate TS service
   3. Go-monolith        | web = Next           | Flutter/none | OpenAPI   | AI = embedded in Go
   4. Go-microservices   | web = Next           | Flutter/none | OpenAPI   | AI = Python/FastAPI service
   The default web variant per shape (decision 24b): **Vite+TanStack for TS
   shapes** (the variant where Hono RPC's inferred types are consumed natively
   by TanStack Query/Router — the contract mechanism's strength); **Next for Go
   shapes** (where the contract is OpenAPI and the web client is codegen-
   derived, Next's RSC gives a server-rendering default that doesn't fight an
   inferred router — there isn't one). Other web variants are generatable
   (decision 24) but not in the CI-tested envelope.
   Unblessed hybrids (e.g. TS-backend + Flutter, Go + Expo, AI service without
   microservices) may be generatable but are not CI-tested.
8. **Monorepo tooling:** pnpm workspaces for the JS spine (no Turborepo, no
   Nx), plus a single root orchestrator that fans out cross-language tasks
   (`dev`, `test`, `build`) to pnpm, `go run`, `uvicorn`, etc. One orchestrator
   works across all languages; JS-only tools (Turborepo) are useless in polyglot
   shapes, so they're out. The orchestrator is **Taskfile** (`task`), chosen for
   cross-platform (native Windows) support, readable YAML `deps:`/`cmds:` that
   model contract-then-run pipelines, and no tab/shell footguns. Cost: a single
   static-binary prerequisite (`go-task`), documented as a one-line install.
9. **Workspace layouts:**
   - *Implicit-contract TS shapes (1, 2):* `packages/{db,auth,shared,ai}` are
     real TS workspaces imported by `apps/{web,api,mobile?}`. No contract
     artifact. (Shape 2 splits `apps/api` into `apps/api-*` microservices.)
   - *Explicit-contract polyglot shapes (3, 4):* `packages/contract` is the
     **only** package — `openapi.yaml` + generated TS/Dart clients + Go/Python
     server stubs. No `packages/db` or `packages/auth` shared across
     languages; each backend owns its own. The contract is the seam.
     *Authorship (revised by decision 19):* `openapi.yaml` is **generated
     from the Go api's structs** via Huma+Gin at build time and **committed**;
     clients (TS/Dart) are generated from the committed file. Go is the
     canonical side, not a symmetric authored spec.
   - *Mobile* is always a free delete-the-folder toggle; `apps/mobile` (Expo or
     Flutter) is absent when "no mobile."
10. **Microservices scaffolding (shapes 2 & 4):** one `apps/api` with a clean
    **split-seam** (internal modules + explicit interfaces + router prefixes),
    plus a single **example split** that extracts one module into a sibling
    `apps/api-*` to demonstrate the pattern. The user carves their own domains
    by copying the example. No premature N-service decomposition; no monolith-
    plus-README bait-and-switch.
    - **Axis of the example split:** a **capability split** — the example
      extracts `apps/api-auth` (a cross-cutting IAM capability, present in
      every project), not a read/write CQRS split and not a business domain
      like `apps/api-users`. Capability splits are real *and* domain-neutral
      (no project is "an auth project," but every project has auth), so the
      example demonstrates the cut mechanics without imposing the user's
      business decomposition.
    - **Wrap, not replace (TS shape 2):** `apps/api-auth` *wraps*
      `packages/auth`; it does not replace it. `packages/auth` remains the
      canonical auth implementation shared across **both** TS shapes (1 & 2)
      and includes verification logic (token verify/decode). The service owns
      only the minting/login/register HTTP surface; `apps/api` verifies tokens
      locally via the package import — no network hop for verification. The
      example split teaches the seam (separate deployable, HTTP boundary,
      contract surface for the issuing endpoints) without forcing a shared-key
      scheme or diverging shape 1 from shape 2 on auth implementation.
    - **Verify via cached JWKS (polyglot shape 4):** no shared `packages/auth`
      exists across languages, so the wrap pattern can't apply unchanged.
      `apps/api-auth` serves its public key material at a contract-defined
      JWKS endpoint; `apps/api` fetches it, caches it on a TTL, and verifies
      every request's signature locally against the cached key. The contract
      is the only seam — auth logic lives in one service, everyone else reaches
      it via the contract, with cached keys making request-path verification free
      after warmup. Three options explicitly rejected:
      *- introspection* (`GET /verify` per request) — opposite failure mode &
      latency profile from shape 2's local-verify, contradicting the principle
      already locked for shape 2; *- duplicated Go verify/decode logic* in
      `apps/api` (the footgun branch of what looked like a separate "A"
      option — two independent copies of JWT-verification drifting apart over
      time); *- HS256 shared secret* — a worse crypto default to hand new
      projects, and "it's config not code" is a technicality, not a real
      difference in coupling (a leaked env var *is* a leaked signing key).
11. **Sole minter invariant (cross-shape, supersedes the per-shape mechanism):**
    across every shape, exactly one process holds the private signing key —
    `apps/api` in monolith shapes (1, 3), `apps/api-auth` in microservices
    shapes (2, 4). Every other service holds only public-key material: it
    can verify, never sign. This invariant is identical across shapes and is
    more important for a reader to notice than the mechanism that realizes
    it. The mechanism distributing the public half differs by shape: a *shared
    TS package import* (`packages/auth`'s verify functions, in-process) in
    shape 2; a *fetched-and-cached JWKS document* in shape 4 (public keys at
    a contract-defined endpoint, cached on a TTL, verified locally). In both
    cases verification on the request path is local — no introspection hop.
    See decision 10's per-shape sub-bullets for the concrete mechanics.
12. **Auth implementation depth — an auth shim, not real, not stub.** The auth
    the starter ships (as `packages/auth` in TS shapes, the embedded auth
    module in monolith shapes, and `apps/api-auth`'s implementation in
    microservices shapes) is a **thin shim** over vetted upstream libraries:
    *•* **In scope:** password hashing (argon2id via `@node-rs/argon2`-class
    libs — `golang.org/x/crypto/argon2` in Go), JWT issue/verify (via
    `jose`-class libs), refresh-token rotation, and the four HTTP endpoints
    (`/login`, `/register`, `/refresh`, `/logout`). Argon2 params and token
    shapes are *opinions the starter owns*.
    *•* **Fenced off** (explicitly "wire it in; here's the seam," not silently
    absent): email verification, password reset, MFA, account lockout, social /
    OAuth, RBAC beyond a single authenticated principal.
    Rejected:
    *• A ("genuinely real minimal auth") — collapses on contact: real auth
    has no minimal, and shipping it makes the starter a *maintained auth
    framework* (every CVE, every rotation bug lands forever).
    *• C ("documented stub") — the same bait-and-switch rejected at the
    architecture level in decision 10 (a real seam wrapping a fake capability
    is theater); if C were right, decision 10's example split would be wrong
    too.
13. **The scaffolded project ships one disposable demo domain, `items`.**
    A single trivial resource exercises the whole stack end-to-end on day one:
    one migration + `items` table, `GET/POST /items` on the api (protected by
    auth), a web page listing & creating items, and (in polyglot shapes) `Item`
    defined in the contract. Purpose: prove the plumbing composes (boot ->
    log in -> create an item -> see it) rather than ship a bootable shell with
    an empty app, which is the same bait-and-switch rejected in decision 10
    applied one layer down. `items` is explicitly disposable — the name signals
    "delete this and build your thing," a 5-minute job not a refactor. It also
    gives the example split's "main api keeps the core" (decision 10) a concrete
    core to keep, and exercises `packages/db` with a real schema so the db
    seam is shown working, not asserted. Rejected: *A (plumbing-only bootable
    shell)* — real seams wrapping an empty app; *C (auth-is-the-demo, no `items`)*
    — too thin to exercise `packages/db` or the "core api" separately from auth,
    collapsing back toward A.
14. **DB layer — Drizzle, native migrations, single source of truth is the TS
    schema.** `packages/db` (TS shapes 1 & 2) ships a configured Drizzle client
    (`drizzle-orm` + a `pg` pool) and **Drizzle-native migrations**: the
    Drizzle TS schema is the single source of truth, `drizzle-kit generate`
    emits versioned plain-SQL files into `packages/db/migrations/`, and
    `drizzle-kit migrate` applies them against the configured database. The
    `items` demo ships as one typed `itemsTable` schema + one generated
    migration applying it. Reasoning: schema-as-TypeScript — importable by
    `apps/api`, typed end-to-end, no artifact, no separate codegen step — is
    the strongest expression of the implicit-contract thesis (decision 3),
    and Drizzle's schema DSL is TS itself, so it fits the shared-workspace spine
    (decision 9) cleanly (unlike Prisma's non-TS schema + generated client).
    The ORM-swap concern is **not** solved at the migration layer: migrations
    are a Drizzle artifact, and that's accepted because the migration history
    (already-applied SQL) is not re-done when an ORM changes — the **swap-point
    is the repo layer inside `apps/api`** that wraps the Drizzle client; a
    future ORM swap rewrites that layer, not the schema history. Rejected:
    *• A (raw `pg` driver + standalone migration runner)* — leaves the data
    layer untyped, undercutting the typed-TS-spine reason the implicit-contract
    path exists.
    *• C (Prisma)* — non-TS schema language and a generated per-app client
    fight the shared-real-workspace model (decision 9); heaviest runtime of the
    three.
    *• B2 (ORM-agnostic runner, hand-authored SQL as source of truth, Drizzle
    schema maintained alongside)* — would honor "migrations outlive the ORM,"
    but introduces a dual source of truth (SQL migration + Drizzle TS schema)
    kept in sync by hand; rejected once the user clarified that the real
    swap-point for "ORMs may differ" is the repo layer in `apps/api`, not the
    migration history.
    *• B3 (ORM-agnostic runner + introspected-from-DB Drizzle schema via
    `drizzle-kit pull`)* — most elegant on paper (single source of truth *and*
    ORM-independent migrations) but inverts the workflow to migrations-first
    and leans on the weaker half of Drizzle's tooling; not anchor-worthy for a
    starter audience.
15. **Web app is a scaffold-time variant, and every variant is a client over
    the contract.** Two sub-decisions, locked together because the first is
    meaningless without the second:
    - **(a) `apps/web` is a CLI-prompt variant**, not a fixed default.
      Variants today: **Next.js** (App Router, RSC) and **Vite + React +
      TanStack Router + TanStack Query** (no meta-framework, plain client over
      the contract). **TanStack Start** is reserved as a variant to add once
      it's stable enough to anchor (the user wants to test it post-stability).
      Matches the starter's "swappable peer apps" thesis (decisions 1, 10) —
      the user builds different fullstack app styles and picks the web shape per
      project.
    - **(b) One shared typed `api-client`; no variant bypasses the api.** Every
      web variant reaches `apps/api` through a single typed `api-client`
      (generated from the implicit contract in TS shapes). Next.js uses it
      inside loaders / server components / (if used) server actions; the Vite +
      TanStack variant uses it via TanStack Query; TanStack Start would use it
      in its loaders. **No web variant bypasses the api** — no server actions
      reaching the DB directly, no RSC fetch-to-DB, no web-side data path except
      through `api-client`. Reasoning: this is decisions 3 & 9 made real at the
      *last hop* — the same move Drizzle made real at the DB layer (decision 14).
      Without it, "swappable web variants" is two different architectures that
      happen to share types (Next with server-actions-to-DB quietly contradicts
      the spine); with it, the swap Next↔Vite↔TanStack-Start changes only the
      rendering/routing shell and the data path is invariant. The cost — Next
      gives up some native ergonomics (no fetch-to-DB-in-components) — is the
      price of being in a spine-honest starter, paid because the swap is the
      whole reason the variant exists. Rejected: *Option i (each variant native;
      the contract is just shared types)* — real "swappable" only if variants
      share a seam, not just a `tsconfig`; letting Next be Next-with-DB-access
      makes it a different project, not a swap.
16. **Web->api auth flow — httpOnly refresh cookie + short-lived access token,
    uniform across both web variants.** `apps/api-auth`'s `/login` sets an
    **httpOnly refresh cookie** and returns a short-lived **access token** in
    the body. `api-client` (decision 15) attaches the access token as a Bearer
    header to api calls; on 401 it transparently calls `/refresh` (which
    re-reads the httpOnly cookie) and retries — refresh is a property of the
    client, not bespoke per variant. Storage of the access token differs only
    by rendering shell (the one thing the swap is allowed to change): in-memory
    in the SPA (Vite) variant; forwarded from the incoming cookie into the
    server-side `api-client` in the Next SSR variant. Reasoning: decision 15's
    invariant is that the web-app swap changes only the rendering shell — A is
    the only auth flow where that's true, since both variants use the same
    cookie/header split, the same `api-client` refresh logic, differing only
    in where the access token sits during a render cycle. httpOnly protects the
    refresh token from XSS; the short-lived access token is briefly readable by
    XSS during its lifetime — the standard, accepted JWT tradeoff (the same
    surface B/C pay once you look past their extra machinery). Rejected:
    *• B (server-side encrypted session cookie, Next-only)* — browser-never-
    sees-a-JWT is stronger XSS-wise, but the variants authenticate *differently*,
    so the swap is no longer "rendering shell only" — it breaks decision 15;
    also needs a session store *beyond* the auth shim's fenced scope (decision 12).
    *• C (BFF: `apps/web` proxies api calls, holds tokens server-side, Next-only)*
    — same divergence as B, plus makes `apps/web` a real BFF not a thin client,
    a *different architecture* than "web is a client over the contract," arguably
    contradicting decision 15.
17. **Implicit-contract mechanism — tRPC by default; Hono-override if Hono is
    the api framework.** In TS shapes (1 & 2) the implicit contract is realized
    by **tRPC** by default: `apps/api` defines a tRPC `appRouter`; `apps/web`'s
    `api-client` is `createTRPCProxyClient<typeof appRouter>`, so the router's
    TS type *is* the wire contract — inferred end-to-end (inputs, outputs, error
    shapes), no artifact, no codegen, no separate source of truth to drift.
    This is the literal realization of decisions 3 & 9's "the contract is shared
    TS, no artifact" claim, the same way Drizzle realized it at the DB layer
    (decision 14) and `api-client` realized it at the web layer (decision 15).
    The contract-is-tRPC-shaped-not-abstract cost is the *right* cost in the
    TS-only shapes: by definition (decision 3) there's no non-TS client to
    serve in shapes 1 & 2, and the explicit OpenAPI contract for polyglot shapes
    3 & 4 is a *different project shape* re-authored for that reality — not a
    failure of the implicit path.
    **Override (coupled to decision 18):** if the chosen api framework is
    **Hono**, prefer **Hono's own RPC** (`hc<typeof app>()` — same type-inference
    as tRPC, native to Hono, no competing runtime bolted on) or **Hono +
    zod-openapi** (type-inference *plus* latent OpenAPI emission — the only
    option that gives a continuity path from the implicit contract to the
    explicit one). Bolting tRPC onto Hono is redundant: Hono already provides
    the typed RPC tRPC would, so the contract mechanism *tracks* the api
    framework choice.
    Note: tRPC (and Hono RPC) do **not** reopen decision 15's "no web-bypass"
    rule — `apps/api` is always a separate deployable from `apps/web`, so even
    Next calling the typed client from an RSC server component goes over HTTP
    through the same `api-client`. No in-process shortcut exists; the contract
    stays the only door.
    Rejected: *• D (codegen from route types)* — reintroduces an artifact, the
    thing decision 3 said the implicit contract *isn't*; a build step per api
    change.
    *• B (zod + hand-rolled fetch)* — splits the source of truth (schemas vs
    route behavior); bespoke fetch plumbing the starter owns forever.
    - **17b. tRPC transport — batch by default; unbatch only where batching
      would defeat server-side fetch memoization.** One rule keyed to a runtime
      property, not a per-variant carve-out: `httpBatchLink` by default;
      `httpLink` (unbatched) where the surrounding context patches global `fetch`
      for per-request memoization (Next's RSC/loaders — the only such context in
      the starter's variants today; the Vite variant runs nothing server-side so
      it's fully batched; Next client components batch). Robust to future variants
      (TanStack Start, decision 15): when added, check whether its server context
      patches fetch — same rule, no rewrite. Reasoning: preserves decision 15's
      invariant at the *logical* level (`api-client` is the only door, typed, no
      bypasses — identical across variants) while taking the batching perf win
      everywhere it's safe; the only divergences are transport-level (wire shape)
      and conditional on a verifiable property, so the rule stays one rule, not
      per-variant config. Rejected for the record: *• unbatched everywhere* —
      pays a real client-side perf cost for one wire shape, when the only
      reason to unbatch (fetch-memoization defeat) is environment-specific.
      *• naive split-by-context ("httpLink server-side, httpBatchLink client-
      side" as label-based config)* — same wire behavior but expressed as a
      context label rather than a property, which makes it a per-variant
      carve-out in disguise and less robust to future variants than the
      property-keyed rule.
18. **Api framework in the TS shapes (1 & 2) — a fixed default, not a variant.
  The framework is Hono.** The api framework is *not* a scaffold-time variant
  (unlike web, decision 15): it's a single fixed choice for both TS shapes.
  Reasoning: decision 15 made *web* a variant because web apps have different
  *rendering architectures* (SSR/RSC vs SPA) that change what the project *is*;
  the api framework choice is *less* architecturally transformative — it's
  plumbing over the contract, and the contract mechanism (decision 17) is what
  makes the api legible to the web client, not the framework's ergonomics. A
  user who wants Fastify is doing a documented peer-app swap (decision 10's
  api-as-peer), not asking the CLI for a different project shape. Making it a
  variant would also double shape 2's CI surface and make the contract
  mechanism variant-coupled (tRPC vs Hono RPC) — two coupled axes for little
  architectural gain.
  **The framework is Hono**, specifically. Reasoning: the one api framework
  that tracks the spine thesis at every level —
  *• runtime-agnostic* (Node/Bun/Deno/Cloudflare/edge): decision 10's
  "swappable api peer" is real, not a label;
  *• native typed RPC* (`hc<typeof app>()`): fires decision 17's override — no
  redundant tRPC runtime bolted on;
  *• `@hono/zod-openapi` continuity*: the only option with a path from the
  implicit contract (shapes 1 & 2) to the explicit OpenAPI contract (shapes 3 &
  4, decision 3's upgrade trigger) without re-authoring the API.
  **Cascade (decision 17's override fires):** the implicit contract is realized
  concretely as **Hono RPC** (`hc<typeof app>()`), *not* tRPC. tRPC retreats to
  the general principle ("the contract is inferred from the implementation"),
  instantiated here by Hono RPC.
  Rejected:
  *• B (api framework as a variant, Hono + Fastify)* — doubles shape 2's CI
  surface and couples the contract-mechanism axis (tRPC-vs-Hono-RPC) to the
  framework choice for marginal architectural gain; the api swap is already a
  documented peer-app replacement.
  *• Fastify* — Node-only (fights runtime-agnostic swappability), no native
  typed RPC (forces the redundant tRPC bolt-on decision 17 avoided), no OpenAPI
  continuity.
  *• Express* — audience-safe but older/slower, no native typed RPC, no
  continuity story; weaker than Fastify on the Node fast/mature axis.
  *• Elysia* — Bun-only, runtime-locked; *directly* fights decision 10's
  swappable-api thesis (a Bun-only api can't be swapped to a Node deploy
  without rewriting).
19. **Go api framework in polyglot shapes (3 & 4) — fixed default: Gin + Huma;
  OpenAPI generated from Go structs, committed as the seam (flips decision 9's
  authorship model).** The Go api framework is a fixed default (not a
  scaffold-time variant), for the same reason as decision 18 — the api
  framework is plumbing over the contract, not a project-shape change; a user
  who wants Chi/Echo is doing a documented peer-app swap, not asking for a
  different shape. **The framework is Gin + Huma** (`huma-with-gin`):
  operations are defined as typed Go input/output structs on Gin routes; Huma
  validates at runtime, serves the endpoint, *and* generates the OpenAPI spec
  from those structs.
  **Authorship flip (revises decision 9):** the OpenAPI file at
  `packages/contract/openapi.yaml` is **generated from the Go api's structs**
  during build and **committed** to the repo — *not* hand-authored as a
  symmetric source of truth. TS/Dart clients are then generated from the
  committed file. The seam thesis survives: `packages/contract/openapi.yaml`
  is still the agreed wire-format boundary all sides are generated from —
  what changes is *who writes it*. Go is now the canonical side; clients are
  downstream. Reasoning: the user's lived workflow (Huma+Gin, structs-as-source)
  is a load-bearing real-world data point about what they'll actually maintain,
  more important than abstract symmetry; and it's more *honest* about how a
  polyglot shape with a Go backend naturally flows (Go owns the routes → Go
  drives the contract → clients consume). The cost — a spec change requires
  regenerating from Go and committing before clients can pick it up (a build
  step, not a free symmetric edit) — is the real, accepted price of
  Go-as-canonical.
  Rejected:
  *• Path 1 (Gin + `oapi-codegen`, keep OpenAPI authored-as-source)* —
  preserves decision 9's symmetric authorship but gives up the structs-as-
  source workflow the user actually used and liked; would force hand-authoring
  OpenAPI, which is the tedium Huma+Gin freed them from.
  *• Chi + `oapi-codegen`* — stdlib-friendly router (closest Go analogue to
  Hono's ergonomics), but same authored-spec cost as Path 1 and forgoes the
  Huma-as-single-framework experience.
  *• Huma standalone (without Gin)* — same spec-generation story and slightly
  cleaner, but the user's lived workflow is Huma+Gin; forking off Gin for
  aesthetic cleanliness costs familiarity for no real gain.
  *• Goa* — design-first DSL generates Go + OpenAPI from a non-Go DSL;
  learning a DSL is a real opinion to impose, and (like Huma) it makes the spec
  a derived artifact, but with worse ergonomics than Huma's structs-as-source.
20. **AI layer — composable primitives, not an assembled product; polymorphic
  across shapes; no example composition.** The AI layer ships **working thin
  shims for each composable primitive** (mirroring the auth shim's discipline,
  decision 12, *per primitive*): chat completion (with streaming), embeddings,
  a `VectorStore` interface (pgvector default in TS, reusing decision 14's
  Postgres), tool/function calling. Each is a real typed layer over a vetted
  SDK — *not* a stub. **None assembled into "what AI is for"** — the user
  composes their shape (RAG / recommendation / agentic / chat) per project,
  because AI's shape varies per app and isn't an enumerable scaffold-time radio
  button (unlike web variants, decision 15). Same principle as the capability
  split (decision 10): the starter owns the seams/primitives, the user owns the
  composition. Polymorphic across shapes per decision 5: TS shapes ship the
  primitives as a library in `packages/ai`; Go-monolith (shape 3) ships an
  embedded module; Go-microservices (shape 4) ships a **Python/FastAPI service**
  exposing the primitives over its own contract surface (called by the Go api).
  **No example composition shipped.** Reasoning: AI is opt-in and varies per app,
  so a demo composition would impose "AI is a thing this project does" on
  projects that don't — the same sin `apps/api-users` would have committed
  (decision 10). Contrast with auth, which *is* always-used, so decision 10's
  example split demonstrates it honestly. The starter teaches composition via
  README, not via an imposed feature. Rejected:
  *• A (single chat-completion shim)* — ships one AI product (chat), wrong for
  most projects.
  *• B (RAG toolkit)* — ships one AI product (RAG = embeddings + vector store +
  chat), wrong for most projects *and* imposes "AI = RAG" as the starter's
  opinion.
  *• C (typed seam only, no implementation)* — a capability wrapping an empty
  implementation is the same bait-and-switch decision 12 rejected for auth.
  *• D1 (primitives + disposable example composition)* — rejected here: an AI
  example would impose "AI is a thing this project does" on projects that
  don't, since AI is opt-in unlike auth (the user's distinction).
21. **AI is a CLI-prompt opt-in like mobile (revises decision 5).** AI is
  **not** scaffolded-in by default; the CLI asks "include AI?" alongside
  "include mobile?" (decision 4). If declined, `packages/ai` (TS) / the embedded
  module (Go monolith) / the Python service (Go microservices) is **absent**
  from the scaffolded project — a non-AI project carries zero AI dependency
  surface, not an unused-but-present `packages/ai` with SDK deps in
  `node_modules`. Reasoning: the no-example decision (Q20/decision 20) was
  grounded in "AI is opt-in and varies per app"; the consistent move is to make
  *scaffolding itself* opt-in, not just the demo — otherwise the starter ships
  an unused AI workspace to every non-AI project, which is "imposing AI is a
  thing this project does" at the workspace level instead of the feature level
  (the same sin decision 10 rejected for `apps/api-users`). Decision 5's
  "always available" is re-read as "always available as a prompt option," not
  "always materialized," recovering consistency with decision 4's mobile toggle.
  Retro-adding AI later is a documented copy-from-README pattern, mirroring
  decision 10's "copy the example split" pedagogy (the opposite of mobile's
  "delete the folder," since AI is additive rather than subtractive). Rejected:
  *• A (always scaffolded-in, current decision 5 reading)* — "always
  available" as zero-friction presence means every non-AI project carries an
  unused `packages/ai` with SDK dependencies, contradicting the opt-in
  principle applied to kill the example (decision 20).
22. **Testing strategy — unit + contract + one E2E over `items`.** Three test
  levels, each exercising a different class of seam the starter created, so no
  real seam ships untested (the discipline behind every "show the seam"
  decision — 10, 14, 15, 17):
  *• **Unit** tests* prove the **modules**: decision 14's repo layer in
  `apps/api`, decision 12's auth shim, decision 20's AI primitives (when
  scaffolded, decision 21) — each tested in isolation against its real
  dependencies (a test DB for the repo layer, real argon2/jose for the auth
  shim).
  *• **Contract** tests* prove the **spine** (decisions 3/9/17/19). In TS
  shapes the Hono RPC type-inference is checked at compile time —
  `apps/web`'s `api-client` is typed against `apps/api`'s router, so a type
  error *is* a contract test — plus runtime contract tests that hit each
  route over HTTP and assert the response shape. In polyglot shapes contract
  tests validate the committed `openapi.yaml` (decision 19) against the
  running Go server, schema-checking each route. This is the level that
  exercises the contract-as-spine thesis directly — the most load-bearing seam.
  *• **E2E** — exactly **one**, the `items` demo flow (decision 13).* Boots
  the whole stack via the Taskfile `dev`/test orchestrator and drives the flow
  through a real browser (Playwright): create an item via the web UI, see it
  in the list, verify it persisted across web→api→db. This is the level that
  proves the *composition* the `items` demo exists to demonstrate — decision
  13's promise made automated, not manual-`task-dev`-only.
  **One-E2E-only discipline** mirrors decision 10's "one example split": the
  starter owns exactly one E2E (the `items` flow) and documents "this is the
  only E2E the starter owns; add your own per feature" — a line against E2E
  creep. Reasoning: the starter's spine thesis is *seams*; each test level
  exercises a different class of seam (unit→modules, contract→spine, E2E→
  composition), so dropping any level leaves a class of seam un-exercised
  (A drops the contract spine, B drops the composition proof, D drops all).
  The `items` demo was chosen specifically to *prove the plumbing composes*
  (decision 13); C's E2E is the only level that honors that promise
  automatically. The cost (Playwright + browser install + boot orchestration in
  CI) is the literal cost of decision 13's premise.
  Rejected:
  *• A (unit only)* — the contract (the spine, the most load-bearing seam) is
  untested; a mocked route handler doesn't verify the typed client can call it.
  *• B (unit + contract, no E2E)* — the `items` demo is never run end-to-end,
  so decision 13's "prove the compose" is a manual claim a refactor could
  silently break.
  *• D (no tests shipped)* — a starter whose whole thesis is *seams* ships
  un-exercised seams; the same bait-and-switch rejected at every layer
  (decision 10's example split "proves the seam is real" — a real seam with
  no test is decoration).
23. **Mobile auth — secure storage + Bearer, body-refresh; decision 12's shim
  scope unchanged (no OAuth in the starter).** Both mobile variants (Expo in
  TS shapes, Flutter in polyglot shapes) store the access **and refresh**
  tokens in **OS-managed secure storage** (`expo-secure-store` /
  `flutter_secure_storage`), not cookies. The mobile client attaches the
  access token as a Bearer header; on 401 it calls `/refresh` with the refresh
  token in the **body** (not a cookie) and swaps. `apps/api-auth`'s `/login`
  returns both tokens in the response body to mobile clients — web gets
  cookies *additionally*, mobile just doesn't use them, so the server adds a
  *body-only / cookie-also* fork to its endpoints (one fork, not a new
  architecture). Reasoning: secure storage is the **platform-native**
  mitigation on mobile, not a downgrade the way it would be on web (there's no
  httpOnly cookie on a Flutter device); refresh handled in the mobile client
  is consistent with decision 16's "refresh is a property of the client"; the
  sole-minter invariant (decision 11) holds; and the server cost is one
  token-delivery fork, not a new auth architecture. The flow is *legitimately
  different* from web (decision 16) — the two are different auth architectures
  for different runtimes, not an inconsistency: decision 16 was explicitly
  scoped to web variants; mobile runs in a different runtime without cookies.
  **OAuth/PKCE stays fenced** as "wire it in: here's the seam" for a full app
  (decision 12's fence holds) — a full app graduates to the platform-vendor-
  recommended OAuth-with-PKCE flow (RFC 8252) by wiring it into the shim's
  seam; the starter ships the honest small version (A), not the fully-correct
  bigger one (C), same reasoning that made the auth shim (decision 12) a shim
  not a framework.
  Rejected:
  *• B (webview-mediated auth, reuse the web's cookie flow)* — the
  documented mobile anti-pattern (platform-vendor-discouraged, password-manager-
  hostile, awkward on modern iOS/Android); couples mobile auth to `apps/web`
  being up and shaped right, contradicting apps-are-peers (decision 2).
  *• C (OAuth-PKCE, the vendor-correct mobile pattern)* — would broaden
  decision 12's shim scope to include `/authorize` + `/token` + PKCE handling;
  right for a full app, too much for a starter whose mobile auth should be
  honest-and-small (the same call that made auth a shim not a framework).
24. **CLI composition policy — generatable-anything, CI-blessed-4.** The CLI
  composes five prompt axes: **backend-language** (TS/Go), **topology**
  (monolith/microservices), **web variant** (Next/Vite/TanStack-Start-later),
  **mobile** (Expo/Flutter/none), **AI** (on/off, decision 21) — and generates
  any combination the user picks. **The 2×2 from decision 7 stays the only
  fully-CI-tested envelope** (unit + contract + the one E2E over `items`,
  decision 22); **every** other composed combination is generatable but
  **not CI-tested**, produced with a documented "untested" warning at scaffold
  time and no E2E guarantee. Reasoning: the whole starter philosophy
  (decisions 1, 10, 15) has been "the user builds different projects; give them
  choices and trust the seams"; B is the only option that doesn't
  paternalistically refuse a sensible user choice — the starter's job is to
  ship honest seams; the user's job is to accept the CI cost of their own combo.
  The 4 blessed combinations stay the CI-tested contract (decision 7's promise);
  "generatable but not CI-tested" is an honest label, not a refusal.
  Rejected:
  *• A (strict — only the 2×2 generatable, everything else rejected at the
  prompt)* — paternalistic; refuses sensible user choices (e.g. Vite for a Go
  shape if Next is the blessed Go web variant), contradicting the
  "swappable peers, trust the seams" philosophy.
  *• C (tiered — blessed 4 + smoke-tested adjacencies + reject only
  nonsensical)* — most nuanced but the hardest to maintain: defining
  "sensible" vs "nonsensical" is a real ongoing investment, and the smoke-test
  layer is real CI cost.
  **Sub-decision 24b — default web variant per shape (locked):**
  *• TS shapes (1, 2): **Vite+TanStack** — the variant where Hono RPC's
  inferred types are consumed natively by TanStack Query/Router, the contract
  mechanism's strength made real on the client.
  *• Go shapes (3, 4): **Next** — where the contract is OpenAPI and the web
  client is codegen-derived, Next's RSC gives a server-rendering default that
  doesn't fight an inferred router (there isn't one).
  Reasoning: the default web variant is chosen *because of* the contract
  mechanism (decisions 17/19), not despite it. The whole spine thesis
  (decisions 3, 9, 15, 17) is "the contract is the seam; the web app is a
  client over it," so the default web variant per shape is the one where being
  a client over that shape's contract is most natural — Vite+TanStack for the
  inferred contract, Next for the generated one. Both defaults are the variant
  where the spine constraint is *least* fought.
  Rejected:
  *• A (Vite+TanStack for all 4)* — one mental model and most spine-honest,
  but Go shapes lose the RSC server-rendering story for no reason.
  *• B (Next for all 4)* — blesses the variant where the spine constraint is
  most actively fought (Next's server-actions/RSC ergonomics fight the
  `api-client`-only data path, decision 15) — awkward to make that the
  tested path.
25. **CLI scaffolder — TypeScript, invoked via `npx create-…`; a separate
  application from the scaffolded project.** The CLI is **not** part of the
  scaffolded project — invoked once to generate, then the user walks away; the
  scaffolded project never depends on or imports it (the `create-vite`-to-Vite-
  app relationship). Built in **TypeScript**, living in the Starter's pnpm
  monorepo (one toolchain, decision 8's JS spine). Invoked via **`npx create-…`**
  — the canonical JS-ecosystem scaffolder invocation; presumes Node, which is a
  no-brainer for the TS shapes (1, 2) and a mild accepted prereq for the Go
  shapes (3, 4). Reasoning: the *invocation* point is the needle — `npx` is
  canonical for the majority (TS) path; a Node-free Go binary would only
  benefit the Go shapes' users and would cost the Starter repo a second
  toolchain (pnpm + Go) plus `go:embed`-as-bytes templates that can't be type-
  checked or imported as values. The CLI sharing the Starter's TS monorepo
  keeps one toolchain, one test runner (`vitest`), one type-checker; templates
  are importable as type-checked values, not embedded bytes.
  Rejected:
  *• Go CLI (@binary distribution)* — would revise decision 1's `npx create-…`
  invocation to a `brew install` / `go install` / `curl | sh` binary model
  (no Node prereq), but only the Go shapes' users benefit; doubles the Starter
  repo's toolchain; templates become `go:embed` bytes, losing type-checked
  import. Decision 8's Taskfile-as-binary reasoning *doesn't* transfer —
  Taskfile is a *runtime* orchestrator the scaffolded project uses forever
  (binary distribution matters); the CLI is a *one-shot* scaffolder the user
  runs once via `npx` and discards.
  - **25b. CLI build mechanism — custom Node CLI (`@clack/prompts` + hand-rolled
    materializer).** Built as a **custom Node CLI** in a `packages/cli`-style
    workspace: `@clack/prompts` for the five-axis prompt UX (the
    `create-svelte` / `t3` / `create-vite`-next prompts style, minimal
    dependency) + a hand-rolled materializer that takes the composed answers
    and emits workspaces per structural rules ("if Go && microservices, write
    `apps/api` + `apps/api-auth` + `apps/mobile` Flutter + `packages/contract`").
    Reasoning: decision 1 framed the CLI as "a small product with prompts,
    variants, and its own tests"; the five-axis composition (decision 24) is
    *structural* (workspace materialization conditionals), which templating
    tools and generic scaffold frameworks don't express first-class — a custom
    CLI does. The CLI's own tests assert "scaffold shape X → working project"
    (distinct from decision 22's tests *shipped to* the scaffolded project).
    Rejected:
    *• A (Plop or Hygen)* — designed around static templates with
    `{{variable}}` interpolation, not structural conditionals; decision 1
    explicitly rejected static templates as the form.
    *• C (thin wrapper over a generic scaffolder — `giget` / `create-turbo`-
    style plumbing)* — ends up B with a dependency you don't control; the
    five-axis composition is still hand-expressed around the library.
26. **`packages/shared` — validation schemas + pure utils only (TS shapes).
  Web and Expo both use the same Hono RPC `api-client`.** In TS shapes (1, 2),
  `packages/shared` holds **shared zod schemas** (reused by `apps/api` for
  input validation and by `apps/web` / `apps/mobile` for form validation —
  *one schema, two consumers*) and **pure-function utils** that genuinely
  cross apps. It does **not** hold domain types/DTOs: those come from the
  Hono RPC contract itself, inferred by `api-client` (decision 17/18) — which
  **both `apps/web` and `apps/mobile` (Expo) use**, so web and mobile type
  against the api router via the same client, not against a shared-types
  library. (Confirms decision 23's "mobile uses `api-client`" in TS shapes
  specifically means **the Hono RPC typed client**, not a separate fetch
  client; the coupling-to-Hono is accepted.) Reasoning: decision 15's
  invariant ("contract is the only data path through `api-client`") + decision
  17's Hono-RPC mechanism together imply both web and mobile consumers type
  against the router, so the api contract gives them both their types — there
  is no need for a separate shared-types library, and `packages/shared`
  shrinks to the genuinely-shared-non-contract layer (validation reused by
  form + api, utils). Single source of truth for domain types: the Hono RPC
  router; `packages/shared` is the cross-app validation + utils layer, not a
  types library. Rejected:
  *• B (domain DTOs in `packages/shared`; mobile uses a *separate* fetch
  client)* — would require Expo to *not* use the Hono RPC client (so as not
  to couple mobile to Hono), but decision 23 already locked mobile to
  `api-client`, and if that's the Hono RPC client the coupling is accepted;
  introduces a *dual* source of types (the inferred router + authored shared
  DTOs) that must agree — drift risk.
27. **Monolith `apps/api` is a modular monolith — same internal-module
  structure as the microservices split-seam; the example split just hasn't
  happened.** The monolith shapes (1, 3) ship `apps/api` with the **same
  internal-module structure** as the microservices split-seam (decision 10):
  `internal/{auth,items}` modules with explicit interfaces, a router mounting
  them at prefixes (`/auth`, `/items`). The *only* difference from a
  microservices shape is that the example split (decision 10) hasn't happened
  — auth is still an `internal/auth` module, not a separate deployable
  `apps/api-auth`. So a monolith is literally "a microservices shape that
  hasn't split yet," and the monolith→microservices upgrade is a ***seam-
  preserving extraction*** — copy the example split, no refactor of `apps/api`
  required. Reasoning: decision 10 defined the **split-seam** as "the internal
  structure of `apps/api` that makes it *able* to split ... **present whether or
  not a split has happened yet**" — A *names* what decision 10 already promised
  (the "modular monolith" vocabulary), it doesn't revise it. A makes the
  "example split teaches the pattern" pedagogy (decision 10) *literal*: the
  pattern is already present in the monolith's `internal/*` modules, so the
  example demonstrates the one operation (extract `internal/auth` →
  `apps/api-auth`) on a structure *already prepared to receive it*. The cost
  (slight structural elaboration in monolith-only projects — you have
  `internal/{auth,items}` and prefixes even if you never split) is the honest
  price of the upgrade path being a copy-paste rather than a refactor.
  Rejected:
  *• B (flatter monolith, routes directly on the api, no `internal/*`)* — the
  monolith→microservices upgrade becomes a *structural rewrite* (refactor
  `apps/api` into `internal/*` with explicit interfaces before the example
  split means anything); the example split now "teaches a pattern that isn't
  present in the monolith," which undercuts decision 10's promise. Contradicts
  decision 10's "present whether or not a split has happened yet." Reopening
  decision 10 would be required to pick B.
  *• C (hybrid — lightweight `internal/*` organization without strict explicit
  interfaces in monolith; the microservices shape promotes boundaries to real
  interfaces)* — fuzzy line (which interfaces need hardening on upgrade?);
  two shapes have *different* module models (loose folders vs strict-interface
  modules), a real divergence to maintain in the starter's templates.
28. **Config & secrets — zod-validated `config.ts` per workspace; `.env`+
  dotenv in dev, real env vars in prod; both read through the same typed config.**
  Each workspace that needs config (`apps/api`, `packages/db`, `apps/api-auth`,
  `apps/mobile`, `packages/ai` when scaffolded) ships a `config.ts` defining a
  **zod schema** for the env vars it needs (DB URL, JWT signing key, LLM API
  key, JWKS endpoint, etc.) and exporting a typed `config` parsed from
  `process.env` — **fail-fast on missing/invalid at startup, typed access
  everywhere**. **Code never reads `process.env` directly** — always through the
  typed `config`. Dev loads vars via **`.env` + `dotenv`** (git-ignored,
  committed `.env.example` documenting the required surface); prod uses **real
  env vars** (the deploy platform's secret management injects them — Vercel /
  Cloudflare / Fly / etc.). Both loaders fill `process.env`, so the typed
  `config.ts` doesn't care which one ran. Reasoning: combines the typed-
  everywhere spine discipline (decisions 3, 14, 17 — config is *also* typed,
  not raw `process.env` strings) with the dev/prod correctness (real env vars
  in prod, no committed `.env` in prod). The typed `config.ts` is the single
  *logical* source; the two loaders are invisible to the code — the same move
  as decision 16's "refresh is a property of the client" (a mechanism detail
  hidden behind one logical seam). `.env.example` makes the secrets surface
  self-documenting. The E2E (decision 22) boots the stack with a test `.env`
  consumed by the same `config.ts` paths.
  Rejected:
  *• A (raw `.env` + dotenv, untyped `process.env` access)* — leaves config
  untyped, undercutting the typed-everywhere spine thesis (the same reason
  decision 14 rejected raw `pg`).
  *• B per-workspace-typed-config only (no dev/prod distinction)* — half the
  answer; specifies the typing but not the prod-story, which is where the
  real footgun is (committed `.env` in prod).
  *• C (external secrets/secrets manager — `direnv`, Doppler, `infisical`)* —
  imposes an external tool dependency on every scaffolded project (the same
  kitchen-sink sin rejected in decisions 1, 10); too opinionated for a
  starter.
29. **CI / lint / format — Biome (TS) + gofmt+golangci-lint (Go) + ruff
  (Python); GitHub Actions; matrix over the 4 blessed combos with **web +
  mobile tested, AI untested**.** Three coupled picks, locked together:
  *• (i) Lint/format per language:* **Biome** for TS (one tool, fast, zero-
  config, replaces ESLint+Prettier — parallels decision 8's "one orchestrator"
  discipline); **gofmt + golangci-lint** for Go (consensus, no real fork);
  **ruff** + `ruff format` for Python (shape 4 AI service — one tool,
  replaces Black+isort+Flake8, current Python consensus). Alternatives
  rejected: ESLint+Prettier (two tools for one job) and the legacy Python
  stack — both fight the one-tool discipline.
  *• (ii) CI runner:* **GitHub Actions** — the only realistic option for an
  OSS starter; matrix strategy over the 4 blessed combos; free for OSS.
  Alternatives (GitLab CI, CircleCI) aren't more capable for this matrix and
  reduce audience.
  *• (iii) What the blessed matrix actually tests — **B: web + mobile are
  blessed; AI is untested**.* CI runs the 4 combos (decision 7/24) with
  **mobile on** (Expo for TS shapes, Flutter for Go shapes): the web `items`
  flow gets the full Playwright E2E (decision 22); the mobile app gets a
  **build-and-boot smoke test** (compiles, boots, the mobile auth flow of
  decision 23 runs against the api — ideally in an emulator, at minimum the
  typed `api-client` compiles and the auth fetch is exercised against a
  running api). **AI is not in the blessed matrix** — it's opt-in (decision
  21) and ships no example (decision 20), so there's nothing AI-specific to
  E2E; blessing it in CI would be performative (a `chatComplete` round-trip
  against a mocked LLM is a unit test, not a CI integration). Decision 24's
  "generatable but not CI-tested" warning applies to AI-on compositions.
  Reasoning: decision 2 ("mobile is a peer app") + decision 23 (mobile auth
  flow specified) together make mobile a *real* part of the blessed matrix —
  declaring it "generatable but untested" (A) would be exactly the
  bait-and-switch this starter has rejected at every layer (decision 10's
  "no monolith + README bait-and-switch"). But decision 20/21 make AI an
  *unblessed* axis by construction — there's nothing in the starter's AI
  surface *to* E2E. B alone is consistent with the spine thesis: peers are
  real (mobile is CI-tested), opt-in capabilities that ship no example
  (AI) aren't. The cost — mobile-in-CI infrastructure (Expo/Flutter in CI,
  slower/flakier than Playwright) — is the honest cost of "mobile is a peer,"
  the same way Playwright was the honest cost of decision 13/22's
  "prove the compose."
  Rejected:
  *• A (web-only core is blessed; mobile-on is an untested toggle)* — much
  cheaper CI, but declaring mobile a peer (decision 2) while never testing
  it is the soft bait-and-switch the starter rejects elsewhere; the mobile
  auth flow decision 23 specified would be unexercised.
  *• C (web + mobile + AI all blessed)* — AI has no example to E2E
  (decisions 20, 21); testing it in CI is performative, not meaningful.
30. **Docs / onboarding structure — README + /docs/ tree in BOTH the scaffolded
  project and the Starter repo; Mermaid architecture diagrams; "wire it in"
  guide set; ADR convention the scaffolded project inherits.** The starter
  ships a `/docs/` tree in both repos (decision glossary term: *Doc
  convention*). Each `/docs/` tree contains:
  *• **`docs/architecture/`** — Mermaid diagrams of the spine and seams, not
  prose. The blessed 2×2 (decisions 7/24); the contract spine (decisions
  3/9/17/19); the split-seam + example split (decision 10); the modular
  monolith (decision 27); the auth subtree (decisions 11/12/16/23); the
  typed-RPC transport (decision 17b). Diagrams survive a cold reader;
  prose-only docs become stale.
  *• **`docs/wire-it-in/`** — the fences, turned into a *convention* the
  scaffolded project inherits. Each fenced item (decision 12: email-verify,
  MFA, OAuth; decision 20: composing AI primitives) is a single doc: what
  the seam is, why it's fenced, what a real implementation looks like, links
  to the audited libraries the user would reach for. The "wire it in"
  language used in decisions 12 and 20 was itself a doc convention — this
  directory delivers on it.
  *• **`docs/adr/`** — a convention the scaffolded project uses to record
  its *own* future architecture decisions (the `apps/ai-*` extractions, the
  `packages/*` additions, the user's own monolith→microservices split
  following decision 10's pattern). Extends the ADR pattern this Starter
  uses internally in `CONTEXT.md` into a starter-provided convention.
  *• **README in each repo** — the entry point. The scaffolded project's
    README documents the spine (decisions 3, 9, 17, 19), the seams (10, 14,
    15, 16, 23), and the upgrade paths (24, 27) at a high level, with
    `/docs/` as the deep reference. The Starter repo's README documents the
    five-axis composition (decision 24) and the contribution model.
  Reasoning: the starter's spine thesis is *seams* (decisions 3, 9, 10, 14,
  15, 17, 19, 22). Seams that aren't documented get worked around — the
  same bait-and-switch this starter has rejected at every layer (decision
  10's example split, decision 13's `items` demo, decision 22's one E2E).
  The recursion — same `/docs/` structure in both repos — is paid back as
  discoverability: a contributor who learns the structure once in the
  Starter repo finds the same structure in the scaffolded project, with
  the ADR convention explicitly inviting them to grow their own `CONTEXT.md`
  the same way this Starter grew this one.
  Rejected:
  *• A (README only) — undercuts the seam philosophy the same way
  "kitchen-sink clone" did for decision 1; a README can't carry the seam
  load.
  *• C (README + wire-it-in only) — drops the load-bearing diagrams and
  treats seams as code-only; works for the author, not for the next reader
  who didn't write the code.
31. **Docs / onboarding content — the CLI auto-fills the scaffolded project's
  /docs/ from the five-axis composition (code and docs are both materialized
  by the same composition).** Decision 30 locked *structure* (mirrored
  `architecture/`, `wire-it-in/`, `adr/`, README). Decision 31 locks *content
  generation*: the CLI's materializer (decision 25b) writes *both* the
  workspaces and the docs from the chosen composition, so:
  *• **`docs/architecture/` Mermaid is composition-specific.** A
  Vite+TanStack+TS-monolith scaffold gets a Mermaid diagram labeled "your
  Hono RPC contract spine"; a Next+Go-monolith scaffold gets one labeled
  "your OpenAPI contract spine" (decision 19). The contract-mechanism
  choice (decisions 17/19) carries into the diagram itself, not as a
  footnote.
  *• **`docs/wire-it-in/` is composition-conditional.** Fences that depend
  on a choice only show up when that choice is on. AI fences (decision 20)
  only appear in `wire-it-in/` when AI is on; OAuth/MFA fences (decision
  12) appear in every scaffold (auth is always-on). Unblessed combos
  (decision 24) get a "your combination is generatable but not CI-tested"
  warning in the README.
  *• **`docs/adr/` is empty.** The user grows it; the convention (decision
  30) tells them how.
  *• **The scaffolded-project README is auto-generated** with a "you chose"
  line, the workspace map, and links into `/docs/`.
  The Starter repo's `/docs/` is hand-curated, contributor-facing, and
  changes as decisions are added — the contributor's docs are the
  *generator's* docs, the user's are the *generation's* docs.
  Reasoning: composition-specific content is the same spine-consistent move
  as the contract mechanism (decisions 17/19) and the schema (decision 14)
  — derived from the composition, not static. A composition-agnostic Mermaid
  (B's snapshot) reads as "the starter's diagram" not "your diagram"; static
  hand-authored docs (C) push a real documentation job onto every user at
  scaffold time, the soft bait-and-switch decision 30 was meant to avoid.
  The cost — the CLI grows a *doc generator* alongside the code generator —
  is small (mostly Mermaid + a few doc templates parameterized by
  composition) and the right framing: the CLI's job is "which workspaces do
  I materialize?" (decision 25), which is now "which code *and* which docs?"
  Rejected:
  *• B (snapshot of the Starter's /docs/ at scaffold time) — the user
  inherits the Starter's *stance*, not their own; the diagrams describe the
  generator, not the generation.
  *• C (static, hand-authored /docs/ tree the user customizes) — pushes a
  real documentation job onto every user at scaffold time; the diagrams
  and fences are seeded-but-blank rather than composed.
32. **Docs / standards & practices subdir — `docs/standards/` in BOTH repos,
  three sub-docs: per-language style, per-seam best practices, anti-patterns.
  The third is the unique contribution.** The starter's `/docs/` tree
  (decisions 30/31) gains a fourth subdir: `docs/standards/`. Three
  sub-docs under it:
  *• **Code style (per language).** The *why* of decision 29's tool choices
  (Biome for TS — one tool, replaces ESLint+Prettier; gofmt+golangci-lint
  for Go — consensus, no real fork; ruff for Python — replaces Black+isort+
  Flake8). The doc points at the actual config files; the configs are the
  *truth*, the doc is the *justification*. Composition-conditional in the
  scaffolded project (per decision 31): TS scaffolds get a Biome section,
  Go scaffolds get a gofmt+golangci-lint section, polyglot scaffolds get
  both. No Python section unless shape 4 (Go-microservices with AI) is
  scaffolded.
  *• **Best practices (per seam).** Action-oriented guides for the things
  scaffolded-project users actually do: how to add a new module to
  `internal/*` (the modular monolith, decision 27); how to extend the
  contract (decisions 3/17/19); how to do the `apps/ai-*` extraction when
  growing from a Go-monolith with embedded AI to a separate AI service
  (decisions 5/20); how to add a new web variant (decision 15); how to
  upgrade from a monolith to microservices by copying the example split
  (decisions 10/27). The starter's "documented copy-from-README patterns"
  (decisions 10, 21, 24) are exactly these.
  *• **Anti-patterns.** A "don't do this" list drawn from the **rejected
  options** recorded in every decision in `CONTEXT.md`. This is the
  unique asset: 32+ decisions of "we considered X, rejected because Y"
  captured in one searchable doc, where each anti-pattern is paired with
  the decision that killed it. Generic code-style guides don't have this;
  a starter that has recorded its rejected options across 30+ decisions
  is the *only* place this doc can live that serves both audiences (a
  contributor reading the scaffolded project finds the same anti-patterns
  a contributor reading the Starter repo finds). Reasoning: the value
  of a starter's `CONTEXT.md` is the *negative space* (what was rejected),
  not just the affirmative choices — a code reviewer asked "why isn't
  this using X?" can now point at the anti-patterns doc instead of
  reading `CONTEXT.md` cover-to-cover.
  Reasoning: standards/practices are the *how* layer, distinct from the
  *what/why* the other three subdirs cover. The anti-patterns doc alone
  justifies the subdir — it's the only place this content can live that
  serves both audiences. The cost — three sub-docs to maintain per repo,
  all composition-conditional in the scaffolded project (the CLI's doc
  generator grows three more templates, decision 31) — is reasonable for
  the value.
  Rejected:
  *• B (single `CONVENTIONS.md` in each repo's root) — scope (style +
  patterns + anti-patterns) gets unwieldy; one file doesn't surface the
  recursion (decision 30's mirror works because each subdir has a clear
  responsibility).
  *• C (inline in the README) — the README is the entry point;
  standards/practices content is the wrong shape for a "what is this
  project" entry point and gets read once and forgotten.
33. **Scaffolded-project README structure — demonstrate-then-name
  (`items` quickstart → "what you just saw" → seams → upgrade paths).** The
  scaffolded-project README (auto-generated per decision 31) is structured
  in four sections:
  *• **Section 1 — `items` quickstart (the spine demonstration).** The
  README's quickstart *is* the `items` demo flow (decision 13). The user
  runs `task dev`, creates an item via the web UI, sees it in the list. No
  separate quickstart from the spine demonstration — they're the same
  thing. The handoff's "demonstrating" verb is literal: the README
  *runs* the spine.
  *• **Section 2 — "What you just saw" (names the architecture).** A
  one-paragraph mapping from the running demo to the architecture: "you
  just saw the [Hono RPC | OpenAPI] contract spine (decisions 3/9/17/19)
  in action; the modular monolith (decision 27) under `apps/api`; the
  auth shim (decision 12) gating `/items`; `api-client` (decision 15) on
  the web. The Mermaid from `docs/architecture/` is embedded here, with
  the labels now meaningful because the reader just saw the components
  in action." A composition-conditional sentence: TS scaffolds name
  Hono RPC, polyglot scaffolds name OpenAPI; AI-on scaffolds mention the
  AI primitives, AI-off scaffolds don't; mobile-on scaffolds name the
  mobile auth flow (decision 23), mobile-off don't.
  *• **Section 3 — Where to extend (the seams).** A list of the seams
  the user might want to extend: `packages/db` (add a table), the
  contract (add an operation), `internal/*` (add a module to the
  modular monolith), `packages/ai` when scaffolded (compose a primitive).
  Each is one line + a link into `docs/standards/best-practices/`.
  Composition-conditional: AI seams only appear when AI is on; mobile
  seams only when mobile is on.
  *• **Section 4 — How to grow (the upgrade paths).** A list of the
  growth trajectories: monolith→microservices (decisions 10/27),
  adding the `apps/ai-*` extraction (decisions 5/20), adding a new web
  variant (decision 15), adding a new fence (decision 12). Each is one
  line + a link into `docs/standards/best-practices/`.
- **Asymmetric docs mirror (Starter repo adds `contributing/`)** — the
  Starter repo's `/docs/` mirrors the four *domain* subdirs from the
  scaffolded project (decision 30: `architecture/`, `wire-it-in/`, `adr/`,
  `standards/`), each rewritten contributor-facing, *plus* a Starter-repo-
  only `contributing/` subdir documenting the contribution playbook — how
  to add a new web variant (decision 15), how to add a new api framework
  (decision 18), how to add a new mobile option (decision 4), how to add
  a new fence (decision 12), how to bump the contract mechanism
  (decisions 17/19), how to add to the CI matrix (decision 29). The
  asymmetry is deliberate: the mirror is for *domain* subdirs, the
  `contributing/` is for Starter-repo-specific concerns (the scaffolded
  project doesn't add new variants, it uses them).
  Reasoning: the README's job is to orient a fresh reader of the
  scaffolded project. **The fresh reader is a contributor, not the user
  who just ran `npx create-…`** — once a user generates, they walk away
  (decision 25); the next person to read the README is a contributor who
  didn't pick the composition and doesn't know what's inside. Section 1
  puts them in the spine via the only thing the starter proves works
  end-to-end (decision 22); Section 2 names what they just saw, in the
  same composition-conditional way the docs use; Sections 3 and 4 are
  the seams and the upgrade paths the user (or future contributor) will
  actually touch. A's architecture-first approach is cleaner but makes
  the quickstart a separate concern from the spine ("here's the
  architecture, *now* go run it" — two parallel tracks, not one
  demonstration). B's quickstart-first is conventional but defers the
  architecture to "after you've run it," which is the wrong order for a
  starter whose whole thesis is that the architecture *is* the project.
  Rejected:
  *• A (architecture-first: spine → quickstart → seams → upgrade paths)
  — cleaner, philosophy-consistent, but separates the quickstart from
  the spine demonstration (two tracks instead of one).
  *• B (quickstart-first: run → spine → seams → upgrade paths) —
  conventional, lived-experience signal ("make it work first, then
  explain"), but defers architecture to "after you've run it" — wrong
  order for a starter whose thesis is architecture-as-spine.
34. **Starter repo's docs structure — mirror for the four domain subdirs +
  a Starter-repo-only `contributing/` subdir for the contribution playbook
  (deliberate asymmetry).** The Starter repo's `/docs/` (decision 30) is
  hand-curated, contributor-facing, and changes as decisions are added
  (decision 31). The four *domain* subdirs are mirrored — same names as
  the scaffolded project's `/docs/`, each rewritten contributor-facing:
  *• `architecture/` — the blessed 2×2 Mermaid (decisions 7/24) + how
  each cell maps to workspaces; the contract spine (decisions 3/9/17/19);
  the split-seam (decisions 10/27); the modular monolith (decision 27);
  the auth subtree (decisions 11/12/16/23); the typed-RPC transport
  (decision 17b). Contributor reads this to understand *what the
  generator produces*.
  *• `wire-it-in/` — the **fence-extension guide**: how to add a new
  fence (the contributor's analog of the scaffolded project's "how to
  fill in this fence"). A fence lives in three places: a `packages/*`
  shim (decision 12), a `/docs/wire-it-in/` guide, and a CLI prompt. The
  `wire-it-in/` subdir in the Starter repo documents the *convention* for
  the contributor — "if you're adding a new fenced capability, here's
  how the seam must be presented across all three places."
  *• `adr/` — the Starter's own future architectural decisions. This
  document (`CONTEXT.md`) is the predecessor; new decisions get recorded
  in `docs/adr/NNNN-…` files following the same convention. Decision
  30's recursion is paid back here: a contributor who learns the ADR
  pattern from the scaffolded project's `/docs/adr/` finds the same
  convention in the Starter repo. (`CONTEXT.md` itself predates the
  ADR-by-file convention; future decisions move into `docs/adr/`.)
  *• `standards/` — the Starter's contribution *standards* (the *how* of
  contributing to the Starter), distinct from the scaffolded project's
  `/docs/standards/` which is the *how* of working in a scaffolded
  project (decision 32). The Starter's `standards/` covers: how to write
  a new CLI template, how to add a new workspace to the materializer,
  how to bump the contract mechanism (decisions 17/19), how to add a new
  blessed combination to the CI matrix (decisions 7/24/29), how to
  re-generate the scaffolded-project's `/docs/` from the five-axis
  composition (decision 31).
  **Plus a Starter-repo-only `contributing/` subdir.** The contribution
  playbook — "how to add a new X to the five-axis composition" (decision
  24). Specifically:
  *• How to add a new web variant (decision 15): the CLI prompt, the
  materializer, the contract-mechanism integration (Hono RPC vs OpenAPI
  client), the `api-client` shape, the test-pyramid coverage.
  *• How to add a new api framework (decision 18): the framework's
  typed-RPC story (does it have one? does it need the tRPC bolt-on?),
  the contract-mechanism implications, the CI matrix entry.
  *• How to add a new mobile option (decision 4): the workspace shape
  (Expo vs Flutter vs something new), the auth-flow implications
  (decision 23), the contract-consumer story (typed client vs
  OpenAPI-generated Dart).
  *• How to add a new fence (decision 12): the shim, the `/docs/wire-it-in/`
  guide, the CLI prompt, the test-pyramid coverage (decision 22).
  *• How to bump the contract mechanism (decisions 17/19): the polyglot
  trigger (decision 3), the Huma-with-Gin regen workflow, the
  OpenAPI-committed-as-seam rule, the client-codegen downstream.
  *• How to add a new blessed combination to the CI matrix (decisions
  7/24/29): the matrix entry, the test surface, the E2E envelope.
  Reasoning: the recursion (decision 30) is paid back for the *domain*
  subdirs because each has a clear contributor analog (fence-extension
  is the contributor's analog of fence-fill-in; ADR-evolution is the
  Starter's analog of the scaffolded project's own ADR convention;
  standards are the Starter's contribution rules). The `contributing/`
  subdir is asymmetric on purpose: it documents how to extend the
  *generator*, a Starter-repo-specific concern the scaffolded project
  doesn't have. A contributor who reads the Starter repo's `/docs/`
  finds the same domain subdirs as the scaffolded project (the
  recursion wins), *plus* a `contributing/` they can use (the
  Starter-repo-specific value). The asymmetry is a feature, not a
  leak — forcing the contribution playbook into a mirrored subdir
  contorts it (A's strict mirror, where "how to add a new web variant"
  goes in `architecture/` or `standards/` but fits neither).
  Rejected:
  *• A (strict mirror — same four subdirs, no `contributing/`) —
  forces "how to add a new web variant" into `architecture/` (wrong:
  architecture is what exists, not how to extend it) or `standards/`
  (wrong: standards are rules, not playbook). The contribution
  playbook needs its own home.
  *• C (no mirror, contributor-only structure) — breaks the recursion
  (decision 30) and loses the discoverability win. A contributor who
  learns the structure in the Starter repo no longer finds the same
  structure in the scaffolded project.
- **Phased versioning (0.x → 1.0+ with stability surface)** — the
  starter uses a phased versioning model. The 0.x phase signals *active
  development*: no stability surface, every change is breaking, users get
  `latest` only and re-scaffold to upgrade. The 1.0+ phase signals
  *stability*: SemVer, the blessed 2×2 (decisions 7/24) is the stability
  surface, breaking changes come with migration notes. The version number
  *is* the signal — a 0.x user reads it as "moving, re-scaffold to
  upgrade," a 1.x user reads it as "stable, pin and trust the blessed
  2×2." The CLI and templates share a version in both phases.
- **Pre-1.0-scope (the criteria for 1.0)** — the set of decisions whose
  implementation is required for the 0.x → 1.0 transition (decision 36).
  Explicitly the spine-level decisions 1–36 themselves (every locked
  decision's outcome is realized in code or its absence) **minus** the
  post-1.0 reservations: TanStack Start as a web variant (decision 15,
  explicitly reserved for post-stability); any new web variant beyond
  Next and Vite+TanStack; any new api framework beyond Hono (decision 18)
  and Gin+Huma (decision 19); any new mobile option beyond Expo and
  Flutter (decision 4). Plus the CI matrix (decision 29) passing green
  on all 4 blessed combos. The 0.x → 1.0 transition is mechanical:
  every pre-1.0-scope decision is implemented AND the CI matrix is
  green — both must be true to claim 1.0.
- **Tag-based releases (CI-gated)** — releases are deliberate acts: the
  maintainer cuts a tag on the Starter repo's main branch; the CI
  matrix (decision 29) must be green; the tag = one npm release of the
  CLI. Pre-1.0 and post-1.0 both use this model; only the version-
  numbering rules differ (decision 35). A release that doesn't pass the
  CI matrix is a release that breaks the blessed-2×2 envelope — the tag
  can't be cut on a broken matrix, which is the whole point of CI-gating.

35. **Versioning model — phased: 0.x (pre-1.0, every change breaking,
  re-scaffold to upgrade) → 1.0+ (SemVer, blessed 2×2 as stability
  surface, migration notes for breaking changes).** The user articulated a
  sharper version of the meta-fork the handoff flagged: not A *or* B but
  A *then* B, sequenced by an earned transition. The version number is
  the signal of which phase the starter is in.
  *• **Pre-1.0 phase (0.x).** `npx create-…` always pulls `latest`; no
  version pinning, no `latest@1.x` channel. The contract: the starter
  is moving, every change is breaking, the user is expected to
  re-scaffold to upgrade. Migration notes are not provided — every
  change is breaking, and documenting migration notes for a project the
  user is expected to throw away is overhead. The CLI and templates
  share a single version (one release artifact, one CHANGELOG entry
  per release). The 0.x number advances with each meaningful release;
  breaking changes are not flagged specially because *all* changes are
  breaking.
  *• **Transition to 1.0.** Triggered by stability criteria
  (decision 36). 1.0 is the lock-in moment: the surface that was
  0.x-moving becomes 1.0-stable. From 1.0 onward, breaking changes
  require a major version bump and a migration note.
  *• **Post-1.0 phase (1.0+).** SemVer. `npx create-…` pulls `latest`
  by default; pinning to a specific version is supported
  (`npx create-…@1.2.3`). The CLI and templates share a version. The
  blessed 2×2 (decisions 7/24) is the stability surface — those four
  compositions are guaranteed to work as documented for as long as the
  major version holds. Breaking changes to the generated scaffold come
  with migration notes, hosted in `/docs/wire-it-in/` (decisions 30/32)
  or a dedicated `docs/migrations/` subdir.
  Reasoning: the user articulated the sharpening. The 0.x phase is the
  honest answer *now* (35 decisions locked but the code doesn't exist
  yet; the blessed 2×2 isn't CI-tested because the templates aren't
  written). The 1.0+ phase is the honest answer *once stability is
  earned* (the blessed 2×2 is CI-tested; the contract mechanism is
  settled; the surface is frozen). The version number signals which
  phase the starter is in — a clean, conventional signal users can
  read. The cost of the phase model is the *transition moment*: 0.x →
  1.0 is itself a breaking change for anyone who pinned to a 0.x
  version, and the criteria for the transition need to be explicit
  (decision 36) so the transition is earned, not arbitrary.
  C (split CLI/template versions) is rejected for the same reason as in
  the meta-fork question: the CLI and templates evolve together for
  the most part; splitting them is two version spaces, two CHANGELOGs,
  and a CLI that has to negotiate which template versions to bundle.
36. **1.0 criteria — all pre-1.0-scope decisions implemented + blessed 2×2
  CI-tested green. The pre-1.0-scope list is defined now, not at the
  transition moment.** Decision 35's 0.x → 1.0 transition is mechanical:
  two conditions, both must be true to claim 1.0.
  *• **Condition 1 — every pre-1.0-scope decision is implemented.** "All
  decisions implemented" means *every locked decision's outcome is
  realized in the starter repo's code (or its deliberate absence)*.
  Negative decisions (decision 20's no-example-AI-composition) are
  implemented by *not* shipping the corresponding code. Scope-creep
  decisions (decision 15's TanStack Start, reserved for post-stability)
  are *not* in pre-1.0-scope — they're post-1.0 reservations.
  *• **Condition 2 — the CI matrix (decision 29) passes green on all 4
  blessed combos.** The mechanical check: every blessed combo's
  pipeline (unit + contract + the one E2E over `items`, decision 22)
  passes.
  **The pre-1.0-scope list (defined now):**
  *• **Spine-level (must be implemented):** decisions 1–3, 7–9, 17–19,
  22, 24–29, 35–36 (i.e., this decision itself).
  *• **Seam-level (must be implemented):** decisions 4–6, 10–16, 20–23.
  *• **Docs (must be implemented):** decisions 30–34.
  *• **Configuration (must be implemented):** decision 28.
  **Post-1.0 reservations (explicitly NOT in pre-1.0-scope):**
  *• **TanStack Start as a web variant** (decision 15: "reserved as a
  variant to add once it's stable enough to anchor").
  *• **Any new web variant beyond Next and Vite+TanStack** (decision 15's
  "Today the variants are Next.js and Vite + React + TanStack
  Router/Query").
  *• **Any new api framework beyond Hono** (decision 18) **and
  Gin+Huma** (decision 19).
  *• **Any new mobile option beyond Expo and Flutter** (decision 4).
  *• **Any new contract mechanism** (decisions 17/19 — Hono RPC in TS
  shapes, OpenAPI-in-Go-driven in polyglot shapes).
  *• **Any new blessed combination** beyond the 2×2 (decisions 7/24).
  Reasoning: the pre-1.0-scope list makes the criteria checkable in
  advance. A contributor can ask "are we at 1.0 yet?" and get a
  mechanical answer: "are all these decisions implemented? is the CI
  matrix green?" — no judgment call about "is the starter ready?"
  B's dog-food criterion is more conservative but introduces a
  real-world dependency the project can't control (a real production
  project at 0.4.2 doesn't make 0.5.0 the right 1.0). C's subjective
  fallback ("when the maintainer calls it 1.0") is fine in principle
  but creates ambiguity — "ready" is a question without an answer
  until it's asked.
  The cost of A: the pre-1.0-scope list is a real artifact and it
  must be kept current as decisions are added. The list itself is
  a row in the Starter's `CONTEXT.md` (above) and gets reviewed when
  new decisions are locked.
  Cascade: the transition from 0.x to 1.0 is a single moment that
  fires when both conditions are true. The pre-1.0-scope list is
  the checkable input; the CI matrix (decision 29) is the
  checkable output. Once 1.0 is reached, the post-1.0 reservations
  become the only path for surface extension — each one is a new
  decision (recorded in `docs/adr/`, per decisions 30/34) before
  it can ship.
37. **Release cadence / channel model — tag-based, CI-gated. The
  maintainer cuts a tag; CI must be green; tag = npm release of the
  CLI.** Releases are deliberate acts, not side-effects of merge.
  *• **The release process.** A maintainer cuts a tag on the Starter
  repo's main branch when a meaningful set of changes is ready. The
  CI matrix (decision 29) must be green before the tag is cut —
  enforced by the release pipeline. The tag triggers an npm publish
  of the CLI; the CLI version and the Starter repo tag share a
  version (decision 35).
  *• **Pre-1.0 vs post-1.0 cadence.** The cadence is the same
  (tag-based, CI-gated); only the version-numbering rules differ
  (decision 35). In 0.x, the maintainer cuts a tag when there's a
  meaningful set of changes (the cadence is "when there's something
  to ship"). In 1.0+, the maintainer cuts a tag when a major /
  minor / patch is ready per SemVer.
  *• **Channel model.** `npx create-…` always pulls `latest` (0.x)
  or `latest@1.x` (1.0+). Pinning to a specific version is
  supported post-1.0 (`npx create-…@1.2.3`); pinning in 0.x is
  effectively meaningless because every change is breaking, so
  `latest` is the only sensible pin.
  *• **CI-gating as the spine thesis in action.** A release that
  doesn't pass the CI matrix is a release that breaks the blessed
  2×2 envelope (decision 29). The CI-gate is the mechanism that
  makes the blessed 2×2 a real claim, not an aspiration.
  Reasoning: the starter is a "small product with its own tests"
  (decision 1). Tag-based gives the maintainer control over what
  ships when — a release is a deliberate act. CI-gating is the
  spine thesis in action: a release that breaks the CI matrix
  breaks the blessed 2×2.
  Rejected:
  *• B (trunk-based — every merge to main is a release) — creates
  version noise; the maintainer's review of "is this ready to
  ship?" gets short-circuited. A starter doesn't need a version
  per merge.
  *• C (scheduled — fixed cadence) — forces a rhythm that may not
  match the work. Some months the starter is in active
  development, others it's quiet; a forced cadence either ships
  nothing or ships work that's not ready.
- **Two-artifact release notes (`CHANGELOG.md` + `docs/migrations/`)** —
  the starter ships two distinct release-note artifacts. `CHANGELOG.md`
  (root, mirrored per decision 30) records *what* changed in each
  version. `docs/migrations/` holds per-version upgrade recipes (*how*
  to upgrade past a breaking change) for post-1.0 breaking changes.
  Pre-1.0 has the CHANGELOG only; post-1.0 has both. Different
  audiences, different content shape, different reader flow.
- **Scaffolded-project `starterVersion` field** — the scaffolded
  project's `package.json` (TS shapes) or `go.mod` / `Taskfile.yml`
  (Go shapes) carries a `starterVersion` field recording the Starter
  version that generated it. The mechanism that lets a user answer
  "which Starter version did I generate this with?" — required for
  looking up the right migration notes post-1.0. The CLI writes it at
  scaffold time; the Starter repo's CHANGELOG and `docs/migrations/`
  are organized so a user can find the migration notes from their
  current `starterVersion` to `latest`.

38. **Release notes — `CHANGELOG.md` (root) + dedicated `docs/migrations/`
  subdir for per-version upgrade recipes. Pre-1.0: CHANGELOG only.
  Post-1.0: CHANGELOG + migration notes. Scaffolded project carries a
  `starterVersion` field recording the Starter version that generated
  it.** Two artifacts with distinct jobs:
  *• **`CHANGELOG.md` (root, mirrored per decision 30).** Records
  *what* changed in each version — one line per change, sorted
  newest-first, with a "Breaking" flag. Lives at the root of both
  the Starter repo and the scaffolded project (mirrored per
  decision 30). Format: standard Keep-a-Changelog style
  ("Added / Changed / Deprecated / Removed / Fixed / Security"
  sections, with "BREAKING" markers where applicable). The CHANGELOG
  is the "should I upgrade?" signal — a user can scan it and see
  whether the new version is worth their time.
  *• **`docs/migrations/` (deep, in both repos).** Holds *how* to
  upgrade past a breaking change. One file per version transition:
  `docs/migrations/v1.2-to-v1.3.md`. Format: structured upgrade
  recipe — "what changed" (1-2 paragraphs) → "if you're on X" (steps)
  → "if you're on Y" (steps) → "verify" (what to check after the
  upgrade). Linked from the CHANGELOG entry for breaking changes.
  Lives in the Starter repo always (the canonical set); the
  scaffolded project gets the migration notes that *apply to its
  current version* (per decision 31's auto-fill, composition-conditional
  on the scaffolded project's `starterVersion`).
  **Pre-1.0 vs post-1.0:**
  *• **Pre-1.0 (0.x):** `CHANGELOG.md` records what changed in each
  0.x release. **No migration notes** — every change is breaking
  (decision 35), users re-scaffold to upgrade, migration notes for a
  project the user is expected to throw away is overhead. The
  CHANGELOG entry is the *only* signal; users read "this 0.x version
  changed X, Y, Z" and decide whether to re-scaffold.
  *• **Post-1.0 (1.0+):** `CHANGELOG.md` + `docs/migrations/`. SemVer
  means breaking changes are *flagged* in the CHANGELOG and
  *documented* in `docs/migrations/`. A user on 1.2.3 reading the
  1.4.0 release notes sees "BREAKING: tRPC → Hono RPC" + a link to
  `docs/migrations/v1.3-to-v1.4.md`. Pinning (decision 37) lets
  the user opt out of breaking changes until they're ready.
  **Scaffolded-project `starterVersion` field (the lookup mechanism):**
  the scaffolded project's `package.json` (TS shapes) or `go.mod` /
  `Taskfile.yml` (Go shapes) carries a `starterVersion` field
  recording the Starter version that generated it. The CLI writes
  it at scaffold time. The mechanism that lets a user answer
  "which Starter version did I generate this with?" — required for
  looking up the right migration notes post-1.0. The Starter repo's
  CHANGELOG and `docs/migrations/` are organized so a user can
  find the migration notes from their current `starterVersion` to
  `latest`.
  Reasoning: the CHANGELOG is the *what* (one-liner per change,
  "should I upgrade?"). The migration note is the *how* (detailed
  upgrade recipe, "how do I upgrade?"). Different audiences, different
  content shape, different reader flow. Pre-1.0 has only the
  CHANGELOG because there are no migration notes (every change is
  breaking, decision 35). Post-1.0 has both because SemVer needs
  the distinction (patch/minor users don't need a migration note,
  major users do). The `starterVersion` field is the lookup
  mechanism that ties them together — without it, a user on 1.2.3
  looking at 1.4.0's release notes can't find the right migration
  path.
  Rejected:
  *• B (`CHANGELOG.md` only, no separate migration notes) —
  collapses the two jobs. A CHANGELOG entry that doubles as a
  migration recipe gets long fast and reads badly as a CHANGELOG.
  Patch/minor entries shouldn't carry migration-recipe weight.
  *• C (`docs/migrations/` only, no top-level `CHANGELOG.md`) —
  removes the "should I upgrade?" signal. A user looking at a 1.3
  release has to dig into `docs/migrations/` to find out what
  changed, which is the wrong default.
