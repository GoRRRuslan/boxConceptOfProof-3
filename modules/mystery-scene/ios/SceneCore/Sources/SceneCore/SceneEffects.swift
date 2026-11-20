import Foundation

// The show around the box: seams, light shaft, shock waves, sparks, dust, aura, camera punch, lid settle, scroll sway.
// Ported 1:1 from the TypeScript reference (`computeSceneEffects.ts`, `computeEffectsLayout.ts` and `effectsConfig.ts`);
// the shared test vectors fail when a value or a formula drifts.
public enum EffectsConfig {
  public static let burstParticlePoolSize = 32
  public static let ringPoolSize = 3
  public static let dustPoolSize = 10

  public static let hitStopMilliseconds = 140.0
  public static let punchScale = 0.07
  public static let punchScaleDecayMilliseconds = 110.0
  public static let punchShakeUnits = 0.02
  public static let punchShakeDecayMilliseconds = 140.0
  public static let punchShakeFrequency = 0.09
  public static let lidSettleDegrees = 4.0
  public static let lidSettleDecayMilliseconds = 180.0
  public static let lidSettlePeriodMilliseconds = 280.0

  public static let seamIdleBase = 0.2
  public static let seamIdleAmplitude = 0.12
  public static let seamIdlePeriodMilliseconds = 1400.0
  public static let seamAnticipationStart = 0.25
  public static let seamAnticipationRange = 1.75
  public static let seamAnticipationExponent = 1.6
  public static let seamFlashPeak = 2.4
  public static let seamFlashDecayMilliseconds = 260.0
  public static let seamOpenLevel = 0.5

  public static let shaftRampMilliseconds = 450.0
  public static let shaftPulsePeriodMilliseconds = 3100.0
  public static let shaftBaseWidth = 0.85
  public static let shaftWidthGrowth = 0.15
  public static let shaftStartHeightFraction = 0.35
  public static let shaftAnchorHeight = 0.3

  public static let ringDelayMilliseconds = 140.0
  public static let ringDurationMilliseconds = 900.0
  public static let ringMaximumScale = 3.4
  public static let ringStartScale = 0.2
  public static let ringPeakAlpha = 0.9

  public static let burstLifetimeMilliseconds = 1500.0
  public static let burstGravity = 2.6
  public static let burstSize = 0.11

  public static let dustSize = 0.16
  public static let dustPullInFraction = 0.85

  public static let auraListAlpha = 0.1
  public static let auraFocusedAlpha = 0.14
  public static let auraScale = 2.4
  // How far behind its box the aura sits and how far in front of the open box the show is drawn (model units).
  public static let auraDepthBehindBox = 0.9
  public static let inFrontOfBoxModelUnits = 1.3

  public static let iridescenceMinimumMetallic = 0.25
  public static let iridescenceMetallicRange = 0.4
  public static let iridescenceAmplitude = 0.16
  public static let iridescenceYawFrequency = 1.3
  public static let iridescencePitchFrequency = 0.9
  public static let iridescenceTimeFrequency = 0.0006

  public static let swayRadiansPerPixelPerSecond = 0.00035
  public static let swayMaximumRadians = 0.25
  public static let swayResponsePerSecond = 10.0

  public struct RarityProfile {
    public let burstCount: Int
    public let ringCount: Int
    public let shaftStrength: Double
    public let shaftHeight: Double
    public let emissiveBoost: Double
    public let punchStrength: Double
  }

  // Index = rarity level (0 common ... 3 legendary).
  public static let rarityProfiles: [RarityProfile] = [
    RarityProfile(burstCount: 6, ringCount: 1, shaftStrength: 0.45, shaftHeight: 3.2, emissiveBoost: 1, punchStrength: 0.5),
    RarityProfile(burstCount: 12, ringCount: 1, shaftStrength: 0.65, shaftHeight: 3.2, emissiveBoost: 1.2, punchStrength: 0.7),
    RarityProfile(burstCount: 20, ringCount: 2, shaftStrength: 0.85, shaftHeight: 3.4, emissiveBoost: 1.5, punchStrength: 0.85),
    RarityProfile(burstCount: 32, ringCount: 3, shaftStrength: 1, shaftHeight: 3.6, emissiveBoost: 2, punchStrength: 1),
  ]
}

