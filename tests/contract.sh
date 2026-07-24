#!/usr/bin/env bash
# tests/contract.sh — Taskfile contract: required tasks are declared and run cleanly.
#
# This is the test suite the Starter repo runs as `task test`. For the
# prefactor, the contract is minimal: the three orchestration targets
# (dev, test, build) must exist and the non-meta ones (dev, build) must
# run and exit 0. `test` is the meta-test, so it doesn't call itself.

set -euo pipefail
cd "$(dirname "$0")/.."

# 1. Assert required tasks are declared.
LIST=$(task --list)
for required in dev test build; do
  if ! echo "$LIST" | grep -qE "^[[:space:]]*\*[[:space:]]+${required}\b"; then
    echo "FAIL: task '${required}' not found in 'task --list'" >&2
    echo "$LIST" >&2
    exit 1
  fi
done

# 2. Assert dev and build run cleanly (no recursion with `test`).
echo "ok: task dev"
task dev

echo "ok: task build"
task build

echo "ok: all task contract checks passed"
