// Materializer: packages/contract templates for the Go-monolith
// (shape 3) base.
//
// In the polyglot shapes (3 & 4) packages/contract is the ONLY shared
// package (decision 9): the committed openapi.yaml — generated from the
// Go api's structs via Huma (decision 19, Go-as-canonical-side) — plus
// the generated TS and Dart clients.
//
// The full contract package (openapi.yaml, TS client generator +
// committed generated client, Dart client) lands in the next slice of
// issue #13.

import { type ProjectContext } from './_shared.js';

export async function writeGoContract(_ctx: ProjectContext): Promise<void> {
  // TODO(issue #13, slice 2): write packages/contract — openapi.yaml
  // (generated from the Go structs and committed), the TS client
  // generator with its committed output, and the Dart client for the
  // Flutter mobile (ticket 17).
}
