#!/usr/bin/env bash
# Waits (up to 25 s) until the testID is on screen, then taps it. Usage: waitTapAndroidTestId.sh <testID>
set -uo pipefail
for _ in $(seq 1 25); do
  if bash "$(dirname "$0")/tapAndroidTestId.sh" "$1" 2>/dev/null; then exit 0; fi
  sleep 1
done
echo "[wait] testID '$1' never appeared" >&2
exit 1
