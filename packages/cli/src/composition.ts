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

/** The single currently-implemented composition (issue #3). */
export const TS_MONOLITH_VITE: Composition = {
  backend: 'ts',
  topology: 'monolith',
  web: 'vite',
  mobile: 'none',
  ai: 'off',
};

/** Returns true iff the CLI can actually materialize this composition. */
export function isImplemented(c: Composition): boolean {
  return (
    c.backend === TS_MONOLITH_VITE.backend &&
    c.topology === TS_MONOLITH_VITE.topology &&
    c.web === TS_MONOLITH_VITE.web &&
    c.mobile === TS_MONOLITH_VITE.mobile &&
    c.ai === TS_MONOLITH_VITE.ai
  );
}

/** Human-readable summary of a composition, e.g. "ts-monolith + vite + no mobile + ai off". */
export function describeComposition(c: Composition): string {
  const mobile = c.mobile === 'none' ? 'no mobile' : `${c.mobile} mobile`;
  const ai = c.ai === 'on' ? 'ai on' : 'ai off';
  return `${c.backend}-${c.topology} + ${c.web} web + ${mobile} + ${ai}`;
}
