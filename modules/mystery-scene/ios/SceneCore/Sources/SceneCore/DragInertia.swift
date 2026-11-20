import Foundation

// Rotation of the focused box by the finger, with inertia, auto-turn and reset (double tap).
public struct DragState: Equatable {
  public var yawRadians: Double = 0
  public var pitchRadians: Double = 0
  public var yawVelocityRadiansPerSecond: Double = 0
  public var pitchVelocityRadiansPerSecond: Double = 0
  public var isDragging: Bool = false
  public var zoom: Double = SceneConfig.zoomDefault
  public var autoYawRadians: Double = 0
  public var lastInteractionAtMilliseconds: Double = 0
  public var isResetting: Bool = false

  public init() {}
}

private func clampPitch(_ pitchRadians: Double) -> Double {
  min(SceneConfig.dragPitchMaximumRadians, max(SceneConfig.dragPitchMinimumRadians, pitchRadians))
}

public func stepDragInertia(
  _ state: DragState, deltaSeconds: Double, now: Double, isAutoRotateAllowed: Bool
) -> DragState {
  if state.isDragging { return state }
  var next = state

  if state.isResetting {
    let remaining = pow(SceneConfig.resetRemainingFractionPerSecond, deltaSeconds)
    let yaw = state.yawRadians * remaining
    let pitch = state.pitchRadians * remaining
    let autoYaw = state.autoYawRadians * remaining
    let zoom = SceneConfig.zoomDefault + (state.zoom - SceneConfig.zoomDefault) * remaining
    let threshold = SceneConfig.resetFinishedThreshold
    let isFinished =
      abs(yaw) < threshold && abs(pitch) < threshold && abs(autoYaw) < threshold
      && abs(zoom - SceneConfig.zoomDefault) < threshold

    if isFinished {
      next.yawRadians = 0
      next.pitchRadians = 0
      next.autoYawRadians = 0
      next.zoom = SceneConfig.zoomDefault
      next.isResetting = false
    } else {
      next.yawRadians = yaw
      next.pitchRadians = pitch
      next.autoYawRadians = autoYaw
      next.zoom = zoom
    }
    return next
  }

  let decay = pow(SceneConfig.dragInertiaDecayPerFrame, deltaSeconds * 60)
  let yawVelocity = state.yawVelocityRadiansPerSecond * decay
  let pitchVelocity = state.pitchVelocityRadiansPerSecond * decay
  let isMoving =
    abs(yawVelocity) > SceneConfig.dragInertiaStopVelocity || abs(pitchVelocity) > SceneConfig.dragInertiaStopVelocity
  let idleMilliseconds = now - state.lastInteractionAtMilliseconds
  let autoRotateRamp = clampToUnitInterval(
    (idleMilliseconds - SceneConfig.autoRotateDelayMilliseconds) / SceneConfig.autoRotateRampMilliseconds)
  let autoYawStep =
    isAutoRotateAllowed && !isMoving ? SceneConfig.autoRotateRadiansPerSecond * autoRotateRamp * deltaSeconds : 0

  next.yawRadians = state.yawRadians + (isMoving ? yawVelocity * deltaSeconds : 0)
  next.pitchRadians = clampPitch(state.pitchRadians + (isMoving ? pitchVelocity * deltaSeconds : 0))
  next.yawVelocityRadiansPerSecond = isMoving ? yawVelocity : 0
  next.pitchVelocityRadiansPerSecond = isMoving ? pitchVelocity : 0
  next.autoYawRadians = state.autoYawRadians + autoYawStep
  return next
}

public func isDragStateAnimating(_ state: DragState, isAutoRotateAllowed: Bool) -> Bool {
  !state.isDragging
    && (state.isResetting || state.yawVelocityRadiansPerSecond != 0 || state.pitchVelocityRadiansPerSecond != 0
      || isAutoRotateAllowed)
}

public func applyDragMovement(
  _ state: DragState, deltaX: Double, deltaY: Double, radiansPerPixel: Double, now: Double
) -> DragState {
  var next = state
  next.yawRadians = state.yawRadians + deltaX * radiansPerPixel
  next.pitchRadians = clampPitch(state.pitchRadians + deltaY * radiansPerPixel)
  next.isDragging = true
  next.isResetting = false
  next.lastInteractionAtMilliseconds = now
  return next
}

public func releaseDrag(
  _ state: DragState, yawVelocity: Double, pitchVelocity: Double, now: Double
) -> DragState {
  var next = state
  next.isDragging = false
  next.yawVelocityRadiansPerSecond = yawVelocity
  next.pitchVelocityRadiansPerSecond = pitchVelocity
  next.lastInteractionAtMilliseconds = now
  return next
}

public func applyZoom(_ state: DragState, zoomFactor: Double, now: Double) -> DragState {
  var next = state
  next.zoom = min(SceneConfig.zoomMaximum, max(SceneConfig.zoomMinimum, state.zoom * zoomFactor))
  next.isResetting = false
  next.lastInteractionAtMilliseconds = now
  return next
}

public func requestReset(_ state: DragState, _ now: Double) -> DragState {
  var next = state
  next.isDragging = false
  next.isResetting = true
  next.yawVelocityRadiansPerSecond = 0
  next.pitchVelocityRadiansPerSecond = 0
  next.lastInteractionAtMilliseconds = now
  return next
}
