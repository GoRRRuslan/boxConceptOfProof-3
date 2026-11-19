import { BOX_WIDTH_UNITS, CAMERA_DISTANCE, CAMERA_FOCAL_LENGTH_MILLIMETERS, SENSOR_HEIGHT_MILLIMETERS } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import type { IBoxPose } from '@flows/catalogueFlow/_facadesLogic/computeBoxPose'
import {
  DOLLY_DEPTH_UNITS,
  FOCUSED_BASE_PITCH_RADIANS,
  FOCUSED_BASE_YAW_RADIANS,
  FOCUSED_CLOSED_CENTER_OFFSET_FRACTION,
  FOCUSED_CLOSED_WIDTH_FRACTION,
  FOCUSED_OPEN_CENTER_OFFSET_FRACTION,
  FOCUSED_OPEN_WIDTH_FRACTION,
  TUCK_SINK_OFFSET_FRACTION,
} from '@flows/openingFlow/_config/openingConfig'
import { interpolate } from '@flows/openingFlow/_facadesLogic/openingEasing'
import type { IAnticipationEffect } from '@flows/openingFlow/_facadesLogic/openingSceneState'
import type { IOpeningPose } from '@flows/openingFlow/_types'

interface IOpeningPoseParams {
  // Where the box sits in the list (from computeBoxPose).
  listPose: IBoxPose
  isFocusedCard: boolean
  // 0 = lid closed, 1 = lid fully open: the opened box makes room for the revealed watch.
  lidProgress: number
  // 0 = in the list, 1 = centred; already eased.
  focusProgress: number
  // Same animation with an overshoot: drives the push towards the camera.
  dollyProgress: number
  viewportWidth: number
  viewportHeight: number
  dragYawRadians: number
  dragPitchRadians: number
  zoom: number
  autoYawRadians: number
  tiltYawRadians: number
  tiltPitchRadians: number
  anticipation: IAnticipationEffect
  // 0 = in place, 1 = the opened box is put away after the reveal (shrunk to nothing and sunk a little); already eased.
  tuckProgress: number
}

// Blends a card's list pose with the centred "inspect" pose. The focused card flies to the middle
// of the screen, grows and is pushed towards the camera; every other card shrinks away. Pure maths,
// runs on the worklet runtime.
export const computeOpeningPose = ({
  listPose,
  isFocusedCard,
  lidProgress,
  focusProgress,
  dollyProgress,
  viewportWidth,
  viewportHeight,
  dragYawRadians,
  dragPitchRadians,
  zoom,
  autoYawRadians,
  tiltYawRadians,
  tiltPitchRadians,
  anticipation,
  tuckProgress,
}: IOpeningPoseParams): IOpeningPose => {
  'worklet'

  if (!isFocusedCard) {
    const scale = listPose.scale * (1 - focusProgress)

    return {
      isVisible: listPose.isVisible && scale > 0.001,
      scale,
      yawRadians: listPose.yawRadians,
      pitchRadians: listPose.pitchRadians,
      translateY: listPose.translateY,
      translateZ: 0,
    }
  }

  const visibleWorldHeight = (CAMERA_DISTANCE * SENSOR_HEIGHT_MILLIMETERS) / CAMERA_FOCAL_LENGTH_MILLIMETERS
  const worldUnitsPerPixel = visibleWorldHeight / viewportHeight
  const widthFraction = interpolate(FOCUSED_CLOSED_WIDTH_FRACTION, FOCUSED_OPEN_WIDTH_FRACTION, lidProgress)
  const offsetFraction = interpolate(FOCUSED_CLOSED_CENTER_OFFSET_FRACTION, FOCUSED_OPEN_CENTER_OFFSET_FRACTION, lidProgress)
  const focusedScale = (widthFraction * viewportWidth * worldUnitsPerPixel) / BOX_WIDTH_UNITS
  const focusedTranslateY = -(offsetFraction + TUCK_SINK_OFFSET_FRACTION * tuckProgress) * viewportHeight * worldUnitsPerPixel
  const focusedYaw =
    FOCUSED_BASE_YAW_RADIANS + dragYawRadians + autoYawRadians + tiltYawRadians + anticipation.jitterYawRadians
  const focusedPitch = FOCUSED_BASE_PITCH_RADIANS + dragPitchRadians + tiltPitchRadians + anticipation.jitterPitchRadians

  const scale =
    interpolate(listPose.scale, focusedScale, focusProgress) * (1 + (zoom * anticipation.swell - 1) * focusProgress) * (1 - tuckProgress)

  return {
    // Zoom and swell only count once the box has arrived in the centre.
    isVisible: scale > 0.001,
    scale,
    yawRadians: interpolate(listPose.yawRadians, focusedYaw, focusProgress),
    pitchRadians: interpolate(listPose.pitchRadians, focusedPitch, focusProgress),
    translateY: interpolate(listPose.translateY, focusedTranslateY, focusProgress),
    // The push towards the camera is taken back while the lid opens, so the open box leaves room for the watch and texts.
    translateZ: DOLLY_DEPTH_UNITS * dollyProgress * (1 - lidProgress),
  }
}
