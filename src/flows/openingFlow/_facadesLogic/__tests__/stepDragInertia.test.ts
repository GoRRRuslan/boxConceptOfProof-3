import {
  AUTO_ROTATE_DELAY_MILLISECONDS,
  AUTO_ROTATE_RAMP_MILLISECONDS,
  DRAG_PITCH_MAXIMUM_RADIANS,
  DRAG_PITCH_MINIMUM_RADIANS,
  DRAG_RADIANS_PER_PIXEL,
  ZOOM_MAXIMUM,
  ZOOM_MINIMUM,
} from '@flows/openingFlow/_config/openingConfig'
import {
  INITIAL_DRAG_STATE,
  applyDragMovement,
  applyZoom,
  isDragStateAnimating,
  releaseDrag,
  requestReset,
  stepDragInertia,
} from '@flows/openingFlow/_facadesLogic/stepDragInertia'

describe('applyDragMovement', () => {
  it('turns the box with the finger and marks the drag as active', () => {
    const state = applyDragMovement(INITIAL_DRAG_STATE, 100, 0, DRAG_RADIANS_PER_PIXEL, 5000)

    expect(state.yawRadians).toBeCloseTo(100 * DRAG_RADIANS_PER_PIXEL)

    expect(state.isDragging).toBe(true)

    expect(state.lastInteractionAtMilliseconds).toBe(5000)
  })

  it('keeps the pitch inside its limits however far the finger goes', () => {
    expect(applyDragMovement(INITIAL_DRAG_STATE, 0, 10_000, DRAG_RADIANS_PER_PIXEL, 0).pitchRadians).toBe(
      DRAG_PITCH_MAXIMUM_RADIANS,
    )

    expect(applyDragMovement(INITIAL_DRAG_STATE, 0, -10_000, DRAG_RADIANS_PER_PIXEL, 0).pitchRadians).toBe(
      DRAG_PITCH_MINIMUM_RADIANS,
    )
  })

  it('cancels a reset in progress', () => {
    const resetting = requestReset(INITIAL_DRAG_STATE, 0)

    expect(applyDragMovement(resetting, 1, 0, DRAG_RADIANS_PER_PIXEL, 10).isResetting).toBe(false)
  })
})

describe('releaseDrag', () => {
  it('lets the box keep turning with the speed of the finger', () => {
    const dragging = applyDragMovement(INITIAL_DRAG_STATE, 10, 0, DRAG_RADIANS_PER_PIXEL, 100)
    const released = releaseDrag(dragging, 3, -1, 200)

    expect(released.isDragging).toBe(false)

    expect(released.yawVelocityRadiansPerSecond).toBe(3)

    expect(released.pitchVelocityRadiansPerSecond).toBe(-1)

    expect(released.lastInteractionAtMilliseconds).toBe(200)
  })
})

describe('applyZoom', () => {
  it('multiplies the zoom by the pinch factor', () => {
    expect(applyZoom(INITIAL_DRAG_STATE, 1.5, 0).zoom).toBeCloseTo(1.5)
  })

  it('stays between the minimum and the maximum', () => {
    expect(applyZoom(INITIAL_DRAG_STATE, 100, 0).zoom).toBe(ZOOM_MAXIMUM)

    expect(applyZoom(INITIAL_DRAG_STATE, 0.001, 0).zoom).toBe(ZOOM_MINIMUM)
  })
})

