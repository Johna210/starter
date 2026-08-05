# Wire it in: fence extension

This is the **fence-extension guide** — the contributor's analog of the
scaffolded project's `docs/wire-it-in/` (which is "how to fill in this
fence"). The scaffolded project inherits fences; the Starter **adds**
them. A fence lives in three places, and adding one means touching all
three:

1. a **`packages/*` shim** (decision 12) — the typed seam;
2. a **`docs/wire-it-in/` guide** in the scaffolded project — the seam
   presented to the user as "here's the handoff";
3. a **CLI prompt** — the fence is scaffold-time visible, not silent.

## The fence discipline (decision 12)

A fence is a *deliberate third path* between two rejected options:

- **"Genuinely real"** (shipping the full capability in the starter) —
  rejected: real auth has no minimum; shipping it turns the starter
  into a *maintained framework* (every CVE, every rotation bug lands
  forever). A fence is only viable when the "real" version is
  unbounded scope.
- **"Documented stub"** (a real seam wrapping a fake capability) —
  rejected: the same bait-and-switch as the monolith-plus-README; a
  real seam with a fake capability is theater.

The fence is the honest middle: the seam is real, the shim owns the
*surface* (not the implementation), and the rest is a deliberate,
documented handoff.

## The three places a fence lives

### 1. The shim (`packages/*`)

The shim is a thin typed layer over vetted upstream libraries. It
exports the *seams* the fence's implementation will hook into — the
token shape, the primitives, the store interfaces — but not the
capability itself. The fence's real implementation is the *user's* job,
built on the shim's exports.

### 2. The wire-it-in guide (`docs/wire-it-in/<fence>.md`)

Every fence gets a single doc in the scaffolded project's
`docs/wire-it-in/`, with the structure the existing fences follow
(`auth.md`, `ai.md`):

- **What the shim ships** — the honest surface (the seams the
  implementation hooks into).
- **What the shim does NOT ship (the fences)** — for each fenced item:
  what a real implementation looks like, *where the seam is* (which
  table/column/route/primitive), and links to the audited libraries the
  user would reach for. Decision 30: each fenced item is "a single doc:
  what the seam is, why it's fenced, what a real implementation looks
  like, links to the audited libraries."

### 3. The CLI prompt

A fence is scaffold-time **visible**: the CLI prompt surface names what
is and isn't shipped (e.g. the auth prompt's scope line). The user must
never discover a fence silently post-scaffold. If the capability is a
real scaffold-time axis (like AI, decision 20/21), it may be a prompt
option; if it's a fixed part of an always-on shim (like OAuth within
auth), it's a documented fence in the prompt's scope copy.

## What a new fence requires (the checklist)

1. **Audit the libraries** — a fence points at real, vetted libraries
   the user would reach for. No "imagine a library here."
2. **Extend the shim with the seam** — the typed surface the
   implementation hooks into (not the implementation).
3. **Write `docs/wire-it-in/<fence>.md`** — seam, why-fenced, what a
   real implementation looks like, library links.
4. **Update the prompt copy** — the fence is visible at scaffold time.
5. **Test-pyramid coverage (decision 22)** — the shim's *surface* ships
   unit-tested (real deps, like the auth shim's argon2/jose tests); the
   fenced implementation is the user's, tested in *their* pyramid.
6. **Anti-patterns doc** — add the rejected option to the scaffolded
   project's `docs/standards/anti-patterns.md` (what was rejected and
   why), so a reviewer asking "why isn't X scaffolded in?" gets a
   one-line answer.

## The contributor's playbook entry

The `contributing/` playbook's fence entry
([`../contributing/fence.md`](../contributing/fence.md)) is the
product-level "how to add a new fence to the five-axis composition";
this doc is the convention itself — the seam presentation contract a
new fence must satisfy across the three places.
