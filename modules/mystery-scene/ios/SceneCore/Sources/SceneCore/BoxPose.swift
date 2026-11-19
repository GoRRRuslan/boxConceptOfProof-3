import Foundation

public struct BoxPose: Equatable {
  public var isVisible: Bool
  public var scale: Double
  public var pitchRadians: Double
  public var yawRadians: Double
  public var translateY: Double
}

// Where, how big and how turned the box of one card must be so that it sits in the card's slot.
public func computeBoxPose(cardIndex: Int, scrollOffset: Double, viewportHeight: Double) -> BoxPose {
  let slotCenterY =
    SceneConfig.listTopPadding + Double(cardIndex) * SceneConfig.cardHeight + SceneConfig.boxSlotHeight / 2 - scrollOffset
  let offsetFromViewportCenter = slotCenterY - viewportHeight / 2
  let visibleWorldHeight =
    (SceneConfig.cameraDistance * SceneConfig.sensorHeightMillimeters) / SceneConfig.cameraFocalLengthMillimeters
  let worldUnitsPerPixel = visibleWorldHeight / viewportHeight
  let isVisible =
    abs(offsetFromViewportCenter) <= viewportHeight / 2 + SceneConfig.visibilityMarginInCards * SceneConfig.cardHeight

  return BoxPose(
    isVisible: isVisible,
    scale: (SceneConfig.boxSlotHeight * SceneConfig.boxSlotFill * worldUnitsPerPixel) / SceneConfig.boxWidthUnits,
    pitchRadians: SceneConfig.boxBasePitchRadians,
    yawRadians: SceneConfig.boxBaseYawRadians
      + Double((cardIndex % 3) - 1) * SceneConfig.signatureYawStepRadians
      + (offsetFromViewportCenter / viewportHeight) * SceneConfig.boxParallaxYawRadians,
    translateY: isVisible ? -offsetFromViewportCenter * worldUnitsPerPixel : SceneConfig.parkedBoxHeightUnits
  )
}
