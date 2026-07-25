// Prompt definitions for the five-axis CLI composition (decision 24).
//
// The actual interactive prompting uses @clack/prompts; the pure
// decision/validation logic lives in composition.ts. This module is the
// thin UX layer that maps the five questions to a Composition object.

import { type Ai, type Backend, type Mobile, type Topology, type Web } from './composition.js';

export interface PromptAnswers {
  backend: Backend;
  topology: Topology;
  web: Web;
  mobile: Mobile;
  ai: Ai;
}

/** Default composition: TS-monolith + Vite+TanStack + no-mobile + no-AI. */
export const DEFAULT_ANSWERS: PromptAnswers = {
  backend: 'ts',
  topology: 'monolith',
  web: 'vite',
  mobile: 'none',
  ai: 'off',
};