public struct EffectPoint: Equatable {
  public var x: Double
  public var y: Double
  public var z: Double
  public var scale: Double
  public static let hidden = EffectPoint(x: 0, y: 0, z: 0, scale: 0)
}

public struct CameraPunch: Equatable {
  public var scaleBoost: Double
  public var shakeX: Double
  public var shakeY: Double
}

private func fraction(_ value: Double) -> Double { value - floor(value) }

public func getRarityProfile(_ rarityLevel: Double) -> EffectsConfig.RarityProfile {
  let index = max(0, min(EffectsConfig.rarityProfiles.count - 1, Int((rarityLevel).rounded())))
  return EffectsConfig.rarityProfiles[index]
}

// Milliseconds since the lid was let go (negative during the anticipation, minus infinity when not being opened).
public func getPopElapsedMilliseconds(_ scene: OpeningSceneState, _ now: Double) -> Double {
  scene.lidTarget == 1 && scene.lidStartedAtMilliseconds > 0 ? now - scene.lidStartedAtMilliseconds : -Double.infinity
}

public func getAnticipationLinear(_ scene: OpeningSceneState, _ now: Double) -> Double {
  if scene.lidTarget != 1 || scene.openStartedAtMilliseconds == 0 { return 0 }
  return clampToUnitInterval((now - scene.openStartedAtMilliseconds) / SceneConfig.anticipationDurationMilliseconds)
}

// The box holds its breath just before the lid is let go: the shake dies away over the last hit-stop milliseconds.
public func computeJitterScale(_ popElapsedMilliseconds: Double) -> Double {
  let untilPop = -popElapsedMilliseconds
  if !untilPop.isFinite || untilPop <= 0 || untilPop >= EffectsConfig.hitStopMilliseconds { return 1 }
  let normalized = untilPop / EffectsConfig.hitStopMilliseconds
  return normalized * normalized * (3 - 2 * normalized)
}

public func computeCameraPunch(_ popElapsedMilliseconds: Double, _ rarityLevel: Double) -> CameraPunch {
  if popElapsedMilliseconds < 0 || !popElapsedMilliseconds.isFinite { return CameraPunch(scaleBoost: 0, shakeX: 0, shakeY: 0) }
  let strength = getRarityProfile(rarityLevel).punchStrength
  let shake = exp(-popElapsedMilliseconds / EffectsConfig.punchShakeDecayMilliseconds) * EffectsConfig.punchShakeUnits * strength
  return CameraPunch(
    scaleBoost: EffectsConfig.punchScale * strength * exp(-popElapsedMilliseconds / EffectsConfig.punchScaleDecayMilliseconds),
    shakeX: sin(popElapsedMilliseconds * EffectsConfig.punchShakeFrequency) * shake,
    shakeY: cos(popElapsedMilliseconds * EffectsConfig.punchShakeFrequency * 1.3) * shake)
}

public func computeLidSettleDegrees(_ popElapsedMilliseconds: Double) -> Double {
  let settleElapsed = popElapsedMilliseconds - SceneConfig.lidOpenDurationMilliseconds
  if !settleElapsed.isFinite || settleElapsed < 0 { return 0 }
  return EffectsConfig.lidSettleDegrees * exp(-settleElapsed / EffectsConfig.lidSettleDecayMilliseconds)
    * sin((settleElapsed / EffectsConfig.lidSettlePeriodMilliseconds) * 2 * Double.pi)
}

public func computeSeamIntensity(_ scene: OpeningSceneState, _ now: Double, _ focusLinearProgress: Double, _ tuckProgress: Double)
  -> Double
{
  if scene.focusTarget != 1 || focusLinearProgress < 1 || scene.rarityLevel < 0 { return 0 }
  if scene.lidTarget == 0 {
    return EffectsConfig.seamIdleBase
      + EffectsConfig.seamIdleAmplitude * sin((now / EffectsConfig.seamIdlePeriodMilliseconds) * 2 * Double.pi)
  }
  let popElapsed = getPopElapsedMilliseconds(scene, now)
  if popElapsed < 0 {
    return EffectsConfig.seamAnticipationStart
      + EffectsConfig.seamAnticipationRange * pow(getAnticipationLinear(scene, now), EffectsConfig.seamAnticipationExponent)
  }
  return (EffectsConfig.seamOpenLevel + EffectsConfig.seamFlashPeak * exp(-popElapsed / EffectsConfig.seamFlashDecayMilliseconds))
    * (1 - tuckProgress)
}

