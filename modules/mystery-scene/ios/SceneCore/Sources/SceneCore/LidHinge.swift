import Foundation

public struct LidHingeTransform: Equatable {
  public var angleRadians: Double
  public var translateY: Double
  public var translateZ: Double
}

// A rotation about X around the hinge pivot equals: rotate about the origin, then translate by (pivot - R * pivot).
public func computeLidHingeTransform(angleDegrees: Double) -> LidHingeTransform {
  let angleRadians = angleDegrees * Double.pi / 180
  let cosine = cos(angleRadians)
  let sine = sin(angleRadians)
  let pivotY = SceneConfig.lidHingePivotY
  let pivotZ = SceneConfig.lidHingePivotZ
  return LidHingeTransform(
    angleRadians: angleRadians, translateY: pivotY - (pivotY * cosine - pivotZ * sine),
    translateZ: pivotZ - (pivotY * sine + pivotZ * cosine))
}

// Lid angle (radians) for the linear lid progress: the opening overshoots a little, the closing eases.
public func computeLidAngleRadians(lidProgress: Double, isOpening: Bool) -> Double {
  SceneConfig.lidFullyOpenAngleDegrees * (isOpening ? easeOutBack(lidProgress) : easeInOutCubic(lidProgress))
    * Double.pi / 180
}
