import { computeBoxPose } from '@flows/catalogueFlow/_facadesLogic/computeBoxPose'
import {
  ANTICIPATION_SWELL,
  DOLLY_DEPTH_UNITS,
  FOCUSED_BASE_PITCH_RADIANS,
  FOCUSED_BASE_YAW_RADIANS,
} from '@flows/openingFlow/_config/openingConfig'
import { computeOpeningPose } from '@flows/openingFlow/_facadesLogic/computeOpeningPose'

const viewport = { viewportWidth: 390, viewportHeight: 700 }
const listPose = computeBoxPose({ cardIndex: 1, scrollOffset: 0, viewportHeight: viewport.viewportHeight })
const calm = { swell: 1, jitterYawRadians: 0, jitterPitchRadians: 0 }
const base = {
  ...viewport,
  listPose,
  dragYawRadians: 0,
  dragPitchRadians: 0,
  zoom: 1,
  autoYawRadians: 0,
  tiltYawRadians: 0,
  tiltPitchRadians: 0,
  anticipation: calm,
  lidProgress: 0,
  dollyProgress: 0,
  tuckProgress: 0,
}

describe('computeOpeningPose', () => {
  it('leaves a card exactly in its list pose before anything is selected', () => {
    const pose = computeOpeningPose({ ...base, isFocusedCard: false, focusProgress: 0 })

    expect(pose.scale).toBe(listPose.scale)

    expect(pose.translateY).toBe(listPose.translateY)

    expect(pose.translateZ).toBe(0)

    expect(pose.isVisible).toBe(true)
  })

  it('shrinks the cards that are not selected and hides them when the focus is complete', () => {
    const half = computeOpeningPose({ ...base, isFocusedCard: false, focusProgress: 0.5 })
    const done = computeOpeningPose({ ...base, isFocusedCard: false, focusProgress: 1 })

    expect(half.scale).toBeCloseTo(listPose.scale / 2)

    expect(done.isVisible).toBe(false)
  })

  it('moves the selected box from its list position to the centre and makes it bigger', () => {
    const start = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 0 })
    const end = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1 })

    expect(start.translateY).toBeCloseTo(listPose.translateY)

    expect(end.scale).toBeGreaterThan(start.scale)

    expect(end.translateY).toBeLessThan(0)

    expect(end.yawRadians).toBeCloseTo(FOCUSED_BASE_YAW_RADIANS)

    expect(end.pitchRadians).toBeCloseTo(FOCUSED_BASE_PITCH_RADIANS)
  })

  it('pushes the selected box towards the camera (dolly), more when the overshoot is at its peak', () => {
    const arriving = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, dollyProgress: 1 })
    const overshoot = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, dollyProgress: 1.1 })

    expect(arriving.translateZ).toBeCloseTo(DOLLY_DEPTH_UNITS)

    expect(overshoot.translateZ).toBeGreaterThan(arriving.translateZ)
  })

  it('adds drag, auto-rotation and device tilt to the turn of the focused box only', () => {
    const turned = computeOpeningPose({
      ...base,
      isFocusedCard: true,
      focusProgress: 1,
      dragYawRadians: 0.5,
      dragPitchRadians: 0.1,
      autoYawRadians: 0.3,
      tiltYawRadians: 0.05,
      tiltPitchRadians: 0.02,
    })

    expect(turned.yawRadians).toBeCloseTo(FOCUSED_BASE_YAW_RADIANS + 0.85)

    expect(turned.pitchRadians).toBeCloseTo(FOCUSED_BASE_PITCH_RADIANS + 0.12)

    const other = computeOpeningPose({ ...base, isFocusedCard: false, focusProgress: 1, dragYawRadians: 0.5 })

    expect(other.yawRadians).toBe(listPose.yawRadians)
  })

  it('zooms the focused box, but not before it has arrived', () => {
    const arrived = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1 })
    const zoomed = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, zoom: 1.5 })
    const flying = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 0, zoom: 1.5 })

    expect(zoomed.scale / arrived.scale).toBeCloseTo(1.5)

    expect(flying.scale).toBeCloseTo(listPose.scale)
  })

  it('swells and shakes during the anticipation', () => {
    const calmPose = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1 })
    const shaking = computeOpeningPose({
      ...base,
      isFocusedCard: true,
      focusProgress: 1,
      anticipation: { swell: 1 + ANTICIPATION_SWELL, jitterYawRadians: 0.05, jitterPitchRadians: 0.02 },
    })

    expect(shaking.scale / calmPose.scale).toBeCloseTo(1 + ANTICIPATION_SWELL)

    expect(shaking.yawRadians - calmPose.yawRadians).toBeCloseTo(0.05)

    expect(shaking.pitchRadians - calmPose.pitchRadians).toBeCloseTo(0.02)
  })

  it('shrinks and lowers the opened box to leave room for the revealed watch', () => {
    const closed = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, lidProgress: 0 })
    const open = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, lidProgress: 1 })

    expect(open.scale).toBeLessThan(closed.scale)

    expect(open.translateY).toBeLessThan(closed.translateY)
  })

  it('makes the box fill the same share of the width on any screen size', () => {
    const narrow = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, viewportWidth: 320 })
    const wide = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, viewportWidth: 640 })

    expect(wide.scale / narrow.scale).toBeCloseTo(2)
  })

  it('puts the opened box away after the reveal: it shrinks to nothing, sinks a little and then disappears', () => {
    const inPlace = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, lidProgress: 1, tuckProgress: 0 })
    const half = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, lidProgress: 1, tuckProgress: 0.5 })
    const away = computeOpeningPose({ ...base, isFocusedCard: true, focusProgress: 1, lidProgress: 1, tuckProgress: 1 })

    expect(half.scale).toBeCloseTo(inPlace.scale / 2)

    expect(half.translateY).toBeLessThan(inPlace.translateY)

    expect(away.scale).toBe(0)

    expect(away.isVisible).toBe(false)
  })
})
