// Single version source for the CLI.
//
// Decision 35: the CLI version, the npm package version, and the Starter
// repo tag share ONE version. This module reads it from package.json (the
// file npm itself versions), so there is no second string to drift — the
// release pipeline (docs/contributing/release.md) enforces that
// packages/cli/package.json.version == the tag, and this is the value the
// materializer stamps into every scaffolded project's `starterVersion`
// field (decision 38).

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// package.json is always shipped with the npm package (npm includes the
// manifest automatically), so this resolves in the source tree, in the
// built dist/, and in the installed package alike.
const pkg = require('../package.json') as { version: string };

/** The CLI's own version — the single source for the tag and the
 *  scaffolded project's `starterVersion` field. */
export const VERSION: string = pkg.version;
