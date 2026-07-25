#!/usr/bin/env node
// create-fs-starter — entry point.
//
// Thin wrapper: parses argv, hands off to runCli, exits with the right
// code. The testable core lives in ./cli.js (runCli).

import { runCli } from './cli.js';

const argv = process.argv.slice(2);
runCli(argv).then((result) => {
  if (!result.ok) {
    if (result.reason !== 'usage' || result.exitCode !== 0) {
      console.error(result.message);
    } else {
      console.log(result.message);
    }
    process.exit(result.exitCode);
  }
});
