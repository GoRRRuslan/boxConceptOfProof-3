#!/usr/bin/env bash
# Usage: measureAndroidFlow.sh [package] [activity] [label]  (defaults: this repository)
# Warm-up, 35 s of list flings, then a whole opening flow; prints FPS per phase from the in-app meter ([perf:android] lines).
set -euo pipefail
PKG="${1:-com.gorrr.mysterywatch.native}"; ACT="${2:-com.gorrr.mysterywatch.nativeapp.MainActivity}"; LABEL="${3:-flow}"
ROOT_DIRECTORY="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "${ROOT_DIRECTORY}/.cache/perf"
OUT="${ROOT_DIRECTORY}/.cache/perf/android-$LABEL.log"
adb shell am force-stop "$PKG"
adb logcat -c
adb logcat -v epoch ReactNativeJS:I '*:S' > "$OUT" 2>/dev/null &
LOGCAT=$!
trap 'kill $LOGCAT 2>/dev/null || true' EXIT
adb shell am start -n "$PKG/$ACT" >/dev/null
sleep 16
T_SCROLL_START=$(date +%s)
END=$((T_SCROLL_START + 35))
while [ "$(date +%s)" -lt "$END" ]; do
  adb shell input swipe 540 1900 540 500 450
  adb shell input swipe 540 500 540 1900 450
done
T_SCROLL_END=$(date +%s)
for i in 1 2 3; do adb shell input swipe 540 500 540 1900 200; done
sleep 2
T_FLOW_START=$(date +%s)
adb shell input tap 540 560; sleep 2.5
adb shell input swipe 300 1400 850 1250 350; sleep 1.2
adb shell input tap 540 2048; sleep 3
adb shell input tap 540 2048; sleep 11
T_FLOW_END=$(date +%s)
adb shell input tap 540 2048; sleep 3
kill $LOGCAT 2>/dev/null || true
python3 - "$OUT" "$T_SCROLL_START" "$T_SCROLL_END" "$T_FLOW_START" "$T_FLOW_END" "$LABEL" <<'P'
import sys,re,json
path,ss,se,fs,fe,label=sys.argv[1],*map(float,sys.argv[2:6]),sys.argv[6]
rows=[]
for line in open(path,errors='ignore'):
    m=re.match(r'\s*([0-9.]+)\s+.*?\[perf:android\]\s*(\{.*\})',line)
    if m:
        try: rows.append((float(m.group(1)),json.loads(m.group(2))))
        except Exception: pass
def summ(name,lo,hi):
    w=[r for t,r in rows if lo<=t<=hi]
    if not w: print(f"{label:22} {name:7} no windows"); return
    frames=sum(r['frames'] for r in w); slow=sum(r.get('slowFrames',0) for r in w)
    fps=[r['averageFps'] for r in w]
    good=sum(1 for f in fps if f>=59)
    print(f"{label:22} {name:7} windows={len(w):3d} avgFps={sum(fps)/len(fps):5.1f} minWindow={min(fps):5.1f} windows>=59: {good}/{len(w)}  slowFrames={slow} worstFrameMs={max(r['maxFrameMilliseconds'] for r in w):6.1f}")
summ('scroll',ss+3,se)
summ('opening',fs,fe)
P
