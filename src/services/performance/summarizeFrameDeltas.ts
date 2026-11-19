export interface IRenderFrameStats {
  frames: number
  averageFps: number
  averageFrameMilliseconds: number
  p95FrameMilliseconds: number
  maxFrameMilliseconds: number
  slowFrames: number
}

// Frames slower than this are counted as dropped on a 60 Hz display (1.5 vsync intervals).
export const SLOW_FRAME_THRESHOLD_MILLISECONDS = 25

// Pure summary of per-frame durations.
export const summarizeFrameDeltas = (frameDeltasMilliseconds: number[]): IRenderFrameStats => {
  const frames = frameDeltasMilliseconds.length

  if (frames === 0) {
    return {
      frames: 0,
      averageFps: 0,
      averageFrameMilliseconds: 0,
      p95FrameMilliseconds: 0,
      maxFrameMilliseconds: 0,
      slowFrames: 0,
    }
  }

  const sortedDeltas = [...frameDeltasMilliseconds].sort((first, second) => first - second)
  const totalMilliseconds = frameDeltasMilliseconds.reduce((sum, delta) => sum + delta, 0)
  const averageFrameMilliseconds = totalMilliseconds / frames
  const p95Index = Math.min(frames - 1, Math.ceil(frames * 0.95) - 1)

  return {
    frames,
    averageFps: 1000 / averageFrameMilliseconds,
    averageFrameMilliseconds,
    p95FrameMilliseconds: sortedDeltas[p95Index],
    maxFrameMilliseconds: sortedDeltas[frames - 1],
    slowFrames: frameDeltasMilliseconds.filter(delta => delta > SLOW_FRAME_THRESHOLD_MILLISECONDS).length,
  }
}
