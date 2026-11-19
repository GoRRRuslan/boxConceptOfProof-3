import {
  clampToUnitInterval,
  computeAnimatedProgress,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  interpolate,
} from '@flows/openingFlow/_facadesLogic/openingEasing'

describe('openingEasing', () => {
  it('clamps to 0..1 and interpolates linearly', () => {
    expect(clampToUnitInterval(-3)).toBe(0)

    expect(clampToUnitInterval(7)).toBe(1)

    expect(interpolate(10, 20, 0.25)).toBe(12.5)
  })

  it.each([easeInOutCubic, easeOutBack, easeOutCubic])('starts at 0 and ends at 1', easing => {
    expect(easing(0)).toBeCloseTo(0)

    expect(easing(1)).toBeCloseTo(1)
  })

  it('easeInOutCubic is slow at the ends and symmetric', () => {
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1)

    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)

    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9)
  })

  it('easeOutBack overshoots 1 before settling', () => {
    const peak = Math.max(...[0.5, 0.6, 0.7, 0.8].map(easeOutBack))

    expect(peak).toBeGreaterThan(1)
  })

  describe('computeAnimatedProgress', () => {
    const base = { target: 1, fromProgress: 0, startedAtMilliseconds: 1000, durationMilliseconds: 500 }

    it('is at the start value before the animation begins', () => {
      expect(computeAnimatedProgress({ ...base, nowMilliseconds: 900 })).toBe(0)
    })

    it('reaches the target after the duration and stays there', () => {
      expect(computeAnimatedProgress({ ...base, nowMilliseconds: 1500 })).toBe(1)

      expect(computeAnimatedProgress({ ...base, nowMilliseconds: 9000 })).toBe(1)
    })

    it('is halfway after half of the duration', () => {
      expect(computeAnimatedProgress({ ...base, nowMilliseconds: 1250 })).toBeCloseTo(0.5)
    })

    it('reverses from where it was: back to 0 starting at 0.6', () => {
      const reversing = { ...base, fromProgress: 0.6, target: 0, startedAtMilliseconds: 2000 }

      expect(computeAnimatedProgress({ ...reversing, nowMilliseconds: 2000 })).toBeCloseTo(0.6)

      expect(computeAnimatedProgress({ ...reversing, nowMilliseconds: 2250 })).toBeCloseTo(0.3)

      expect(computeAnimatedProgress({ ...reversing, nowMilliseconds: 2500 })).toBeCloseTo(0)
    })
  })
})
