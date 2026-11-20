import {
  AUTO_ROTATE_DELAY_MILLISECONDS,
  AUTO_ROTATE_RADIANS_PER_SECOND,
  AUTO_ROTATE_RAMP_MILLISECONDS,
  DRAG_INERTIA_DECAY_PER_FRAME,
  DRAG_INERTIA_STOP_VELOCITY,
  DRAG_PITCH_MAXIMUM_RADIANS,
  DRAG_PITCH_MINIMUM_RADIANS,
  RESET_FINISHED_THRESHOLD,
  RESET_REMAINING_FRACTION_PER_SECOND,
  ZOOM_DEFAULT,
  ZOOM_MAXIMUM,
  ZOOM_MINIMUM,
} from '@flows/openingFlow/_config/openingConfig'
import { clampToUnitInterval } from '@flows/openingFlow/_facadesLogic/openingEasing'
import type { IDragState } from '@flows/openingFlow/_types'

export const INITIAL_DRAG_STATE: IDragState = {
  yawRadians: 0,
  pitchRadians: 0,
  yawVelocityRadiansPerSecond: 0,
  pitchVelocityRadiansPerSecond: 0,
  isDragging: false,
  zoom: ZOOM_DEFAULT,
  autoYawRadians: 0,
  lastInteractionAtMilliseconds: 0,
  isResetting: false,
}

const clampPitch = (pitchRadians: number): number => {
  'worklet'

  return Math.min(DRAG_PITCH_MAXIMUM_RADIANS, Math.max(DRAG_PITCH_MINIMUM_RADIANS, pitchRadians))
}

// One frame of the inspection physics while the finger is up:
//  - a double tap makes everything glide back to the default view,
//  - otherwise a flick keeps the box turning (inertia, frame-rate independent),
//  - and after a while without touches the box turns slowly by itself (when `isAutoRotateAllowed`).
export const stepDragInertia = (
  state: IDragState,
  deltaSeconds: number,
  nowMilliseconds: number,
  isAutoRotateAllowed: boolean,
): IDragState => {
  'worklet'

  if (state.isDragging) {
    return state
  }

  if (state.isResetting) {
    const remaining = RESET_REMAINING_FRACTION_PER_SECOND ** deltaSeconds
    const yawRadians = state.yawRadians * remaining
    const pitchRadians = state.pitchRadians * remaining
    const autoYawRadians = state.autoYawRadians * remaining
    const zoom = ZOOM_DEFAULT + (state.zoom - ZOOM_DEFAULT) * remaining
    const isFinished =
      Math.abs(yawRadians) < RESET_FINISHED_THRESHOLD &&
      Math.abs(pitchRadians) < RESET_FINISHED_THRESHOLD &&
      Math.abs(autoYawRadians) < RESET_FINISHED_THRESHOLD &&
      Math.abs(zoom - ZOOM_DEFAULT) < RESET_FINISHED_THRESHOLD

    return isFinished
      ? { ...state, yawRadians: 0, pitchRadians: 0, autoYawRadians: 0, zoom: ZOOM_DEFAULT, isResetting: false }
      : { ...state, yawRadians, pitchRadians, autoYawRadians, zoom }
  }

  const decay = DRAG_INERTIA_DECAY_PER_FRAME ** (deltaSeconds * 60)
  const yawVelocity = state.yawVelocityRadiansPerSecond * decay
  const pitchVelocity = state.pitchVelocityRadiansPerSecond * decay
  const isMoving = Math.abs(yawVelocity) > DRAG_INERTIA_STOP_VELOCITY || Math.abs(pitchVelocity) > DRAG_INERTIA_STOP_VELOCITY
  const idleMilliseconds = nowMilliseconds - state.lastInteractionAtMilliseconds
  const autoRotateRamp = clampToUnitInterval((idleMilliseconds - AUTO_ROTATE_DELAY_MILLISECONDS) / AUTO_ROTATE_RAMP_MILLISECONDS)
  const autoYawStep = isAutoRotateAllowed && !isMoving ? AUTO_ROTATE_RADIANS_PER_SECOND * autoRotateRamp * deltaSeconds : 0

  return {
    ...state,
    yawRadians: state.yawRadians + (isMoving ? yawVelocity * deltaSeconds : 0),
    pitchRadians: clampPitch(state.pitchRadians + (isMoving ? pitchVelocity * deltaSeconds : 0)),
    yawVelocityRadiansPerSecond: isMoving ? yawVelocity : 0,
    pitchVelocityRadiansPerSecond: isMoving ? pitchVelocity : 0,
    autoYawRadians: state.autoYawRadians + autoYawStep,
  }
}

// True while the state still changes by itself (so the scene must keep writing it back).
export const isDragStateAnimating = (state: IDragState, isAutoRotateAllowed: boolean): boolean => {
  'worklet'

  return (
    !state.isDragging &&
    (state.isResetting ||
      state.yawVelocityRadiansPerSecond !== 0 ||
      state.pitchVelocityRadiansPerSecond !== 0 ||
      isAutoRotateAllowed)
  )
}

// A finger movement (pixels) while the finger is down.
export const applyDragMovement = (
  state: IDragState,
  deltaX: number,
  deltaY: number,
  radiansPerPixel: number,
  nowMilliseconds: number,
): IDragState => {
  'worklet'

  return {
    ...state,
    yawRadians: state.yawRadians + deltaX * radiansPerPixel,
    pitchRadians: clampPitch(state.pitchRadians + deltaY * radiansPerPixel),
    isDragging: true,
    isResetting: false,
    lastInteractionAtMilliseconds: nowMilliseconds,
  }
}

// The finger lifted: it keeps turning with the speed it had.
export const releaseDrag = (
  state: IDragState,
  yawVelocityRadiansPerSecond: number,
  pitchVelocityRadiansPerSecond: number,
  nowMilliseconds: number,
): IDragState => {
  'worklet'

  return {
    ...state,
    isDragging: false,
    yawVelocityRadiansPerSecond,
    pitchVelocityRadiansPerSecond,
    lastInteractionAtMilliseconds: nowMilliseconds,
  }
}

// Pinch: multiplies the zoom by the change of the gesture, within limits.
export const applyZoom = (state: IDragState, zoomFactor: number, nowMilliseconds: number): IDragState => {
  'worklet'

  return {
    ...state,
    zoom: Math.min(ZOOM_MAXIMUM, Math.max(ZOOM_MINIMUM, state.zoom * zoomFactor)),
    isResetting: false,
    lastInteractionAtMilliseconds: nowMilliseconds,
  }
}

// Double tap: glide back to the default view.
export const requestReset = (state: IDragState, nowMilliseconds: number): IDragState => {
  'worklet'

  return {
    ...state,
    isDragging: false,
    isResetting: true,
    yawVelocityRadiansPerSecond: 0,
    pitchVelocityRadiansPerSecond: 0,
    lastInteractionAtMilliseconds: nowMilliseconds,
  }
}
