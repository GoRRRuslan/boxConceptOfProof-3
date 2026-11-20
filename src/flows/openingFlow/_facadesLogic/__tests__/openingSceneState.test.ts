import {
  ANTICIPATION_DURATION_MILLISECONDS,
  ANTICIPATION_SWELL,
  FOCUS_DURATION_MILLISECONDS,
  GLOW_MAXIMUM,
  LID_OPEN_DURATION_MILLISECONDS,
  TUCK_DURATION_MILLISECONDS,
} from '@flows/openingFlow/_config/openingConfig'
import {
  INITIAL_OPENING_SCENE_STATE,
  computeAnticipationEffect,
  computeGlowStrength,
  getAnticipationProgress,
  getFocusProgress,
  getLidProgress,
  getTuckProgress,
  startClose,
  startFocus,
  setGlowColor,
  startLidOpen,
  startTuck,
} from '@flows/openingFlow/_facadesLogic/openingSceneState'

describe('openingSceneState', () => {
  it('is idle at the start: nothing focused, lid closed', () => {
    expect(getFocusProgress(INITIAL_OPENING_SCENE_STATE, 5000)).toBe(0)

    expect(getLidProgress(INITIAL_OPENING_SCENE_STATE, 5000)).toBe(0)
  })

  it('focusing a card flies it to the centre over the focus duration', () => {
    const state = startFocus(INITIAL_OPENING_SCENE_STATE, 3, 1000)

    expect(state.focusedCardIndex).toBe(3)

    expect(getFocusProgress(state, 1000)).toBe(0)

    expect(getFocusProgress(state, 1000 + FOCUS_DURATION_MILLISECONDS / 2)).toBeCloseTo(0.5)

    expect(getFocusProgress(state, 1000 + FOCUS_DURATION_MILLISECONDS)).toBe(1)
  })

  it('opening: the lid waits for the anticipation, then takes the lid duration', () => {
    const focused = startFocus(INITIAL_OPENING_SCENE_STATE, 0, 0)
    const opening = startLidOpen(focused, 2000)
    const lidStart = 2000 + ANTICIPATION_DURATION_MILLISECONDS

    expect(getLidProgress(opening, 2000)).toBe(0)

    expect(getLidProgress(opening, lidStart - 1)).toBe(0)

    expect(getLidProgress(opening, lidStart + LID_OPEN_DURATION_MILLISECONDS)).toBe(1)
  })

  it('closing starts from where the animations are now, not from the end', () => {
    const focused = startFocus(INITIAL_OPENING_SCENE_STATE, 0, 0)
    const opening = startLidOpen(focused, 1000)
    const closingAt = 1000 + ANTICIPATION_DURATION_MILLISECONDS + LID_OPEN_DURATION_MILLISECONDS / 2
    const closing = startClose(opening, closingAt)

    expect(getLidProgress(closing, closingAt)).toBeCloseTo(0.5)

    expect(getFocusProgress(closing, closingAt)).toBe(1)

    expect(getLidProgress(closing, closingAt + 10_000)).toBe(0)

    expect(getFocusProgress(closing, closingAt + 10_000)).toBe(0)
  })

  it('keeps the card index while closing so the box can fly back into its own card', () => {
    const focused = startFocus(INITIAL_OPENING_SCENE_STATE, 5, 0)

    expect(startClose(focused, 800).focusedCardIndex).toBe(5)
  })

  describe('anticipation', () => {
    const opening = startLidOpen(startFocus(INITIAL_OPENING_SCENE_STATE, 0, 0), 1000)

    it('is zero when the box is not being opened', () => {
      expect(getAnticipationProgress(startFocus(INITIAL_OPENING_SCENE_STATE, 0, 0), 1000)).toBe(0)
    })

    it('builds up from 0 to 1 before the lid moves, then is over', () => {
      expect(getAnticipationProgress(opening, 1000)).toBe(0)

      expect(getAnticipationProgress(opening, 1000 + ANTICIPATION_DURATION_MILLISECONDS / 2)).toBeCloseTo(0.5)

      expect(getAnticipationProgress(opening, 1000 + ANTICIPATION_DURATION_MILLISECONDS + 1)).toBe(0)
    })

    it('is cancelled by closing', () => {
      expect(getAnticipationProgress(startClose(opening, 1200), 1300)).toBe(0)
    })

    it('swells up to the configured amount and shakes harder as it builds', () => {
      expect(computeAnticipationEffect(0, 123).swell).toBe(1)

      expect(computeAnticipationEffect(1, 123).swell).toBeCloseTo(1 + ANTICIPATION_SWELL)

      const mild = Math.abs(computeAnticipationEffect(0.3, 777).jitterYawRadians)
      const strong = Math.abs(computeAnticipationEffect(1, 777).jitterYawRadians)

      expect(strong).toBeGreaterThan(mild)

      expect(computeAnticipationEffect(0, 777).jitterYawRadians).toBe(0)
    })
  })

  describe('glow', () => {
    it('is off while the lid is closed and grows while it opens', () => {
      expect(computeGlowStrength(0, 500)).toBe(0)

      expect(computeGlowStrength(1, 500)).toBeGreaterThan(computeGlowStrength(0.2, 500))
    })

    it('never exceeds the maximum and keeps pulsing a little', () => {
      const samples = [0, 400, 800, 1200, 1600].map(time => computeGlowStrength(1, time))

      expect(Math.max(...samples)).toBeLessThanOrEqual(GLOW_MAXIMUM)

      expect(Math.max(...samples)).toBeGreaterThan(Math.min(...samples))
    })

    it('remembers the colour of the prize', () => {
      const armed = setGlowColor(INITIAL_OPENING_SCENE_STATE, [1, 0.5, 0], 2)

      expect(armed.glowColorLinear).toEqual([1, 0.5, 0])

      expect(armed.rarityLevel).toBe(2)

      expect(startFocus(armed, 1, 10).rarityLevel).toBe(-1)
    })
  })

  describe('putting the opened box away', () => {
    it('is in place at first and gets put away smoothly after startTuck', () => {
      const opened = startFocus(INITIAL_OPENING_SCENE_STATE, 0, 0)

      expect(getTuckProgress(opened, 5000)).toBe(0)

      const tucked = startTuck(opened, 5000)

      expect(getTuckProgress(tucked, 5000)).toBe(0)

      expect(getTuckProgress(tucked, 5000 + TUCK_DURATION_MILLISECONDS / 2)).toBeCloseTo(0.5)

      expect(getTuckProgress(tucked, 5000 + TUCK_DURATION_MILLISECONDS)).toBe(1)
    })

    it('comes back when the user leaves and when another box is selected', () => {
      const tucked = startTuck(startFocus(INITIAL_OPENING_SCENE_STATE, 0, 0), 0)
      const leaving = startClose(tucked, 5000)
      const reselected = startFocus(tucked, 2, 5000)

      expect(getTuckProgress(leaving, 5000)).toBe(1)

      expect(getTuckProgress(leaving, 5000 + TUCK_DURATION_MILLISECONDS)).toBe(0)

      expect(getTuckProgress(reselected, 5000)).toBe(0)
    })
  })
})
