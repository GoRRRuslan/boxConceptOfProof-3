import { act, renderHook } from '@testing-library/react-native'

import { computeAnimatedNumber } from '@services/animation/computeAnimatedNumber'
import { useAnimatedNumber } from '@services/animation/useAnimatedNumber'

describe('computeAnimatedNumber', () => {
  it('starts at the old value and ends at the new one', () => {
    expect(computeAnimatedNumber(100, 40, 0, 700)).toBe(100)

    expect(computeAnimatedNumber(100, 40, 700, 700)).toBe(40)

    expect(computeAnimatedNumber(100, 40, 5000, 700)).toBe(40)
  })

  it('moves fast at first (ease out) and never overshoots', () => {
    expect(computeAnimatedNumber(0, 100, 100, 700)).toBeGreaterThan(100 * (100 / 700))

    expect(computeAnimatedNumber(0, 100, 350, 700)).toBeLessThanOrEqual(100)
  })
})

describe('useAnimatedNumber', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows the first value at once', async () => {
    const { result } = await renderHook(() => useAnimatedNumber(1000))

    expect(result.current).toBe(1000)
  })

  it('counts down to a new value over the duration instead of jumping', async () => {
    const { result, rerender } = await renderHook((value: number) => useAnimatedNumber(value, 700), { initialProps: 1000 })

    await rerender(400)

    expect(result.current).toBe(1000)

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300)
    })

    expect(result.current).toBeLessThan(1000)

    expect(result.current).toBeGreaterThan(400)

    await act(async () => {
      await jest.advanceTimersByTimeAsync(600)
    })

    expect(result.current).toBe(400)
  })
})
