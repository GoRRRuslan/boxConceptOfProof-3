// Timing
export const FOCUS_DURATION_MILLISECONDS = 500
export const LID_OPEN_DURATION_MILLISECONDS = 1100
export const LID_CLOSE_DURATION_MILLISECONDS = 500

// Where and how big the opened box is, relative to the viewport.
// Closed, the box is big and near the middle; open, it shrinks and moves down to leave room above it
// for the revealed watch (the open lid is much taller than the closed box).
export const FOCUSED_CLOSED_WIDTH_FRACTION = 0.55
export const FOCUSED_OPEN_WIDTH_FRACTION = 0.26
export const FOCUSED_CLOSED_CENTER_OFFSET_FRACTION = 0.06
export const FOCUSED_OPEN_CENTER_OFFSET_FRACTION = 0.32
export const FOCUSED_BASE_YAW_RADIANS = Math.PI - 0.4
export const FOCUSED_BASE_PITCH_RADIANS = 0.5

// Drag to inspect
export const DRAG_RADIANS_PER_PIXEL = 0.012
export const DRAG_PITCH_MINIMUM_RADIANS = -0.35
export const DRAG_PITCH_MAXIMUM_RADIANS = 0.55
// Inertia: velocity is multiplied by this much every 1/60 s after the finger lifts.
export const DRAG_INERTIA_DECAY_PER_FRAME = 0.94
export const DRAG_INERTIA_STOP_VELOCITY = 0.02
// The renderer keeps running this long after a release so the inertia can play out (a flick at the
// fastest speed stops well before this).
export const DRAG_INERTIA_MAXIMUM_MILLISECONDS = 2500

// Anticipation: before the lid moves the box shakes and swells for a moment.
export const ANTICIPATION_DURATION_MILLISECONDS = 800
export const ANTICIPATION_SHAKE_YAW_RADIANS = 0.07
export const ANTICIPATION_SHAKE_PITCH_RADIANS = 0.03
export const ANTICIPATION_SWELL = 0.1

// Dolly: the focused box also moves towards the camera (perspective makes it grow, like a camera push-in).
export const DOLLY_DEPTH_UNITS = 0.9

// Pinch to zoom
export const ZOOM_MINIMUM = 0.7
export const ZOOM_MAXIMUM = 2
export const ZOOM_DEFAULT = 1

// After a while without touches the box turns slowly by itself.
export const AUTO_ROTATE_DELAY_MILLISECONDS = 1500
export const AUTO_ROTATE_RAMP_MILLISECONDS = 1000
export const AUTO_ROTATE_RADIANS_PER_SECOND = 0.4

// Double tap: yaw/pitch/zoom glide back to their defaults. Fraction still left after one second.
export const RESET_REMAINING_FRACTION_PER_SECOND = 0.0005
export const RESET_FINISHED_THRESHOLD = 0.002

// Device tilt (gyroscope) turns the focused box a little.
export const TILT_YAW_RADIANS = 0.22
export const TILT_PITCH_RADIANS = 0.14

// Swiping up this far (pixels) on a bought box opens it.
export const OPEN_SWIPE_DISTANCE = 90

// Light from inside the opened box.
export const GLOW_MAXIMUM = 0.9
export const GLOW_PULSE_PERIOD_MILLISECONDS = 1600

// After the reveal the opened box waits a moment, then shrinks and sinks away; the prize and the Done button stay.
export const TUCK_DELAY_MILLISECONDS = 1800
export const TUCK_DURATION_MILLISECONDS = 700
export const TUCK_SINK_OFFSET_FRACTION = 0.06
