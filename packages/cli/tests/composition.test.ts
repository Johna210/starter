import { describe, expect, it } from 'vitest';
import {
  type Composition,
  describeComposition,
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

    it('returns false for Go + monolith (shape 3 — not yet implemented)', () => {
      const c: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
      expect(isImplemented(c)).toBe(false);
    });

    it('returns false for Go + microservices (shape 4 — not yet implemented)', () => {
      const c: Composition = { ...TS_MONOLITH_VITE, backend: 'go', topology: 'microservices' };
      expect(isImplemented(c)).toBe(false);
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

    it('returns false when AI is on', () => {
      const c: Composition = { ...TS_MONOLITH_VITE, ai: 'on' };
      expect(isImplemented(c)).toBe(false);
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