describe('stepDragInertia', () => {
  const released = { ...INITIAL_DRAG_STATE, yawVelocityRadiansPerSecond: 4, isDragging: false }

  it('does not move while the finger is down', () => {
    const dragging = { ...released, isDragging: true }

    expect(stepDragInertia(dragging, 1 / 60, 1000, true)).toBe(dragging)
  })

  it('keeps turning after release and slows down', () => {
    const next = stepDragInertia(released, 1 / 60, 1000, false)

    expect(next.yawRadians).toBeGreaterThan(0)

    expect(next.yawVelocityRadiansPerSecond).toBeLessThan(4)
  })

  it('comes to a full stop eventually', () => {
    let state = released

    for (let frame = 0; frame < 600; frame += 1) {
      state = stepDragInertia(state, 1 / 60, 1000, false)
    }

    expect(state.yawVelocityRadiansPerSecond).toBe(0)
  })

  it('travels the same distance at 30 and 60 frames per second', () => {
    let fast = released
    let slow = released

    for (let frame = 0; frame < 120; frame += 1) {
      fast = stepDragInertia(fast, 1 / 60, 1000, false)
    }

    for (let frame = 0; frame < 60; frame += 1) {
      slow = stepDragInertia(slow, 1 / 30, 1000, false)
    }

    expect(Math.abs(fast.yawRadians - slow.yawRadians)).toBeLessThan(0.1)
  })

  describe('auto-rotation', () => {
    const touchedAt = 10_000

    it('does not start right after a touch', () => {
      const state = { ...INITIAL_DRAG_STATE, lastInteractionAtMilliseconds: touchedAt }

      expect(stepDragInertia(state, 1 / 60, touchedAt + AUTO_ROTATE_DELAY_MILLISECONDS - 100, true).autoYawRadians).toBe(0)
    })

    it('starts after the delay and speeds up smoothly', () => {
      const state = { ...INITIAL_DRAG_STATE, lastInteractionAtMilliseconds: touchedAt }
      const early = stepDragInertia(state, 1 / 60, touchedAt + AUTO_ROTATE_DELAY_MILLISECONDS + 100, true).autoYawRadians
      const full = stepDragInertia(
        state,
        1 / 60,
        touchedAt + AUTO_ROTATE_DELAY_MILLISECONDS + AUTO_ROTATE_RAMP_MILLISECONDS + 100,
        true,
      ).autoYawRadians

      expect(early).toBeGreaterThan(0)

      expect(full).toBeGreaterThan(early)
    })

    it('does not turn when it is not allowed (for example while the lid opens)', () => {
      const state = { ...INITIAL_DRAG_STATE, lastInteractionAtMilliseconds: touchedAt }

      expect(stepDragInertia(state, 1 / 60, touchedAt + 10_000, false).autoYawRadians).toBe(0)
    })

    it('waits for a flick to calm down before it starts', () => {
      const state = { ...released, lastInteractionAtMilliseconds: touchedAt }

      expect(stepDragInertia(state, 1 / 60, touchedAt + 10_000, true).autoYawRadians).toBe(0)
    })
  })

  describe('reset (double tap)', () => {
    it('glides yaw, pitch, zoom and auto-rotation back to the defaults', () => {
      let state = requestReset(
        { ...INITIAL_DRAG_STATE, yawRadians: 2, pitchRadians: 0.4, zoom: 1.8, autoYawRadians: 1 },
        0,
      )

      const first = stepDragInertia(state, 1 / 60, 16, true)

      expect(Math.abs(first.yawRadians)).toBeLessThan(2)

      expect(first.zoom).toBeLessThan(1.8)

      for (let frame = 0; frame < 300 && state.isResetting; frame += 1) {
        state = stepDragInertia(state, 1 / 60, 16 * frame, true)
      }

      expect(state).toMatchObject({ yawRadians: 0, pitchRadians: 0, zoom: 1, autoYawRadians: 0, isResetting: false })
    })
  })
})

describe('isDragStateAnimating', () => {
  it('is false for a calm state, true while something still moves', () => {
    expect(isDragStateAnimating(INITIAL_DRAG_STATE, false)).toBe(false)

    expect(isDragStateAnimating({ ...INITIAL_DRAG_STATE, yawVelocityRadiansPerSecond: 1 }, false)).toBe(true)

    expect(isDragStateAnimating(requestReset(INITIAL_DRAG_STATE, 0), false)).toBe(true)

    expect(isDragStateAnimating(INITIAL_DRAG_STATE, true)).toBe(true)

    expect(isDragStateAnimating({ ...INITIAL_DRAG_STATE, isDragging: true, yawVelocityRadiansPerSecond: 1 }, true)).toBe(false)
  })
})
