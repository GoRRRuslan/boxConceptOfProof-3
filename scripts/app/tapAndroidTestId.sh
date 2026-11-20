#!/usr/bin/env bash
# Taps the centre of the Android view whose React Native testID matches (testID is exposed as resource-id).
# Usage: tapAndroidTestId.sh <testID>
set -euo pipefail

TEST_IDENTIFIER="${1:?usage: tapAndroidTestId.sh <testID>}"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
CENTER="$(adb shell cat /sdcard/ui.xml | python3 -I -c "
import re, sys
xml = sys.stdin.read()
match = re.search(r'resource-id=\"' + sys.argv[1] + r'\"[^>]*?bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"', xml)
if match:
    left, top, right, bottom = map(int, match.groups())
    print((left + right) // 2, (top + bottom) // 2)
" "${TEST_IDENTIFIER}")"

if [ -z "${CENTER}" ]; then
  echo "[tap] testID '${TEST_IDENTIFIER}' not found on screen" >&2
  exit 1
fi

# shellcheck disable=SC2086
adb shell input tap ${CENTER}
