import { describe, expect, it } from 'vitest';
import {
  type Composition,
  describeComposition,
  GO_MICROSERVICES_NEXT,
  GO_MICROSERVICES_NEXT_AI,
  GO_MONOLITH_NEXT,
  isImplemented,
  TS_MONOLITH_VITE,
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

    it('returns false when mobile is enabled (Expo, Flutter, etc.)', () => {
      for (const mobile of ['expo', 'flutter'] as const) {
        const c: Composition = { ...TS_MONOLITH_VITE, mobile };
        expect(isImplemented(c)).toBe(false);
      }
    });

    it('returns true for Go + microservices + Next + AI (shape 4 + AI — implemented in issue #16)', () => {
      expect(isImplemented(GO_MICROSERVICES_NEXT_AI)).toBe(true);
    });

    it('returns false when AI is on for every other shape (AI is a shape-4-only axis today)', () => {
      for (const base of [TS_MONOLITH_VITE, GO_MONOLITH_NEXT]) {
        const c: Composition = { ...base, ai: 'on' };
        expect(isImplemented(c), `${describeComposition(c)} should be unimplemented`).toBe(false);
      }
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
