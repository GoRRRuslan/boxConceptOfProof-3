#!/usr/bin/env bash
# Starts/stops the long-lived FPS collector used by iOS measurements. It must outlive individual
# measurements: the app keeps an HTTP connection alive, and restarting the server between windows
# makes its next requests fail silently.
# Usage: perfSinkControl.sh start|stop|status
set -euo pipefail

ROOT_DIRECTORY="$(cd "$(dirname "$0")/../.." && pwd)"
CACHE_DIRECTORY="${ROOT_DIRECTORY}/.cache/perf"
PID_FILE="${CACHE_DIRECTORY}/sink.pid"
LOG_FILE="${CACHE_DIRECTORY}/ios-sink.log"
mkdir -p "${CACHE_DIRECTORY}"

is_running() {
  [ -f "${PID_FILE}" ] && kill -0 "$(cat "${PID_FILE}")" 2>/dev/null
}

case "${1:-status}" in
  start)
    if is_running; then
      echo "[sink] already running (pid $(cat "${PID_FILE}"))"
    else
      nohup python3 "${ROOT_DIRECTORY}/scripts/perf/perfSink.py" ios "${LOG_FILE}" > /dev/null 2>&1 &
      echo $! > "${PID_FILE}"
      echo "[sink] started (pid $(cat "${PID_FILE}")), writing ${LOG_FILE}"
    fi
    ;;
  stop)
    if is_running; then kill "$(cat "${PID_FILE}")"; rm -f "${PID_FILE}"; echo "[sink] stopped"; else echo "[sink] not running"; fi
    ;;
  status)
    if is_running; then echo "[sink] running (pid $(cat "${PID_FILE}"))"; else echo "[sink] not running"; fi
    ;;
esac
