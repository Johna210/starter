#!/usr/bin/env node
// create-fs-starter — scaffold a new fullstack project from this Starter.
//
// The CLI composes five prompt axes (decision 24):
//   1. backend-language  (TS | Go)
//   2. topology          (monolith | microservices)
//   3. web variant       (Next | Vite+TanStack | TanStack-Start-later)
//   4. mobile            (Expo | Flutter | none)
//   5. AI                (on | off)
//
// For this ticket only one composition is implemented:
//   TS-monolith + Vite+TanStack + no-mobile + no-AI
// All other compositions produce a friendly error (and the CLI's own
// tests assert those error paths).

const VERSION = '0.1.0';

console.log(`create-fs-starter v${VERSION}`);
console.log('Scaffolding logic lands in subsequent commits (composition, materializer, prompts).');
