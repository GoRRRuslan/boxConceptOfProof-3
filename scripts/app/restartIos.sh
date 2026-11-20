#!/usr/bin/env bash
# Restarts the app on the booted iOS simulator WITHOUT rebuilding (kill + relaunch).
set -euo pipefail

BUNDLE_IDENTIFIER="com.gorrr.mysterywatch.native"

xcrun simctl terminate booted "${BUNDLE_IDENTIFIER}" 2>/dev/null || true
PROCESS_IDENTIFIER="$(xcrun simctl launch booted "${BUNDLE_IDENTIFIER}" | awk -F': ' '{print $2}')"
echo "[restart] iOS ${BUNDLE_IDENTIFIER} relaunched (pid ${PROCESS_IDENTIFIER})"
