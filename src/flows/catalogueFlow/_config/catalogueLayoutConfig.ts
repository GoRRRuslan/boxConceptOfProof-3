// All sizes are in density-independent pixels and are used BOTH by the list styles and by the 3D
// placement maths, so a box always lands exactly in the transparent slot of its card.
export const CARD_HEIGHT = 300
export const BOX_SLOT_HEIGHT = 190
export const LIST_TOP_PADDING = 8

// Camera: looks down -Z at the plane z = 0 where the boxes live. Filament's lens projection uses a
// 24 mm tall sensor, so the visible world height at distance d is d * 24 / focalLength.
export const CAMERA_DISTANCE = 6
export const CAMERA_FOCAL_LENGTH_MILLIMETERS = 50
export const SENSOR_HEIGHT_MILLIMETERS = 24

// Box model (docs/MODEL.md): 1.12 wide, 1.1166 high, base at Y = 0.
export const BOX_WIDTH_UNITS = 1.12
export const BOX_CENTER_HEIGHT_UNITS = 0.56
// How much of the slot height the closed box fills.
export const BOX_SLOT_FILL = 0.64

// The model's front faces -Z, the camera sits at +Z, so the box is turned half a circle and then
// a little to show a three-quarter view from above.
export const BOX_BASE_PITCH_RADIANS = 0.38
export const BOX_BASE_YAW_RADIANS = Math.PI - 0.55
// The box turns by this much from the top to the bottom of the screen: it moves while you scroll.
export const BOX_PARALLAX_YAW_RADIANS = 0.9

// Cards further than this many card heights from the middle of the viewport are parked off screen.
export const VISIBILITY_MARGIN_IN_CARDS = 1.5
export const PARKED_BOX_HEIGHT_UNITS = -1000

// Boxes pop into the list one after the other the first time the scene appears.
export const ENTRANCE_DURATION_MILLISECONDS = 520
export const ENTRANCE_STAGGER_MILLISECONDS = 90
// Cards further down than this appear together with the last staggered one.
export const ENTRANCE_MAXIMUM_STAGGERED_CARDS = 5
// How long the texts of a card take to fade in and slide into place.
export const CARD_TEXT_ENTRANCE_DURATION_MILLISECONDS = 450

// A pressed box is squeezed a little before it flies to the middle.
export const PRESS_SCALE = 0.92
export const PRESS_DURATION_MILLISECONDS = 140

// Every box sits a little differently (turned by this much, repeating every three boxes).
export const SIGNATURE_YAW_STEP_RADIANS = 0.18

// The list is shown (and the loader taken away) only when the scene is really ready: the model is loaded, every box has popped in
// and the picture has had time to settle (the first native frames compile shaders and run unevenly). Without this the loader ended
// while the tiles were still empty, and the first scroll right after it rattled.
export const SCENE_READY_SETTLE_MILLISECONDS = 1000
// Never wait longer than this for the scene (a model that fails to load must not keep the loader forever).
export const SCENE_READY_TIMEOUT_MILLISECONDS = 8000
