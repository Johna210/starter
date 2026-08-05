# Architecture Decision Records (ADRs)

This directory is where the **Starter's own future architectural
decisions** get recorded — the decisions *after* the ones locked in
`CONTEXT.md`. This document (`CONTEXT.md`) is the **predecessor** of
this convention: it records the decisions that produced the Starter.
New decisions move into `docs/adr/NNNN-….md` files following the same
convention.

The recursion is deliberate (decision 30): a contributor who learns the
ADR pattern from a scaffolded project's `docs/adr/` (inherited from
this Starter) finds the **same convention** here — in both repos, new
decisions get recorded as numbered ADR files.

## The convention

An ADR is a short document that records a single architectural
decision: the context, the options considered, the decision made, and
the consequences. Each ADR lives in its own file:

```
docs/adr/
  0001-add-a-new-web-variant.md
  0002-switch-contract-mechanism.md
```

### File naming

`<NNNN>-<kebab-case-title>.md` — a zero-padded number (sequential),
followed by a short, descriptive title. The number is the ADR's
identity; the title is for humans.

### Template

Every ADR follows the same structure (adapted from Michael Nygard's
[Documenting Architecture Decisions](https://adr.github.io/)):

```markdown
# NNNN. <Title>

Date: YYYY-MM-DD
Status: proposed | accepted | superseded by [ADR NNNN] | deprecated

## Context

What is the issue we're facing? What are the forces at play?

## Decision

What is the change that we're proposing and have agreed to?

## Consequences

What becomes easier or more difficult to do because of this change?
```

### Recording the rejected options

The Starter's `CONTEXT.md` convention is that a decision's **negative
space** is as valuable as the affirmative choice — every locked decision
records its rejected options, and the scaffolded project's
`docs/standards/anti-patterns.md` draws from them. ADRs here follow the
same discipline: record what was considered and rejected, and why.

## When to write an ADR

Write one when you make a decision that:

- changes the five-axis composition (a new web variant, api framework,
  mobile option, fence, contract mechanism, or blessed combination —
  the `docs/contributing/` playbook);
- changes the workspace grammar (a new `apps/*` / `packages/*` shape);
- changes the scaffolded project's structure (the mirror, the materializer);
- reopens a locked decision in `CONTEXT.md` (supersede, don't silently
  override — flag the conflict explicitly).

You don't need an ADR for: adding a route, adding a column, fixing a
bug, writing a doc. The bar is "this decision shapes the architecture."

## Relationship to CONTEXT.md

`CONTEXT.md` at the repo root is the living glossary + the decisions
locked up to the 1.0 criteria (decision 36). It remains the entry point
for domain vocabulary and the pre-1.0 decision history. Decisions
recorded here in `docs/adr/` are the *post-1.0* evolution — the
Starter's own growth beyond what the locked decisions pinned down. When
an ADR supersedes a locked decision, update `CONTEXT.md` to point at
the superseding ADR rather than silently editing history.
