#!/usr/bin/env bash
# Restarts the app on the running Android emulator/device WITHOUT rebuilding.
# Debug builds are pointed at Metro through the dev-client deep link; release builds just relaunch.
set -euo pipefail

PACKAGE_NAME="com.gorrr.mysterywatch.native"
METRO_PORT="${METRO_PORT:-8083}"

adb reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}" >/dev/null 2>&1 || true
adb shell am force-stop "${PACKAGE_NAME}"

if [ "${1:-}" = "release" ]; then
  adb shell am start -n "${PACKAGE_NAME}/.MainActivity" >/dev/null
else
  adb shell am start -a android.intent.action.VIEW \
    -d "exp+mystery-watch-native://expo-development-client/?url=http%3A%2F%2Flocalhost%3A${METRO_PORT}" "${PACKAGE_NAME}" >/dev/null
fi
echo "[restart] Android ${PACKAGE_NAME} relaunched"