public struct ShaftEffect: Equatable {
  public var alpha: Double
  public var scaleX: Double
  public var scaleY: Double
}

public func computeShaftEffect(_ popElapsedMilliseconds: Double, _ tuckProgress: Double, _ now: Double, _ rarityLevel: Double)
  -> ShaftEffect
{
  if popElapsedMilliseconds < 0 || !popElapsedMilliseconds.isFinite { return ShaftEffect(alpha: 0, scaleX: 0, scaleY: 0) }
  let profile = getRarityProfile(rarityLevel)
  let ramp = easeOutCubic(clampToUnitInterval(popElapsedMilliseconds / EffectsConfig.shaftRampMilliseconds))
  let pulse = 0.85 + 0.15 * sin((now / EffectsConfig.shaftPulsePeriodMilliseconds) * 2 * Double.pi)
  return ShaftEffect(
    alpha: min(1, 1.3 * ramp * profile.shaftStrength * pulse * (1 - tuckProgress)),
    scaleX: EffectsConfig.shaftBaseWidth + EffectsConfig.shaftWidthGrowth * ramp,
    scaleY: profile.shaftHeight
      * (EffectsConfig.shaftStartHeightFraction + (1 - EffectsConfig.shaftStartHeightFraction) * ramp))
}

public struct RingEffect: Equatable {
  public var alpha: Double
  public var scale: Double
}

public func computeRingEffect(_ ringIndex: Int, _ popElapsedMilliseconds: Double, _ rarityLevel: Double) -> RingEffect {
  let elapsed = popElapsedMilliseconds - Double(ringIndex) * EffectsConfig.ringDelayMilliseconds
  if ringIndex >= getRarityProfile(rarityLevel).ringCount || !elapsed.isFinite || elapsed < 0
    || elapsed > EffectsConfig.ringDurationMilliseconds
  {
    return RingEffect(alpha: 0, scale: 0)
  }
  let progress = elapsed / EffectsConfig.ringDurationMilliseconds
  return RingEffect(
    alpha: (1 - progress) * (1 - progress) * EffectsConfig.ringPeakAlpha,
    scale: EffectsConfig.ringStartScale + (EffectsConfig.ringMaximumScale - EffectsConfig.ringStartScale) * easeOutCubic(progress))
}

public func computeBurstParticle(_ particleIndex: Int, _ popElapsedMilliseconds: Double, _ rarityLevel: Double) -> EffectPoint {
  if particleIndex >= getRarityProfile(rarityLevel).burstCount || !popElapsedMilliseconds.isFinite || popElapsedMilliseconds < 0
    || popElapsedMilliseconds > EffectsConfig.burstLifetimeMilliseconds
  {
    return .hidden
  }
  let index = Double(particleIndex)
  let angle = index * 2.399963
  let randomA = fraction(sin(index * 12.9898) * 43758.5453)
  let randomB = fraction(sin(index * 78.233) * 12543.12)
  let speed = 0.9 + 1.5 * randomA
  let seconds = popElapsedMilliseconds / 1000
  let life = popElapsedMilliseconds / EffectsConfig.burstLifetimeMilliseconds
  return EffectPoint(
    x: cos(angle) * speed * seconds,
    y: (1.3 + 2 * randomB) * seconds - 0.5 * EffectsConfig.burstGravity * seconds * seconds,
    z: sin(angle) * speed * 0.4 * seconds,
    scale: EffectsConfig.burstSize * (0.5 + 0.7 * randomA) * min(1, popElapsedMilliseconds / 80) * pow(1 - life, 0.7))
}

public func computeDustPoint(_ dustIndex: Int, _ now: Double, _ anticipationLinear: Double, _ visibility: Double) -> EffectPoint {
  if visibility <= 0.001 { return .hidden }
  let index = Double(dustIndex)
  let angle = index * ((Double.pi * 2) / Double(EffectsConfig.dustPoolSize)) + now * 0.0004 * (1 + anticipationLinear * 6)
  let baseRadius = 1 + fraction(index * 0.37)
  let radius = baseRadius * (1 - EffectsConfig.dustPullInFraction * anticipationLinear * anticipationLinear)
  return EffectPoint(
    x: cos(angle) * radius,
    y: sin(now * 0.0007 + index) * 0.5 + (fraction(index * 0.61) - 0.5) * 1.6,
    z: -(0.8 + 0.9 * fraction(index * 0.53)),
    scale: (EffectsConfig.dustSize + 0.12 * fraction(index * 0.77)) * (0.6 + 1.0 * fraction(index * 0.53)) * visibility)
}

