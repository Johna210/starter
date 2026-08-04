// Composition: the five prompt axes the CLI composes (decision 24).
//
//   1. backend  — 'ts' | 'go'
//   2. topology — 'monolith' | 'microservices'
//   3. web      — 'next' | 'vite' | 'tanstack-start' (reserved, not yet implemented)
//   4. mobile   — 'expo' | 'flutter' | 'none'
//   5. ai       — 'on' | 'off'
//
// Per decision 24 the CLI can compose any of the 2x2x... axes
// ("generatable-anything") but only the 4 blessed combos (decision 7)
// carry CI guarantees. For issue #3, only the first blessed combo is
// actually materializable; the other 23+ compositions produce a
// friendly error and exit non-zero.

export type Backend = 'ts' | 'go';
export type Topology = 'monolith' | 'microservices';
export type Web = 'next' | 'vite' | 'tanstack-start';
export type Mobile = 'expo' | 'flutter' | 'none';
export type Ai = 'on' | 'off';

export interface Composition {
  backend: Backend;
  topology: Topology;
  web: Web;
  mobile: Mobile;
  ai: Ai;
}

/** Shape 1: TS-monolith + Vite+TanStack (issue #3). */
export const TS_MONOLITH_VITE: Composition = {
  backend: 'ts',
  topology: 'monolith',
  web: 'vite',
  mobile: 'none',
  ai: 'off',
};

/**
 * Shape 1 + AI on (issue #17): the TS-monolith composition with the
 * AI primitives package (decision 5 — TS shapes ship AI as an embedded
 * TS library in packages/ai). packages/ai exposes the composable
 * primitives (decision 20): chat completion (with streaming),
 * embeddings, a VectorStore interface (pgvector default, reusing
 * decision 14's Postgres), and tool/function calling — each a real
 * typed layer over a vetted SDK. No example composition is shipped.
 * This is an UNBLESSED combination (decision 24/29): generatable, but
 * AI is not in the CI-tested matrix — the CLI emits a documented
 * warning.
 */
export const TS_MONOLITH_VITE_AI: Composition = {
  backend: 'ts',
  topology: 'monolith',
  web: 'vite',
  mobile: 'none',
  ai: 'on',
};

/** Shape 2: TS-microservices + Vite+TanStack (issue #12). */
export const TS_MICROSERVICES_VITE: Composition = {
  backend: 'ts',
  topology: 'microservices',
  web: 'vite',
  mobile: 'none',
  ai: 'off',
};

/**
 * Shape 3: Go-monolith + Next (issue #13, base).
 *
 * The blessed Go-monolith web variant is Next.js (decision 24b) — the
 * web itself lands in ticket 12; this ticket materializes the api +
 * contract mechanism only.
 */
export const GO_MONOLITH_NEXT: Composition = {
  backend: 'go',
  topology: 'monolith',
  web: 'next',
  mobile: 'none',
  ai: 'off',
};

/**
 * Shape 4: Go-microservices + Next, AI off (issue #15).
 *
 * The example split (decision 10) on the capability axis (auth/IAM):
 * apps/api-auth is a separate Go deployable — the sole minter of JWTs
 * (decision 11) owning the four auth endpoints + the JWKS endpoint —
 * and apps/api verifies tokens locally against the fetched-and-cached
 * JWKS (decision 11's local-verify principle). No packages/auth across
 * languages: the contract is the only seam (decision 9).
 */
export const GO_MICROSERVICES_NEXT: Composition = {
  backend: 'go',
  topology: 'microservices',
  web: 'next',
  mobile: 'none',
  ai: 'off',
};

