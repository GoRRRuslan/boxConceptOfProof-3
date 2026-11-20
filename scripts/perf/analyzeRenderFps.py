"""Aggregate the in-app renderer FPS meter.

The app prints one line per second:  [perf:<platform>] {"frames":..,"averageFps":..}
Usage: analyzeRenderFps.py <ios|android> <startLine> [endLine] [logFile]
  - capture Metro output:   yarn start | tee /tmp/metro.log
  - take `wc -l` before/after a scenario to select its lines
"""
import sys,json,re
plat=sys.argv[1]; start=int(sys.argv[2]); end=int(sys.argv[3]) if len(sys.argv)>3 else 10**9
log=sys.argv[4] if len(sys.argv)>4 else '/tmp/metro.log'
rows=[]
for i,l in enumerate(open(log),1):
    if i<=start or i>end: continue
    m=re.search(r'\[perf:'+plat+r'\] (\{.*\})',l)
    if m: rows.append(json.loads(m.group(1)))
if not rows: print('no samples'); sys.exit()
frames=sum(r['frames'] for r in rows); slow=sum(r['slowFrames'] for r in rows)
fps=[r['averageFps'] for r in rows]
w=sum(r['averageFps']*r['frames'] for r in rows)/frames
print(f"{plat}: samples={len(rows)} frames={frames} weightedFps={w:.1f} minWindowFps={min(fps):.1f} maxWindowFps={max(fps):.1f} p95ofWindows={sorted(r['p95FrameMilliseconds'] for r in rows)[int(len(rows)*0.95)-1 if len(rows)>1 else 0]:.1f}ms worstFrame={max(r['maxFrameMilliseconds'] for r in rows):.0f}ms slow={slow} ({100*slow/frames:.1f}%)")
