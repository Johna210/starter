# The modular monolith (decision 27)

The monolith shapes (1, 3) ship `apps/api` as a **modular monolith**:
the *same* internal-module structure as the microservices split-seam
(decision 10), just without the example split having happened.

## What the generator produces

`apps/api` ships `internal/{auth,items}` modules with explicit
interfaces, a router mounting them at prefixes (`/auth`, `/items`) —
identical in structure to a microservices shape. The *only* difference
is that auth is still an `internal/auth` module, not a separate
deployable `apps/api-auth`.

That one difference is the whole point: a monolith is literally "a
microservices shape that hasn't split yet," so the monolith→microservices
upgrade is a **seam-preserving extraction** — copy the example split, no
refactor of `apps/api` required. The user's upgrade path is copy-paste,
not structural rewrite.

## Why this structure

Decision 10 defined the split-seam as "present whether or not a split
has happened yet." Decision 27 *names* what that already promised: the
"modular monolith" vocabulary. The example split (decision 10) teaches
the pattern on a structure **already prepared to receive it** — the
pedagogy is literal, not aspirational.

Rejected alternatives, for the record:

- **Flatter monolith** (routes directly on the api, no `internal/*`) —
  the monolith→microservices upgrade becomes a structural rewrite; the
  example split would "teach a pattern that isn't present in the
  monolith," undercutting decision 10's promise.
- **Hybrid** (loose `internal/*` folders in the monolith, hardened
  interfaces only in the microservices shape) — a fuzzy line, and two
  shapes with *different* module models is a real divergence to
  maintain in the templates.

## Diagram

```mermaid
graph LR
    subgraph "apps/api (monolith)"
        I["src/index.ts<br/>(router mounts)"]
        AUTH["internal/auth/<br/>repo.ts + routes.ts + index.ts"]
        ITEMS["internal/items/<br/>repo.ts + routes.ts + index.ts"]
    end

    subgraph "packages/"
        DB["@starter/db<br/>(Drizzle)"]
        AUTH_PKG["@starter/auth<br/>(argon2 + jose)"]
    end

    I -->|route('/auth')| AUTH
    I -->|route('/items')<br/>+ requireAuth| ITEMS
    AUTH -->|imports| AUTH_PKG
    AUTH -->|imports| DB
    ITEMS -->|imports| DB
```

(Go shapes follow the same modular-monolith structure with Go-native
internals; the seam vocabulary is identical.)

## The contributor's seam

The modular monolith is what makes "generatable-anything" (decision 24)
honest: whether the user picks monolith or microservices, the template
difference is small (the example split exists or not), and the shared
structure keeps the two template families from diverging. A template
change that touches `internal/*` must land in both the monolith and the
microservices templates at once — a divergence here silently re-creates
the flatter-monolith anti-pattern the decision rejected.
