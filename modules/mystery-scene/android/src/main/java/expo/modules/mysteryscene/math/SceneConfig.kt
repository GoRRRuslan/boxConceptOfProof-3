package expo.modules.mysteryscene.math

import kotlin.math.PI

/**
 * Every number of the scene in one place, ported 1:1 from the TypeScript configuration files
 * (catalogueLayoutConfig.ts, openingConfig.ts) and from the Swift `SceneConfig`. The shared test vectors fail when a value drifts.
 */
object SceneConfig {
  const val CARD_HEIGHT = 300.0
  const val BOX_SLOT_HEIGHT = 190.0
  const val LIST_TOP_PADDING = 8.0

  const val CAMERA_DISTANCE = 6.0
  const val CAMERA_FOCAL_LENGTH_MILLIMETERS = 50.0
  const val SENSOR_HEIGHT_MILLIMETERS = 24.0

  const val BOX_WIDTH_UNITS = 1.12
  const val BOX_CENTER_HEIGHT_UNITS = 0.56
  const val BOX_SLOT_FILL = 0.64
  const val BOX_BASE_PITCH_RADIANS = 0.38
  const val BOX_BASE_YAW_RADIANS = PI - 0.55
  const val BOX_PARALLAX_YAW_RADIANS = 0.9
  const val VISIBILITY_MARGIN_IN_CARDS = 1.5
  const val PARKED_BOX_HEIGHT_UNITS = -1000.0
  const val ENTRANCE_DURATION_MILLISECONDS = 520.0
  const val ENTRANCE_STAGGER_MILLISECONDS = 90.0
  const val PRESS_SCALE = 0.92
  const val PRESS_DURATION_MILLISECONDS = 140.0
  const val SIGNATURE_YAW_STEP_RADIANS = 0.18

  const val FOCUS_DURATION_MILLISECONDS = 500.0
  const val LID_OPEN_DURATION_MILLISECONDS = 1100.0
  const val LID_CLOSE_DURATION_MILLISECONDS = 500.0
  const val FOCUSED_CLOSED_WIDTH_FRACTION = 0.55
  const val FOCUSED_OPEN_WIDTH_FRACTION = 0.26
  const val FOCUSED_CLOSED_CENTER_OFFSET_FRACTION = 0.06
  const val FOCUSED_OPEN_CENTER_OFFSET_FRACTION = 0.32
  const val FOCUSED_BASE_YAW_RADIANS = PI - 0.4
  const val FOCUSED_BASE_PITCH_RADIANS = 0.5
  const val DRAG_RADIANS_PER_PIXEL = 0.012
  const val DRAG_PITCH_MINIMUM_RADIANS = -0.35
  const val DRAG_PITCH_MAXIMUM_RADIANS = 0.55
  const val DRAG_INERTIA_DECAY_PER_FRAME = 0.94
  const val DRAG_INERTIA_STOP_VELOCITY = 0.02
  const val ANTICIPATION_DURATION_MILLISECONDS = 800.0
  const val ANTICIPATION_SHAKE_YAW_RADIANS = 0.07
  const val ANTICIPATION_SHAKE_PITCH_RADIANS = 0.03
  const val ANTICIPATION_SWELL = 0.1
  const val DOLLY_DEPTH_UNITS = 0.9
  const val ZOOM_MINIMUM = 0.7
  const val ZOOM_MAXIMUM = 2.0
  const val ZOOM_DEFAULT = 1.0
  const val AUTO_ROTATE_DELAY_MILLISECONDS = 1500.0
  const val AUTO_ROTATE_RAMP_MILLISECONDS = 1000.0
  const val AUTO_ROTATE_RADIANS_PER_SECOND = 0.4
  const val RESET_REMAINING_FRACTION_PER_SECOND = 0.0005
  const val RESET_FINISHED_THRESHOLD = 0.002
  const val TILT_YAW_RADIANS = 0.22
  const val TILT_PITCH_RADIANS = 0.14
  const val GLOW_MAXIMUM = 0.9
  const val GLOW_PULSE_PERIOD_MILLISECONDS = 1600.0
  const val TUCK_DURATION_MILLISECONDS = 700.0
  const val TUCK_SINK_OFFSET_FRACTION = 0.06

  const val LID_HINGE_PIVOT_Y = 0.914876
  const val LID_HINGE_PIVOT_Z = 0.359181
  const val LID_FULLY_OPEN_ANGLE_DEGREES = 115.0

  /** A frame longer than this is clamped for the physics (a stall must not teleport the box). */
  const val MAXIMUM_FRAME_SECONDS = 0.05
}
