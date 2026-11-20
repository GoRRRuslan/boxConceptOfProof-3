import {
  ENTRANCE_DURATION_MILLISECONDS,
  PRESS_DURATION_MILLISECONDS,
  PRESS_SCALE,
} from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import {
  INITIAL_PRESS_STATE,
  computeEntranceScale,
  computePressScale,
  endPress,
  startPress,
} from '@flows/catalogueFlow/_facadesLogic/computeCardAnimation'

describe('computeEntranceScale', () => {
  it('is invisible before the entrance of this card starts', () => {
    expect(computeEntranceScale(-500)).toBe(0)

    expect(computeEntranceScale(0)).toBe(0)
  })

  it('grows with a small overshoot and settles at full size', () => {
    const samples = [0.5, 0.6, 0.7].map(fraction => computeEntranceScale(ENTRANCE_DURATION_MILLISECONDS * fraction))

    expect(Math.max(...samples)).toBeGreaterThan(1)

    expect(computeEntranceScale(ENTRANCE_DURATION_MILLISECONDS)).toBeCloseTo(1)

    expect(computeEntranceScale(ENTRANCE_DURATION_MILLISECONDS * 10)).toBeCloseTo(1)
  })
})

describe('computePressScale', () => {
  it('is 1 when nothing is pressed', () => {
    expect(computePressScale(INITIAL_PRESS_STATE, 5000)).toBe(1)
  })

  it('squeezes to the press scale while the finger is down', () => {
    const pressed = startPress(INITIAL_PRESS_STATE, 2, 1000)

    expect(computePressScale(pressed, 1000)).toBe(1)

    expect(computePressScale(pressed, 1000 + PRESS_DURATION_MILLISECONDS)).toBeCloseTo(PRESS_SCALE)
  })

  it('goes back to 1 after release, starting from where it was', () => {
    const pressed = startPress(INITIAL_PRESS_STATE, 2, 1000)
    const midway = 1000 + PRESS_DURATION_MILLISECONDS / 2
    const released = endPress(pressed, midway)

    expect(computePressScale(released, midway)).toBeCloseTo(computePressScale(pressed, midway))

    expect(computePressScale(released, midway + PRESS_DURATION_MILLISECONDS)).toBeCloseTo(1)
  })

  it('remembers which card is pressed', () => {
    expect(startPress(INITIAL_PRESS_STATE, 4, 0).cardIndex).toBe(4)
  })
})