public func computeAuraAlpha(_ isFocusedCard: Bool, _ focusProgress: Double, _ seamIntensity: Double, _ popElapsedMilliseconds: Double)
  -> Double
{
  if !isFocusedCard { return EffectsConfig.auraListAlpha * (1 - focusProgress) }
  let flash = popElapsedMilliseconds.isFinite && popElapsedMilliseconds >= 0 ? 0.25 * exp(-popElapsedMilliseconds / 400) : 0
  return EffectsConfig.auraListAlpha + (EffectsConfig.auraFocusedAlpha - EffectsConfig.auraListAlpha) * focusProgress
    + 0.1 * min(1.5, seamIntensity) * focusProgress + flash
}

// Where a point of the box model ends up in the world: centre the model, scale, turn about X (pitch), turn about Y (yaw), move.
public func transformModelPoint(_ x: Double, _ y: Double, _ z: Double, centerHeight: Double, pose: OpeningPose) -> (Double, Double, Double) {
  let scaledX = x * pose.scale
  let scaledY = (y - centerHeight) * pose.scale
  let scaledZ = z * pose.scale
  let pitchCos = cos(pose.pitchRadians)
  let pitchSin = sin(pose.pitchRadians)
  let pitchedY = scaledY * pitchCos - scaledZ * pitchSin
  let pitchedZ = scaledY * pitchSin + scaledZ * pitchCos
  let yawCos = cos(pose.yawRadians)
  let yawSin = sin(pose.yawRadians)
  return (
    scaledX * yawCos + pitchedZ * yawSin, pitchedY + pose.translateY, -scaledX * yawSin + pitchedZ * yawCos + pose.translateZ
  )
}

public func stepScrollSway(_ previousSway: Double, _ scrollVelocityPixelsPerSecond: Double, _ deltaSeconds: Double) -> Double {
  let target = max(
    -EffectsConfig.swayMaximumRadians,
    min(EffectsConfig.swayMaximumRadians, -scrollVelocityPixelsPerSecond * EffectsConfig.swayRadiansPerPixelPerSecond))
  return previousSway + (target - previousSway) * min(1, deltaSeconds * EffectsConfig.swayResponsePerSecond)
}

// 0..1 how much a box with this metallic finish shimmers (iridescence).
public func getIridescenceStrength(_ metallic: Double) -> Double {
  clampToUnitInterval((metallic - EffectsConfig.iridescenceMinimumMetallic) / EffectsConfig.iridescenceMetallicRange)
}

// Colour shift (linear RGB, added to the base colour) of a shimmering box turned to yaw / pitch.
public func computeIridescenceTint(_ strength: Double, _ yawRadians: Double, _ pitchRadians: Double, _ now: Double) -> [Double] {
  if strength <= 0 { return [0, 0, 0] }
  let phase =
    yawRadians * EffectsConfig.iridescenceYawFrequency + pitchRadians * EffectsConfig.iridescencePitchFrequency
    + now * EffectsConfig.iridescenceTimeFrequency
  let amplitude = strength * EffectsConfig.iridescenceAmplitude
  return [amplitude * cos(phase), amplitude * cos(phase + 2.094), amplitude * cos(phase + 4.189)]
}

// ------------------------------- Layout -------------------------------- //
// One object of the show: a flat soft shape facing the camera, scaleX wide and scaleY high (world units); 0 = hidden.
public struct EffectItem: Equatable {
  public var x: Double
  public var y: Double
  public var z: Double
  public var scaleX: Double
  public var scaleY: Double
  public var alpha: Double
  public static let hidden = EffectItem(x: 0, y: 0, z: 0, scaleX: 0, scaleY: 0, alpha: 0)
}

public struct EffectsLayout: Equatable {
  public var auras: [EffectItem]
  public var sparks: [EffectItem]
  public var dust: [EffectItem]
  public var shaft: EffectItem
  public var rings: [EffectItem]
}