/**
 * Shape 4 + AI on (issue #16): the Go-microservices composition with
 * the Python/FastAPI AI service (decision 5 — the one shape where AI
 * is Python, justified by Python's AI ecosystem advantage once the
 * build is already polyglot). apps/ai exposes the composable
 * primitives (decision 20) over its own contract surface
 * (packages/contract/openapi.ai.yaml, Python-generated); apps/api
 * calls it through the generated Go client — never raw HTTP. This is
 * an UNBLESSED combination (decision 24/29): generatable, but AI is
 * not in the CI-tested matrix — the CLI emits a documented warning.
 */
export const GO_MICROSERVICES_NEXT_AI: Composition = {
  backend: 'go',
  topology: 'microservices',
  web: 'next',
  mobile: 'none',
  ai: 'on',
};

/** Returns true iff the CLI can actually materialize this composition. */
export function isImplemented(c: Composition): boolean {
  return (
    isTsMonolithVite(c) ||
    isTsMonolithViteAi(c) ||
    isTsMicroservicesVite(c) ||
    isGoMonolithNext(c) ||
    isGoMicroservicesNext(c) ||
    isGoMicroservicesNextAi(c)
  );
}


export function isTsMonolithVite(c: Composition): boolean {
  return (
    c.backend === TS_MONOLITH_VITE.backend &&
    c.topology === TS_MONOLITH_VITE.topology &&
    c.web === TS_MONOLITH_VITE.web &&
    c.mobile === TS_MONOLITH_VITE.mobile &&
    c.ai === TS_MONOLITH_VITE.ai
  );
}

export function isTsMonolithViteAi(c: Composition): boolean {
  return (
    c.backend === TS_MONOLITH_VITE_AI.backend &&
    c.topology === TS_MONOLITH_VITE_AI.topology &&
    c.web === TS_MONOLITH_VITE_AI.web &&
    c.mobile === TS_MONOLITH_VITE_AI.mobile &&
    c.ai === TS_MONOLITH_VITE_AI.ai
  );
}

export function isTsMicroservicesVite(c: Composition): boolean {
  return (
    c.backend === TS_MICROSERVICES_VITE.backend &&
    c.topology === TS_MICROSERVICES_VITE.topology &&
    c.web === TS_MICROSERVICES_VITE.web &&
    c.mobile === TS_MICROSERVICES_VITE.mobile &&
    c.ai === TS_MICROSERVICES_VITE.ai
  );
}

export function isGoMonolithNext(c: Composition): boolean {
  return (
    c.backend === GO_MONOLITH_NEXT.backend &&
    c.topology === GO_MONOLITH_NEXT.topology &&
    c.web === GO_MONOLITH_NEXT.web &&
    c.mobile === GO_MONOLITH_NEXT.mobile &&
    c.ai === GO_MONOLITH_NEXT.ai
  );
}

export function isGoMicroservicesNext(c: Composition): boolean {
  return (
    c.backend === GO_MICROSERVICES_NEXT.backend &&
    c.topology === GO_MICROSERVICES_NEXT.topology &&
    c.web === GO_MICROSERVICES_NEXT.web &&
    c.mobile === GO_MICROSERVICES_NEXT.mobile &&
    c.ai === GO_MICROSERVICES_NEXT.ai
  );
}

export function isGoMicroservicesNextAi(c: Composition): boolean {
  return (
    c.backend === GO_MICROSERVICES_NEXT_AI.backend &&
    c.topology === GO_MICROSERVICES_NEXT_AI.topology &&
    c.web === GO_MICROSERVICES_NEXT_AI.web &&
    c.mobile === GO_MICROSERVICES_NEXT_AI.mobile &&
    c.ai === GO_MICROSERVICES_NEXT_AI.ai
  );
}

/** Human-readable summary of a composition, e.g. "ts-monolith + vite + no mobile + ai off". */
export function describeComposition(c: Composition): string {
  const mobile = c.mobile === 'none' ? 'no mobile' : `${c.mobile} mobile`;
  const ai = c.ai === 'on' ? 'ai on' : 'ai off';
  return `${c.backend}-${c.topology} + ${c.web} web + ${mobile} + ${ai}`;
}
