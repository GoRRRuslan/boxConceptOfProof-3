package expo.modules.mysteryscene.math

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

data class BoxPose(
  val isVisible: Boolean,
  val scale: Double,
  val pitchRadians: Double,
  val yawRadians: Double,
  val translateY: Double,
)

/** Where, how big and how turned the box of one card must be so that it sits in the card's slot. */
fun computeBoxPose(cardIndex: Int, scrollOffset: Double, viewportHeight: Double): BoxPose {
  val slotCenterY = SceneConfig.LIST_TOP_PADDING + cardIndex * SceneConfig.CARD_HEIGHT + SceneConfig.BOX_SLOT_HEIGHT / 2 - scrollOffset
  val offsetFromViewportCenter = slotCenterY - viewportHeight / 2
  val visibleWorldHeight = (SceneConfig.CAMERA_DISTANCE * SceneConfig.SENSOR_HEIGHT_MILLIMETERS) / SceneConfig.CAMERA_FOCAL_LENGTH_MILLIMETERS
  val worldUnitsPerPixel = visibleWorldHeight / viewportHeight
  val isVisible = abs(offsetFromViewportCenter) <= viewportHeight / 2 + SceneConfig.VISIBILITY_MARGIN_IN_CARDS * SceneConfig.CARD_HEIGHT

  return BoxPose(
    isVisible = isVisible,
    scale = (SceneConfig.BOX_SLOT_HEIGHT * SceneConfig.BOX_SLOT_FILL * worldUnitsPerPixel) / SceneConfig.BOX_WIDTH_UNITS,
    pitchRadians = SceneConfig.BOX_BASE_PITCH_RADIANS,
    yawRadians = SceneConfig.BOX_BASE_YAW_RADIANS +
      ((cardIndex % 3) - 1) * SceneConfig.SIGNATURE_YAW_STEP_RADIANS +
      (offsetFromViewportCenter / viewportHeight) * SceneConfig.BOX_PARALLAX_YAW_RADIANS,
    translateY = if (isVisible) -offsetFromViewportCenter * worldUnitsPerPixel else SceneConfig.PARKED_BOX_HEIGHT_UNITS,
  )
}

fun computeEntranceScale(elapsedMilliseconds: Double): Double {
  if (elapsedMilliseconds <= 0) return 0.0
  return maxOf(0.0, easeOutBack(clampToUnitInterval(elapsedMilliseconds / SceneConfig.ENTRANCE_DURATION_MILLISECONDS)))
}

data class PressState(
  val cardIndex: Int = -1,
  val isPressed: Boolean = false,
  val fromScale: Double = 1.0,
  val changedAtMilliseconds: Double = 0.0,
)

fun computePressScale(state: PressState, now: Double): Double {
  val progress = easeOutCubic(clampToUnitInterval((now - state.changedAtMilliseconds) / SceneConfig.PRESS_DURATION_MILLISECONDS))
  return interpolate(state.fromScale, if (state.isPressed) SceneConfig.PRESS_SCALE else 1.0, progress)
}

fun startPress(state: PressState, cardIndex: Int, now: Double): PressState =
  PressState(cardIndex, true, if (state.cardIndex == cardIndex) computePressScale(state, now) else 1.0, now)

fun endPress(state: PressState, now: Double): PressState =
  state.copy(isPressed = false, fromScale = computePressScale(state, now), changedAtMilliseconds = now)

data class AnticipationEffect(val swell: Double, val jitterYawRadians: Double, val jitterPitchRadians: Double)

fun computeAnticipationEffect(progress: Double, now: Double): AnticipationEffect {
  val buildUp = progress * progress
  return AnticipationEffect(
    swell = 1 + SceneConfig.ANTICIPATION_SWELL * sin(progress * Math.PI / 2),
    jitterYawRadians = sin(now * 0.05) * SceneConfig.ANTICIPATION_SHAKE_YAW_RADIANS * buildUp,
    jitterPitchRadians = cos(now * 0.07) * SceneConfig.ANTICIPATION_SHAKE_PITCH_RADIANS * buildUp,
  )
}

data class OpeningPose(
  val isVisible: Boolean,
  val scale: Double,
  val yawRadians: Double,
  val pitchRadians: Double,
  val translateY: Double,
  val translateZ: Double,
)