public func computeEffectsLayout(
  scene: OpeningSceneState, now: Double, focusProgress: Double, tuckProgress: Double, seamIntensity: Double,
  poses: [OpeningPose], shakeX: Double
) -> EffectsLayout {
  let popElapsed = getPopElapsedMilliseconds(scene, now)
  let anticipation = getAnticipationLinear(scene, now)
  let hasFocusedPose = scene.focusedCardIndex >= 0 && scene.focusedCardIndex < poses.count
  let focusedPose = hasFocusedPose ? poses[scene.focusedCardIndex] : nil
  let unit = focusedPose?.scale ?? 0

  var auras: [EffectItem] = []
  for (cardIndex, pose) in poses.enumerated() {
    let isFocused = cardIndex == scene.focusedCardIndex
    let alpha =
      pose.isVisible
      ? computeAuraAlpha(isFocused, focusProgress, seamIntensity, popElapsed) * (isFocused ? 1 - tuckProgress : 1) : 0
    let diameter = pose.scale * SceneConfig.boxWidthUnits * EffectsConfig.auraScale
    auras.append(
      EffectItem(
        x: isFocused ? shakeX : 0, y: pose.translateY, z: pose.translateZ - EffectsConfig.auraDepthBehindBox * pose.scale,
        scaleX: alpha > 0 ? diameter : 0, scaleY: diameter, alpha: alpha))
  }

  guard let pose = focusedPose else {
    return EffectsLayout(
      auras: auras, sparks: Array(repeating: .hidden, count: EffectsConfig.burstParticlePoolSize),
      dust: Array(repeating: .hidden, count: EffectsConfig.dustPoolSize), shaft: .hidden,
      rings: Array(repeating: .hidden, count: EffectsConfig.ringPoolSize))
  }

  let mouth = transformModelPoint(
    0, EffectsConfig.shaftAnchorHeight + SceneConfig.boxCenterHeightUnits, 0, centerHeight: SceneConfig.boxCenterHeightUnits, pose: pose)
  let inFront = EffectsConfig.inFrontOfBoxModelUnits

  var sparks: [EffectItem] = []
  for index in 0..<EffectsConfig.burstParticlePoolSize {
    let point = computeBurstParticle(index, popElapsed, scene.rarityLevel)
    sparks.append(
      EffectItem(
        x: mouth.0 + shakeX + point.x * unit, y: mouth.1 + point.y * unit, z: mouth.2 + (point.z + inFront) * unit,
        scaleX: point.scale * unit, scaleY: point.scale * unit, alpha: 1))
  }

  let dustVisibility = focusProgress * (1 - tuckProgress) * (popElapsed >= 0 ? max(0, 1 - popElapsed / 400) : 1)
  var dust: [EffectItem] = []
  for index in 0..<EffectsConfig.dustPoolSize {
    let point = computeDustPoint(index, now, anticipation, dustVisibility)
    dust.append(
      EffectItem(
        x: shakeX + point.x * unit, y: pose.translateY + point.y * unit, z: pose.translateZ + point.z * unit,
        scaleX: point.scale * unit, scaleY: point.scale * unit, alpha: 1))
  }

  let shaftEffect = computeShaftEffect(popElapsed, tuckProgress, now, scene.rarityLevel)
  let shaftWidth = shaftEffect.scaleX * unit * SceneConfig.boxWidthUnits
  let shaft = EffectItem(
    x: mouth.0 + shakeX, y: mouth.1, z: mouth.2 + inFront * unit, scaleX: shaftEffect.alpha > 0 ? shaftWidth : 0,
    scaleY: shaftEffect.scaleY * unit * SceneConfig.boxWidthUnits, alpha: shaftEffect.alpha)

  var rings: [EffectItem] = []
  for index in 0..<EffectsConfig.ringPoolSize {
    let ring = computeRingEffect(index, popElapsed, scene.rarityLevel)
    let diameter = ring.scale * unit * SceneConfig.boxWidthUnits
    rings.append(
      EffectItem(
        x: mouth.0 + shakeX, y: mouth.1, z: mouth.2 + inFront * unit, scaleX: ring.alpha > 0 ? diameter : 0, scaleY: diameter,
        alpha: ring.alpha))
  }

  return EffectsLayout(auras: auras, sparks: sparks, dust: dust, shaft: shaft, rings: rings)
}
