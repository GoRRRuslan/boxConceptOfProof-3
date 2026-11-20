import Foundation

public struct OpeningPose: Equatable {
  public var isVisible: Bool
  public var scale: Double
  public var yawRadians: Double
  public var pitchRadians: Double
  public var translateY: Double
  public var translateZ: Double
}

public struct OpeningPoseInput {
  public var listPose: BoxPose
  public var isFocusedCard: Bool
  public var lidProgress: Double
  public var focusProgress: Double
  public var dollyProgress: Double
  public var viewportWidth: Double
  public var viewportHeight: Double
  public var dragYawRadians: Double
  public var dragPitchRadians: Double
  public var zoom: Double
  public var autoYawRadians: Double
  public var tiltYawRadians: Double
  public var tiltPitchRadians: Double
  public var anticipation: AnticipationEffect
  public var tuckProgress: Double
}

public func computeOpeningPose(_ input: OpeningPoseInput) -> OpeningPose {
  let listPose = input.listPose

  if !input.isFocusedCard {
    let scale = listPose.scale * (1 - input.focusProgress)
    return OpeningPose(
      isVisible: listPose.isVisible && scale > 0.001, scale: scale, yawRadians: listPose.yawRadians,
      pitchRadians: listPose.pitchRadians, translateY: listPose.translateY, translateZ: 0)
  }

  let visibleWorldHeight =
    (SceneConfig.cameraDistance * SceneConfig.sensorHeightMillimeters) / SceneConfig.cameraFocalLengthMillimeters
  let worldUnitsPerPixel = visibleWorldHeight / input.viewportHeight
  let widthFraction = interpolate(
    SceneConfig.focusedClosedWidthFraction, SceneConfig.focusedOpenWidthFraction, input.lidProgress)
  let offsetFraction = interpolate(
    SceneConfig.focusedClosedCenterOffsetFraction, SceneConfig.focusedOpenCenterOffsetFraction, input.lidProgress)
  let focusedScale = (widthFraction * input.viewportWidth * worldUnitsPerPixel) / SceneConfig.boxWidthUnits
  let focusedTranslateY =
    -(offsetFraction + SceneConfig.tuckSinkOffsetFraction * input.tuckProgress) * input.viewportHeight
    * worldUnitsPerPixel
  let focusedYaw =
    SceneConfig.focusedBaseYawRadians + input.dragYawRadians + input.autoYawRadians + input.tiltYawRadians
    + input.anticipation.jitterYawRadians
  let focusedPitch =
    SceneConfig.focusedBasePitchRadians + input.dragPitchRadians + input.tiltPitchRadians
    + input.anticipation.jitterPitchRadians
  let scale =
    interpolate(listPose.scale, focusedScale, input.focusProgress)
    * (1 + (input.zoom * input.anticipation.swell - 1) * input.focusProgress) * (1 - input.tuckProgress)

  return OpeningPose(
    isVisible: scale > 0.001, scale: scale,
    yawRadians: interpolate(listPose.yawRadians, focusedYaw, input.focusProgress),
    pitchRadians: interpolate(listPose.pitchRadians, focusedPitch, input.focusProgress),
    translateY: interpolate(listPose.translateY, focusedTranslateY, input.focusProgress),
    translateZ: SceneConfig.dollyDepthUnits * input.dollyProgress * (1 - input.lidProgress))
}
