# The split-seam and the example split (decisions 10, 27)

This is the *generator's* doc for the microservices seam: what the
split-seam is, how the example split proves it, and why the axis is a
capability, not a business domain. The scaffolded project's
`docs/architecture/` shows the same structure from the reader's side.

## The split-seam

In microservices shapes (2, 4), `apps/api` ships with a clean
**split-seam** — the internal structure that makes it *able* to split:

- internal modules with **explicit interfaces** (the seam);
- a router mounting them at **prefixes** (`/items`, `/auth`);
- shared packages (TS shapes) or the contract (polyglot shapes) as the
  **inter-service boundary**.

The seam is **present whether or not a split has happened yet** — that
is exactly what makes the monolith a *modular* monolith (decision 27):
a microservices shape that hasn't split.

## The example split

The microservices shapes (2, 4) go one step further: one module is
extracted into a sibling `apps/api-auth` deployable to **prove the
seam is real** — not theoretical. The user's own later splits are
*copy the example*, not invent a new mechanism.

### The axis: capability, not domain

The example split extracts a **capability** (auth/IAM), not a business
domain. Every project has auth (a cross-cutting capability); not every
project has "users" as a domain. Capability splits are real *and*
domain-neutral — the example demonstrates the cut mechanics without
imposing the user's business decomposition. Extracting `apps/api-users`
as the example was explicitly rejected (decision 10): it would impose
a business domain every project doesn't have.

### Wrap, not replace (TS shape 2)

`apps/api-auth` *wraps* `packages/auth`; it does not replace it.
`packages/auth` remains the canonical auth implementation shared across
both TS shapes (1 & 2), including verification logic. The service owns
only the minting/login/register HTTP surface; `apps/api` verifies
tokens **locally** via the package import — no network hop for
verification (the *local-verify principle*).

### Verify via cached JWKS (polyglot shape 4)

No shared `packages/auth` exists across languages, so the wrap pattern
can't apply unchanged. `apps/api-auth` serves its public key material at
a contract-defined JWKS endpoint; `apps/api` fetches it, caches it on a
TTL, and verifies every request's signature locally against the cached
key. The contract is the only seam. Explicitly rejected: `GET /verify`
introspection per request (a hard-down failure mode when `api-auth` is
unreachable — the opposite of local-verify).

## Sole-minter invariant (decision 11)

Across *every* shape, exactly one process is configured to mint tokens:
`apps/api` in monolith shapes (1, 3), `apps/api-auth` in microservices
shapes (2, 4). Every other service holds only public-key material — it
can verify, never sign. The mechanism for distributing the public half
differs by shape (package import vs JWKS); the invariant is identical
and matters more than the mechanism.

## The contributor's seam

The scaffolded project ships exactly **one** example split — the same
one-E2E discipline as decision 22. A contributor who lands a new shape
must keep the example split honest: a real seam with a real example,
never a monolith-plus-README bait-and-switch (decision 10's rejected
option). Splitting another capability is the *user's* job, taught by
copying the example — see the scaffolded project's
`docs/standards/best-practices.md` for the per-seam guide.
