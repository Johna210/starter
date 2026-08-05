# The typed-RPC transport (decision 17b)

This is the *generator's* transport doc: the one rule that governs how
the web reaches the api over the wire, keyed to a runtime property
rather than a per-variant label.

## The rule

> **Batch by default; unbatch only where batching would defeat
> server-side fetch memoization.**

One rule, keyed to a **runtime property** (does the surrounding context
patch global `fetch` for per-request memoization?), not a per-variant
carve-out. The scaffolded project's `docs/architecture/typed-rpc-
transport.md` instantiates this per composition.

## How the rule plays out today

| Context | Patches `fetch`? | Transport |
|---|---|---|
| Vite SPA (TS shapes) | no — nothing runs server-side | fully batched |
| Next RSC / loaders (Go shapes) | yes — per-request memoization | unbatched |
| Next client components | no | batched |

The rule is robust to **future variants** (TanStack Start, decision 15):
when added, check whether its server context patches `fetch` — same
rule, no rewrite. Rejected alternatives, for the record:

- **Unbatched everywhere** — pays a real client-side perf cost for one
  wire shape, when the only reason to unbatch is environment-specific.
- **Naive split-by-context** ("httpLink server-side, httpBatchLink
  client-side" as label-based config) — same wire behavior, but
  expressed as a context label rather than a property: a per-variant
  carve-out in disguise, and less robust to future variants.

## What it protects

Decision 15's invariant is that the web-app swap changes only the
**rendering shell** — the data path is invariant (`api-client` is the
only door, typed, no bypasses — identical across variants). The
transport rule preserves that at the *logical* level while taking the
batching perf win everywhere it's safe. The only divergences are
transport-level (wire shape) and conditional on a verifiable property,
so the rule stays **one rule**, not per-variant config.

## The contributor's seam

When a new web variant lands (the `contributing/web-variant.md`
playbook), the transport question is **not** "which link does this
variant use?" — it's "does this variant's server context patch global
`fetch` for per-request memoization?" Answer that property and the rule
selects the transport. The doc templates for the new variant must state
the transport in those terms (batch-by-default / unbatch-where-...),
not as a variant label.
