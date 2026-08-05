# Contributing: adding a new mobile option

The playbook entry for extending the **mobile** axis of the five-axis
composition (decision 24) — "how to add a new mobile option" (decision
4). Today's options: **Expo** (React Native) and **Flutter**, plus
**none** (the free delete-the-folder toggle).

## The axis's rule (decision 4)

The mobile default is **Flutter**; Expo is used only when the stack is
fully TypeScript (so mobile can share packages) *or* when Expo is
specifically requested. Flutter is a peer app that shares **only the
contract**, never TS packages. The trigger is language purity
(decision 3): the moment a non-TS language enters the build — including
Flutter mobile alone — the contract is explicit.

A new mobile option must be evaluated against the same axis: does it
share packages (TS-compatible, like Expo) or only the contract
(polyglot, like Flutter)? That determines which shapes it can serve.

## What adding a mobile option touches

### 1. The workspace shape

`apps/mobile` is a peer **app** workspace (decision 2) — never a
bolt-on, always a free delete-the-folder toggle (absent when mobile is
none). The materializer gains a `materialize/mobile-<variant>.ts`
following the Expo/Flutter templates (see
[`../standards/cli-templates.md`](../standards/cli-templates.md)).

### 2. The auth-flow implications (decision 23)

Mobile auth is **legitimately different** from web — a different auth
architecture for a different runtime, not an inconsistency:

- tokens in **OS-managed secure storage** (`expo-secure-store` /
  `flutter_secure_storage`), not cookies;
- access token as a **Bearer header**; on 401, `/refresh` with the
  refresh token in the **body**, not a cookie;
- `/login` returns both tokens in the response body to mobile clients —
  the server's body-only / cookie-also fork (web gets cookies
  additionally).

A new mobile option must pick a storage primitive in the same spirit
(the platform-native mitigation — there's no httpOnly cookie on a
mobile device) and keep the sole-minter invariant (decision 11)
intact. The webview-mediated cookie reuse (decision 23's rejected
option B) is an explicit anti-pattern.

### 3. The contract-consumer story

How the mobile app consumes the contract:

- **Expo (TS shapes):** the **same typed Hono RPC `api-client`** as
  `apps/web` — web and mobile type against the api router via the same
  client (decision 26), never a separate fetch client or a shared-types
  library.
- **Flutter (polyglot shapes):** the **codegen'd Dart client** from
  `packages/contract` — the mobile shares *only* the contract
  (decision 4), never a TS package.

A new mobile option must have a client story on both sides (or be
scoped to the shapes it can serve). A separate hand-rolled fetch
client in a TS shape would reintroduce the dual source of types
decision 26 rejected.

### 4. The CI surface

Mobile is **blessed** (decision 29: web + mobile are the tested
envelope — Expo for TS shapes, Flutter for Go shapes). The option ships
a build-and-boot smoke test: compiles, boots, and the mobile auth flow
runs against the api (emulator at best; at minimum the typed client
compiles and the auth fetch is exercised — see
[`../standards/ci-matrix.md`](../standards/ci-matrix.md)).

### 5. The docs

`docs.ts` gains the option's composition-conditional docs
(`mobile-auth-flow.md` for the new variant, decision 31), and the
blessed-2×2 / auth docs in this repo mirror it.

## The bar

A new mobile option is judged on three questions: can it be a peer app
sharing the right thing (packages vs contract)? can it authenticate the
decision-23 way (secure storage + Bearer + body-refresh)? can it
consume the contract without a second source of types? Answer all
three honestly and it's a playbook-sized change; miss any and it's a
decision-level ADR reopening decisions 2/4/23.
