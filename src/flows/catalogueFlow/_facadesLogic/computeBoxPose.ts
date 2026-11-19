import {
  BOX_BASE_PITCH_RADIANS,
  BOX_BASE_YAW_RADIANS,
  BOX_PARALLAX_YAW_RADIANS,
  BOX_SLOT_FILL,
  BOX_SLOT_HEIGHT,
  BOX_WIDTH_UNITS,
  CAMERA_DISTANCE,
  CAMERA_FOCAL_LENGTH_MILLIMETERS,
  CARD_HEIGHT,
  LIST_TOP_PADDING,
  PARKED_BOX_HEIGHT_UNITS,
  SIGNATURE_YAW_STEP_RADIANS,
  SENSOR_HEIGHT_MILLIMETERS,
  VISIBILITY_MARGIN_IN_CARDS,
} from '@flows/catalogueFlow/_config/catalogueLayoutConfig'

export interface IBoxPoseParams {
  cardIndex: number
  scrollOffset: number
  viewportHeight: number
}

export interface IBoxPose {
  // False for cards far outside the viewport: their box is parked out of the camera's view.
  isVisible: boolean
  scale: number
  pitchRadians: number
  yawRadians: number
  // World position of the box centre, on the plane z = 0.
  translateY: number
}

// Where, how big and how turned the 3D box of one card must be so that it sits in the card's
// transparent slot for the given scroll position. Pure maths, also runs on the Filament worklet runtime.
export const computeBoxPose = ({ cardIndex, scrollOffset, viewportHeight }: IBoxPoseParams): IBoxPose => {
  'worklet'

  const slotCenterY = LIST_TOP_PADDING + cardIndex * CARD_HEIGHT + BOX_SLOT_HEIGHT / 2 - scrollOffset
  const offsetFromViewportCenter = slotCenterY - viewportHeight / 2
  const visibleWorldHeight = (CAMERA_DISTANCE * SENSOR_HEIGHT_MILLIMETERS) / CAMERA_FOCAL_LENGTH_MILLIMETERS
  const worldUnitsPerPixel = visibleWorldHeight / viewportHeight
  const isVisible = Math.abs(offsetFromViewportCenter) <= viewportHeight / 2 + VISIBILITY_MARGIN_IN_CARDS * CARD_HEIGHT

  return {
    isVisible,
    scale: (BOX_SLOT_HEIGHT * BOX_SLOT_FILL * worldUnitsPerPixel) / BOX_WIDTH_UNITS,
    pitchRadians: BOX_BASE_PITCH_RADIANS,
    // Each box is turned a little differently (-1, 0, +1 steps, repeating) and turns more while it travels across the screen.
    yawRadians:
      BOX_BASE_YAW_RADIANS +
      ((cardIndex % 3) - 1) * SIGNATURE_YAW_STEP_RADIANS +
      (offsetFromViewportCenter / viewportHeight) * BOX_PARALLAX_YAW_RADIANS,
    translateY: isVisible ? -offsetFromViewportCenter * worldUnitsPerPixel : PARKED_BOX_HEIGHT_UNITS,
  }
}
