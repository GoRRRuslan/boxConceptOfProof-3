import { summarizeFrameDeltas } from '@services/performance/summarizeFrameDeltas'

describe('summarizeFrameDeltas', () => {
  it('returns zeros for no frames', () => {
    expect(summarizeFrameDeltas([]).frames).toBe(0)

    expect(summarizeFrameDeltas([]).averageFps).toBe(0)
  })

  it('computes a steady 60 fps', () => {
    const stats = summarizeFrameDeltas(Array.from({ length: 60 }, () => 1000 / 60))

    expect(stats.frames).toBe(60)

    expect(stats.averageFps).toBeCloseTo(60)

    expect(stats.slowFrames).toBe(0)

    expect(stats.p95FrameMilliseconds).toBeCloseTo(16.67, 1)
  })

  it('counts slow frames and reports the p95 and max frame time', () => {
    const stats = summarizeFrameDeltas([...Array.from({ length: 18 }, () => 16), 40, 80])

    expect(stats.frames).toBe(20)

    expect(stats.slowFrames).toBe(2)

    expect(stats.maxFrameMilliseconds).toBe(80)

    expect(stats.p95FrameMilliseconds).toBe(40)
  })
})
