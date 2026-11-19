package expo.modules.mysteryscene.math

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/** Rotation of the focused box by the finger, with inertia, auto-turn and reset (double tap). */
data class DragState(
  val yawRadians: Double = 0.0,
  val pitchRadians: Double = 0.0,
  val yawVelocityRadiansPerSecond: Double = 0.0,
  val pitchVelocityRadiansPerSecond: Double = 0.0,
  val isDragging: Boolean = false,
  val zoom: Double = SceneConfig.ZOOM_DEFAULT,
  val autoYawRadians: Double = 0.0,
  val lastInteractionAtMilliseconds: Double = 0.0,
  val isResetting: Boolean = false,
)

private fun clampPitch(pitchRadians: Double) =
  min(SceneConfig.DRAG_PITCH_MAXIMUM_RADIANS, max(SceneConfig.DRAG_PITCH_MINIMUM_RADIANS, pitchRadians))

fun stepDragInertia(state: DragState, deltaSeconds: Double, now: Double, isAutoRotateAllowed: Boolean): DragState {
  if (state.isDragging) return state

  if (state.isResetting) {
    val remaining = SceneConfig.RESET_REMAINING_FRACTION_PER_SECOND.pow(deltaSeconds)
    val yaw = state.yawRadians * remaining
    val pitch = state.pitchRadians * remaining
    val autoYaw = state.autoYawRadians * remaining
    val zoom = SceneConfig.ZOOM_DEFAULT + (state.zoom - SceneConfig.ZOOM_DEFAULT) * remaining
    val threshold = SceneConfig.RESET_FINISHED_THRESHOLD
    val isFinished = abs(yaw) < threshold && abs(pitch) < threshold && abs(autoYaw) < threshold &&
      abs(zoom - SceneConfig.ZOOM_DEFAULT) < threshold
    return if (isFinished) state.copy(yawRadians = 0.0, pitchRadians = 0.0, autoYawRadians = 0.0, zoom = SceneConfig.ZOOM_DEFAULT, isResetting = false)
    else state.copy(yawRadians = yaw, pitchRadians = pitch, autoYawRadians = autoYaw, zoom = zoom)
  }

  val decay = SceneConfig.DRAG_INERTIA_DECAY_PER_FRAME.pow(deltaSeconds * 60)
  val yawVelocity = state.yawVelocityRadiansPerSecond * decay
  val pitchVelocity = state.pitchVelocityRadiansPerSecond * decay
  val isMoving = abs(yawVelocity) > SceneConfig.DRAG_INERTIA_STOP_VELOCITY || abs(pitchVelocity) > SceneConfig.DRAG_INERTIA_STOP_VELOCITY
  val idleMilliseconds = now - state.lastInteractionAtMilliseconds
  val autoRotateRamp = clampToUnitInterval((idleMilliseconds - SceneConfig.AUTO_ROTATE_DELAY_MILLISECONDS) / SceneConfig.AUTO_ROTATE_RAMP_MILLISECONDS)
  val autoYawStep = if (isAutoRotateAllowed && !isMoving) SceneConfig.AUTO_ROTATE_RADIANS_PER_SECOND * autoRotateRamp * deltaSeconds else 0.0

  return state.copy(
    yawRadians = state.yawRadians + (if (isMoving) yawVelocity * deltaSeconds else 0.0),
    pitchRadians = clampPitch(state.pitchRadians + (if (isMoving) pitchVelocity * deltaSeconds else 0.0)),
    yawVelocityRadiansPerSecond = if (isMoving) yawVelocity else 0.0,
    pitchVelocityRadiansPerSecond = if (isMoving) pitchVelocity else 0.0,
    autoYawRadians = state.autoYawRadians + autoYawStep,
  )
}

fun isDragStateAnimating(state: DragState, isAutoRotateAllowed: Boolean): Boolean =
  !state.isDragging && (state.isResetting || state.yawVelocityRadiansPerSecond != 0.0 || state.pitchVelocityRadiansPerSecond != 0.0 || isAutoRotateAllowed)

fun applyDragMovement(state: DragState, deltaX: Double, deltaY: Double, radiansPerPixel: Double, now: Double) = state.copy(
  yawRadians = state.yawRadians + deltaX * radiansPerPixel,
  pitchRadians = clampPitch(state.pitchRadians + deltaY * radiansPerPixel),
  isDragging = true, isResetting = false, lastInteractionAtMilliseconds = now,
)

fun releaseDrag(state: DragState, yawVelocity: Double, pitchVelocity: Double, now: Double) = state.copy(
  isDragging = false, yawVelocityRadiansPerSecond = yawVelocity, pitchVelocityRadiansPerSecond = pitchVelocity, lastInteractionAtMilliseconds = now,
)

fun applyZoom(state: DragState, zoomFactor: Double, now: Double) = state.copy(
  zoom = min(SceneConfig.ZOOM_MAXIMUM, max(SceneConfig.ZOOM_MINIMUM, state.zoom * zoomFactor)),
  isResetting = false, lastInteractionAtMilliseconds = now,
)

fun requestReset(state: DragState, now: Double) = state.copy(
  isDragging = false, isResetting = true, yawVelocityRadiansPerSecond = 0.0, pitchVelocityRadiansPerSecond = 0.0, lastInteractionAtMilliseconds = now,
)
