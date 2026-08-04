import { describe, expect, it } from 'vitest';
import {
  type Composition,
  describeComposition,
  GO_MICROSERVICES_NEXT,
  GO_MICROSERVICES_NEXT_AI,
  GO_MONOLITH_NEXT,
  isImplemented,
  TS_MONOLITH_VITE,
  TS_MICROSERVICES_VITE_EXPO,
  TS_MONOLITH_VITE_EXPO,
} from '../src/composition.js';

describe('composition', () => {
  describe('isImplemented', () => {
    it('returns true for the only currently-implemented composition (TS-monolith + Vite+TanStack + no-mobile + no-AI)', () => {
      expect(isImplemented(TS_MONOLITH_VITE)).toBe(true);
    });

    it('returns true for TS + microservices (shape 2 — implemented in issue #12)', () => {
      const c: Composition = { ...TS_MONOLITH_VITE, topology: 'microservices' };
      expect(isImplemented(c)).toBe(true);
    });

    it('returns true for Go + monolith + Next (shape 3 — implemented in issue #13)', () => {
      expect(isImplemented(GO_MONOLITH_NEXT)).toBe(true);
    });

    it('returns false for Go + monolith with the TS web variant (only the blessed web default is wired)', () => {
      const c: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
      expect(isImplemented(c)).toBe(false);
    });

    it('returns true for Go + microservices + Next (shape 4 — implemented in issue #15)', () => {
      expect(isImplemented(GO_MICROSERVICES_NEXT)).toBe(true);
    });

    it('returns false when web variant differs (Next instead of Vite)', () => {
      const c: Composition = { ...TS_MONOLITH_VITE, web: 'next' };
      expect(isImplemented(c)).toBe(false);
    });

    it('returns true for the TS Expo compositions (issue #18)', () => {
      expect(isImplemented(TS_MONOLITH_VITE_EXPO)).toBe(true);
      expect(isImplemented(TS_MICROSERVICES_VITE_EXPO)).toBe(true);
    });

    it('returns false for Flutter until the polyglot mobile ticket lands', () => {
      const c: Composition = { ...TS_MONOLITH_VITE, mobile: 'flutter' };
      expect(isImplemented(c)).toBe(false);
    });

    it('returns false for Expo on a Go shape', () => {
      const c: Composition = { ...GO_MONOLITH_NEXT, mobile: 'expo' };
      expect(isImplemented(c)).toBe(false);
    });

    it('returns true for Go + microservices + Next + AI (shape 4 + AI — implemented in issue #16)', () => {
      expect(isImplemented(GO_MICROSERVICES_NEXT_AI)).toBe(true);
    });

    it('returns true for TS-monolith + AI on (shape 1 + AI — implemented in issue #17)', () => {
      const c: Composition = { ...TS_MONOLITH_VITE, ai: 'on' };
      expect(isImplemented(c)).toBe(true);
    });

    it('returns false when AI is on for every other non-AI shape (AI is a TS-monolith + Go-microservices axis today)', () => {
      const c: Composition = { ...GO_MONOLITH_NEXT, ai: 'on' };
      expect(isImplemented(c), `${describeComposition(c)} should be unimplemented`).toBe(false);
    });
  });

  describe('describeComposition', () => {
    it('produces a human-readable summary of the composition', () => {
      const summary = describeComposition(TS_MONOLITH_VITE);
      // Should mention all five axes in a glance-readable way.
      expect(summary).toContain('ts');
      expect(summary).toContain('monolith');
      expect(summary).toContain('vite');
      expect(summary).toContain('no mobile');
      expect(summary).toContain('ai off');
    });
  });
});
