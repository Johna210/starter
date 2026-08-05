# Contributing: adding a new fence

The playbook entry for adding a new **fence** to the auth shim (or an
always-on shim) — the product-level "how to add a new fenced capability"
(decision 12). The convention itself — how the seam is presented across
the three places a fence lives — is in
[`../wire-it-in/fence-extension.md`](../wire-it-in/fence-extension.md);
this entry is the checklist against the contribution model.

## What a fence is

A fence is a **deliberate handoff**: a capability the starter does *not*
ship (email verification, password reset, MFA, account lockout,
social/OAuth, RBAC — decision 12's exact list), but whose **seam** is
real — the shim owns the surface, the user owns the implementation. A
fence is only viable when the "genuinely real" version is unbounded
scope; and a fence is never a stub (a real seam wrapping a fake
capability is the bait-and-switch decision 12 rejected).

## The three places, plus the test pyramid

Decision 34/decision 12's fence lives in **three** places (the shim,
the `/docs/wire-it-in/` guide, the CLI prompt) — and the test pyramid
(decision 22) is the fourth thing the checklist covers:

### 1. The shim (`packages/*`)

Extend the shim with the **typed seam** the fence's implementation
hooks into — the token shape, primitives, store interfaces — never the
implementation itself. The shim stays a thin typed layer over vetted
upstream libraries; the fence's real implementation is the user's job,
built on the shim's exports.

### 2. The `/docs/wire-it-in/` guide (scaffolded project)

Every fence gets a single doc in the scaffolded project's
`docs/wire-it-in/` (`auth.md` is the model): what the shim ships, what
it does NOT ship, and for each fenced item — what a real implementation
looks like, **where the seam is** (which table/column/route/primitive),
and links to the **audited libraries** the user would reach for.

### 3. The CLI prompt

The fence is scaffold-time **visible**: the prompt's scope copy names
what is and isn't shipped. The user never discovers a fence silently
post-scaffold. (If the capability is a real scaffold-time axis — like
AI, decision 20/21 — it may be a prompt *option* instead of a fence;
the distinction is whether the user's composition choice determines its
presence.)

### 4. The test-pyramid coverage (decision 22)

The shim's *surface* ships unit-tested against real dependencies (the
auth shim's argon2/jose tests are the model — decision 22's "real
dependencies, not mocks"). The fenced implementation is the user's,
tested in *their* pyramid. And the **anti-patterns doc** gains the
rejected option (the scaffolded project's
`docs/standards/anti-patterns.md`) so a reviewer asking "why isn't X
scaffolded in?" gets a one-line answer.

## What does NOT change

- **The sole-minter invariant (decision 11)** — a fence never adds a
  second token-minter; it hooks the existing surface.
- **The auth-flow contracts (decisions 16, 23)** — web's httpOnly-
  cookie flow and mobile's secure-storage flow are unchanged by a
  fence; the fence is a wire-it-in item *on top of* them.
- **The four-endpoint shim scope** — adding a fence does not broaden
  the shipped surface; it documents a handoff.

## The bar

A new fence is accepted when: the capability is genuinely unbounded in
scope (fence-able), the seam is real and typed, the wire-it-in guide
names the seam + audited libraries, the prompt is honest, and the
shim's surface stays unit-tested. If the capability *is* bounded (it
fits the starter's scope), it should be **scaffolded in** instead — a
fence for a bounded capability is a cop-out.
