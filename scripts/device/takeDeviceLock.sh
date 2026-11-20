#!/usr/bin/env bash
# Two agents share this Mac: only ONE simulator / emulator may run at a time across both (they share the GPU and CPU).
# Usage: takeDeviceLock.sh take|release|status
set -euo pipefail

LOCK_DIRECTORY="/tmp/mystery-watch-device.lock"
OWNER_NAME="boxConceptOfProof-3"

case "${1:-status}" in
  take)
    until mkdir "${LOCK_DIRECTORY}" 2>/dev/null; do
      echo "[lock] held by $(cat "${LOCK_DIRECTORY}/owner" 2>/dev/null || echo unknown), waiting 30 s"
      sleep 30
    done
    echo "${OWNER_NAME}" > "${LOCK_DIRECTORY}/owner"
    echo "[lock] taken"
    ;;
  release)
    xcrun simctl shutdown all 2>/dev/null || true
    adb emu kill 2>/dev/null || true
    rm -rf "${LOCK_DIRECTORY}"
    echo "[lock] released"
    ;;
  status)
    if [ -d "${LOCK_DIRECTORY}" ]; then echo "held by $(cat "${LOCK_DIRECTORY}/owner" 2>/dev/null)"; else echo "free"; fi
    ;;
esac