class OpeningPoseInput(
  val listPose: BoxPose,
  val isFocusedCard: Boolean,
  val lidProgress: Double,
  val focusProgress: Double,
  val dollyProgress: Double,
  val viewportWidth: Double,
  val viewportHeight: Double,
  val dragYawRadians: Double,
  val dragPitchRadians: Double,
  val zoom: Double,
  val autoYawRadians: Double,
  val tiltYawRadians: Double,
  val tiltPitchRadians: Double,
  val anticipation: AnticipationEffect,
  val tuckProgress: Double,
)

fun computeOpeningPose(input: OpeningPoseInput): OpeningPose {
  val listPose = input.listPose

  if (!input.isFocusedCard) {
    val scale = listPose.scale * (1 - input.focusProgress)
    return OpeningPose(listPose.isVisible && scale > 0.001, scale, listPose.yawRadians, listPose.pitchRadians, listPose.translateY, 0.0)
  }

  val visibleWorldHeight = (SceneConfig.CAMERA_DISTANCE * SceneConfig.SENSOR_HEIGHT_MILLIMETERS) / SceneConfig.CAMERA_FOCAL_LENGTH_MILLIMETERS
  val worldUnitsPerPixel = visibleWorldHeight / input.viewportHeight
  val widthFraction = interpolate(SceneConfig.FOCUSED_CLOSED_WIDTH_FRACTION, SceneConfig.FOCUSED_OPEN_WIDTH_FRACTION, input.lidProgress)
  val offsetFraction = interpolate(SceneConfig.FOCUSED_CLOSED_CENTER_OFFSET_FRACTION, SceneConfig.FOCUSED_OPEN_CENTER_OFFSET_FRACTION, input.lidProgress)
  val focusedScale = (widthFraction * input.viewportWidth * worldUnitsPerPixel) / SceneConfig.BOX_WIDTH_UNITS
  val focusedTranslateY = -(offsetFraction + SceneConfig.TUCK_SINK_OFFSET_FRACTION * input.tuckProgress) * input.viewportHeight * worldUnitsPerPixel
  val focusedYaw = SceneConfig.FOCUSED_BASE_YAW_RADIANS + input.dragYawRadians + input.autoYawRadians + input.tiltYawRadians + input.anticipation.jitterYawRadians
  val focusedPitch = SceneConfig.FOCUSED_BASE_PITCH_RADIANS + input.dragPitchRadians + input.tiltPitchRadians + input.anticipation.jitterPitchRadians
  val scale = interpolate(listPose.scale, focusedScale, input.focusProgress) *
    (1 + (input.zoom * input.anticipation.swell - 1) * input.focusProgress) * (1 - input.tuckProgress)

  return OpeningPose(
    isVisible = scale > 0.001,
    scale = scale,
    yawRadians = interpolate(listPose.yawRadians, focusedYaw, input.focusProgress),
    pitchRadians = interpolate(listPose.pitchRadians, focusedPitch, input.focusProgress),
    translateY = interpolate(listPose.translateY, focusedTranslateY, input.focusProgress),
    translateZ = SceneConfig.DOLLY_DEPTH_UNITS * input.dollyProgress * (1 - input.lidProgress),
  )
}

data class LidHingeTransform(val angleRadians: Double, val translateY: Double, val translateZ: Double)

/** A rotation about X around the hinge pivot equals: rotate about the origin, then translate by (pivot - R * pivot). */
fun computeLidHingeTransform(angleDegrees: Double): LidHingeTransform {
  val angleRadians = angleDegrees * Math.PI / 180
  val cosine = cos(angleRadians)
  val sine = sin(angleRadians)
  val pivotY = SceneConfig.LID_HINGE_PIVOT_Y
  val pivotZ = SceneConfig.LID_HINGE_PIVOT_Z
  return LidHingeTransform(angleRadians, pivotY - (pivotY * cosine - pivotZ * sine), pivotZ - (pivotY * sine + pivotZ * cosine))
}

/** Lid angle (radians) for the linear lid progress: the opening overshoots a little, the closing eases. */
fun computeLidAngleRadians(lidProgress: Double, isOpening: Boolean): Double =
  SceneConfig.LID_FULLY_OPEN_ANGLE_DEGREES * (if (isOpening) easeOutBack(lidProgress) else easeInOutCubic(lidProgress)) * Math.PI / 180
