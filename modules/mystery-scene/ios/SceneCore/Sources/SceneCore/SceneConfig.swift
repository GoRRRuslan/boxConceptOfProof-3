import Foundation

// Every number of the scene in one place. They are ported 1:1 from the TypeScript configuration files
// (`catalogueLayoutConfig.ts`, `openingConfig.ts`); the shared test vectors fail when a value drifts.
public enum SceneConfig {
  // Catalogue layout (density-independent pixels, shared with the React Native list styles)
  public static let cardHeight = 300.0
  public static let boxSlotHeight = 190.0
  public static let listTopPadding = 8.0

  // Camera: looks down -Z at the plane z = 0. The lens uses a 24 mm tall sensor.
  public static let cameraDistance = 6.0
  public static let cameraFocalLengthMillimeters = 50.0
  public static let sensorHeightMillimeters = 24.0

  public static let boxWidthUnits = 1.12
  public static let boxCenterHeightUnits = 0.56
  public static let boxSlotFill = 0.64
  public static let boxBasePitchRadians = 0.38
  public static let boxBaseYawRadians = Double.pi - 0.55
  public static let boxParallaxYawRadians = 0.9
  public static let visibilityMarginInCards = 1.5
  public static let parkedBoxHeightUnits = -1000.0
  public static let entranceDurationMilliseconds = 520.0
  public static let entranceStaggerMilliseconds = 90.0
  public static let pressScale = 0.92
  public static let pressDurationMilliseconds = 140.0
  public static let signatureYawStepRadians = 0.18

  // Opening
  public static let focusDurationMilliseconds = 500.0
  public static let lidOpenDurationMilliseconds = 1100.0
  public static let lidCloseDurationMilliseconds = 500.0
  public static let focusedClosedWidthFraction = 0.55
  public static let focusedOpenWidthFraction = 0.26
  public static let focusedClosedCenterOffsetFraction = 0.06
  public static let focusedOpenCenterOffsetFraction = 0.32
  public static let focusedBaseYawRadians = Double.pi - 0.4
  public static let focusedBasePitchRadians = 0.5
  public static let dragRadiansPerPixel = 0.012
  public static let dragPitchMinimumRadians = -0.35
  public static let dragPitchMaximumRadians = 0.55
  public static let dragInertiaDecayPerFrame = 0.94
  public static let dragInertiaStopVelocity = 0.02
  public static let anticipationDurationMilliseconds = 800.0
  public static let anticipationShakeYawRadians = 0.07
  public static let anticipationShakePitchRadians = 0.03
  public static let anticipationSwell = 0.1
  public static let dollyDepthUnits = 0.9
  public static let zoomMinimum = 0.7
  public static let zoomMaximum = 2.0
  public static let zoomDefault = 1.0
  public static let autoRotateDelayMilliseconds = 1500.0
  public static let autoRotateRampMilliseconds = 1000.0
  public static let autoRotateRadiansPerSecond = 0.4
  public static let resetRemainingFractionPerSecond = 0.0005
  public static let resetFinishedThreshold = 0.002
  public static let tiltYawRadians = 0.22
  public static let tiltPitchRadians = 0.14
  public static let glowMaximum = 0.9
  public static let glowPulsePeriodMilliseconds = 1600.0
  public static let tuckDurationMilliseconds = 700.0
  public static let tuckSinkOffsetFraction = 0.06

  // Lid hinge (docs/MODEL.md)
  public static let lidHingePivotY = 0.914876
  public static let lidHingePivotZ = 0.359181
  public static let lidFullyOpenAngleDegrees = 115.0

  // A frame longer than this is clamped for the physics (a stall must not teleport the box).
  public static let maximumFrameSeconds = 0.05
}
