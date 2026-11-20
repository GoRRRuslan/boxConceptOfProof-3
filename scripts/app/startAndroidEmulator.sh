#!/usr/bin/env bash
# Starts the Android emulator HEADLESS (no window) and waits until it has booted.
# Headless keeps measurements free of window effects (the windowed emulator also reaches 60 fps with the
# finished app, but a freshly booted one can be slower for a minute). Stop other simulators first.
# Usage: startAndroidEmulator.sh [avdName=MW_Pixel9_API_37]
set -euo pipefail

AVD_NAME="${1:-MW_Pixel9_API_37}"
EMULATOR="${ANDROID_HOME:-$HOME/Library/Android/sdk}/emulator/emulator"

if adb devices | grep -q "emulator-.*device$"; then
  echo "[emulator] already running"
  exit 0
fi

nohup "${EMULATOR}" -avd "${AVD_NAME}" -no-snapshot -no-window -gpu host -no-boot-anim >/tmp/android-emulator.log 2>&1 &

for _ in $(seq 1 60); do
  if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
    echo "[emulator] ${AVD_NAME} booted (headless)"
    exit 0
  fi
  sleep 3
done

echo "[emulator] boot timed out, see /tmp/android-emulator.log" >&2
exit 1
