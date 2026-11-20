package expo.modules.mysteryscene.math

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * The show around the box: seams, light shaft, shock waves, sparks, dust, aura, camera punch, lid settle, scroll sway.
 * Ported 1:1 from the TypeScript reference (computeSceneEffects.ts, computeEffectsLayout.ts and effectsConfig.ts) and from the
 * Swift port; the shared test vectors fail when a value or a formula drifts.
 */
object EffectsConfig {
  const val BURST_PARTICLE_POOL_SIZE = 32
  const val RING_POOL_SIZE = 3
  const val DUST_POOL_SIZE = 10

  const val HIT_STOP_MILLISECONDS = 140.0
  const val PUNCH_SCALE = 0.07
  const val PUNCH_SCALE_DECAY_MILLISECONDS = 110.0
  const val PUNCH_SHAKE_UNITS = 0.02
  const val PUNCH_SHAKE_DECAY_MILLISECONDS = 140.0
  const val PUNCH_SHAKE_FREQUENCY = 0.09
  const val LID_SETTLE_DEGREES = 4.0
  const val LID_SETTLE_DECAY_MILLISECONDS = 180.0
  const val LID_SETTLE_PERIOD_MILLISECONDS = 280.0

  const val SEAM_IDLE_BASE = 0.2
  const val SEAM_IDLE_AMPLITUDE = 0.12
  const val SEAM_IDLE_PERIOD_MILLISECONDS = 1400.0
  const val SEAM_ANTICIPATION_START = 0.25
  const val SEAM_ANTICIPATION_RANGE = 1.75
  const val SEAM_ANTICIPATION_EXPONENT = 1.6
  const val SEAM_FLASH_PEAK = 2.4
  const val SEAM_FLASH_DECAY_MILLISECONDS = 260.0
  const val SEAM_OPEN_LEVEL = 0.5

  const val SHAFT_RAMP_MILLISECONDS = 450.0
  const val SHAFT_PULSE_PERIOD_MILLISECONDS = 3100.0
  const val SHAFT_BASE_WIDTH = 0.85
  const val SHAFT_WIDTH_GROWTH = 0.15
  const val SHAFT_START_HEIGHT_FRACTION = 0.35
  const val SHAFT_ANCHOR_HEIGHT = 0.3

  const val RING_DELAY_MILLISECONDS = 140.0
  const val RING_DURATION_MILLISECONDS = 900.0
  const val RING_MAXIMUM_SCALE = 3.4
  const val RING_START_SCALE = 0.2
  const val RING_PEAK_ALPHA = 0.9

  const val BURST_LIFETIME_MILLISECONDS = 1500.0
  const val BURST_GRAVITY = 2.6
  const val BURST_SIZE = 0.11

  const val DUST_SIZE = 0.16
  const val DUST_PULL_IN_FRACTION = 0.85

  const val AURA_LIST_ALPHA = 0.1
  const val AURA_FOCUSED_ALPHA = 0.14
  const val AURA_SCALE = 2.4

  /** How far behind its box the aura sits and how far in front of the open box the show is drawn (model units). */
  const val AURA_DEPTH_BEHIND_BOX = 0.9
  const val IN_FRONT_OF_BOX_MODEL_UNITS = 1.3

  const val IRIDESCENCE_MINIMUM_METALLIC = 0.25
  const val IRIDESCENCE_METALLIC_RANGE = 0.4
  const val IRIDESCENCE_AMPLITUDE = 0.16
  const val IRIDESCENCE_YAW_FREQUENCY = 1.3
  const val IRIDESCENCE_PITCH_FREQUENCY = 0.9
  const val IRIDESCENCE_TIME_FREQUENCY = 0.0006

  const val SWAY_RADIANS_PER_PIXEL_PER_SECOND = 0.00035
  const val SWAY_MAXIMUM_RADIANS = 0.25
  const val SWAY_RESPONSE_PER_SECOND = 10.0

  class RarityProfile(
    val burstCount: Int,
    val ringCount: Int,
    val shaftStrength: Double,
    val shaftHeight: Double,
    val emissiveBoost: Double,
    val punchStrength: Double,
  )

  /** Index = rarity level (0 common ... 3 legendary). */
  val rarityProfiles = listOf(
    RarityProfile(6, 1, 0.45, 3.2, 1.0, 0.5),
    RarityProfile(12, 1, 0.65, 3.2, 1.2, 0.7),
    RarityProfile(20, 2, 0.85, 3.4, 1.5, 0.85),
    RarityProfile(32, 3, 1.0, 3.6, 2.0, 1.0),
  )
}

data class EffectPoint(val x: Double, val y: Double, val z: Double, val scale: Double) {
  companion object {
    val HIDDEN = EffectPoint(0.0, 0.0, 0.0, 0.0)
  }
}

data class CameraPunch(val scaleBoost: Double, val shakeX: Double, val shakeY: Double)

private fun fraction(value: Double): Double = value - floor(value)

fun getRarityProfile(rarityLevel: Double): EffectsConfig.RarityProfile =
  EffectsConfig.rarityProfiles[max(0, min(EffectsConfig.rarityProfiles.size - 1, rarityLevel.roundToInt()))]

/** Milliseconds since the lid was let go (negative during the anticipation, minus infinity when not being opened). */
fun getPopElapsedMilliseconds(scene: OpeningSceneState, now: Double): Double =
  if (scene.lidTarget == 1.0 && scene.lidStartedAtMilliseconds > 0) now - scene.lidStartedAtMilliseconds else Double.NEGATIVE_INFINITY

fun getAnticipationLinear(scene: OpeningSceneState, now: Double): Double {
  if (scene.lidTarget != 1.0 || scene.openStartedAtMilliseconds == 0.0) return 0.0
  return clampToUnitInterval((now - scene.openStartedAtMilliseconds) / SceneConfig.ANTICIPATION_DURATION_MILLISECONDS)
}

/** The box holds its breath just before the lid is let go: the shake dies away over the last hit-stop milliseconds. */
fun computeJitterScale(popElapsedMilliseconds: Double): Double {
  val untilPop = -popElapsedMilliseconds
  if (!untilPop.isFinite() || untilPop <= 0 || untilPop >= EffectsConfig.HIT_STOP_MILLISECONDS) return 1.0
  val normalized = untilPop / EffectsConfig.HIT_STOP_MILLISECONDS
  return normalized * normalized * (3 - 2 * normalized)
}

fun computeCameraPunch(popElapsedMilliseconds: Double, rarityLevel: Double): CameraPunch {
  if (popElapsedMilliseconds < 0 || !popElapsedMilliseconds.isFinite()) return CameraPunch(0.0, 0.0, 0.0)
  val strength = getRarityProfile(rarityLevel).punchStrength
  val shake = exp(-popElapsedMilliseconds / EffectsConfig.PUNCH_SHAKE_DECAY_MILLISECONDS) * EffectsConfig.PUNCH_SHAKE_UNITS * strength
  return CameraPunch(
    EffectsConfig.PUNCH_SCALE * strength * exp(-popElapsedMilliseconds / EffectsConfig.PUNCH_SCALE_DECAY_MILLISECONDS),
    sin(popElapsedMilliseconds * EffectsConfig.PUNCH_SHAKE_FREQUENCY) * shake,
    cos(popElapsedMilliseconds * EffectsConfig.PUNCH_SHAKE_FREQUENCY * 1.3) * shake,
  )
}

fun computeLidSettleDegrees(popElapsedMilliseconds: Double): Double {
  val settleElapsed = popElapsedMilliseconds - SceneConfig.LID_OPEN_DURATION_MILLISECONDS
  if (!settleElapsed.isFinite() || settleElapsed < 0) return 0.0
  return EffectsConfig.LID_SETTLE_DEGREES * exp(-settleElapsed / EffectsConfig.LID_SETTLE_DECAY_MILLISECONDS) *
    sin((settleElapsed / EffectsConfig.LID_SETTLE_PERIOD_MILLISECONDS) * 2 * PI)
}

fun computeSeamIntensity(scene: OpeningSceneState, now: Double, focusLinearProgress: Double, tuckProgress: Double): Double {
  if (scene.focusTarget != 1.0 || focusLinearProgress < 1 || scene.rarityLevel < 0) return 0.0
  if (scene.lidTarget == 0.0) {
    return EffectsConfig.SEAM_IDLE_BASE + EffectsConfig.SEAM_IDLE_AMPLITUDE * sin((now / EffectsConfig.SEAM_IDLE_PERIOD_MILLISECONDS) * 2 * PI)
  }
  val popElapsed = getPopElapsedMilliseconds(scene, now)
  if (popElapsed < 0) {
    return EffectsConfig.SEAM_ANTICIPATION_START +
      EffectsConfig.SEAM_ANTICIPATION_RANGE * getAnticipationLinear(scene, now).pow(EffectsConfig.SEAM_ANTICIPATION_EXPONENT)
  }
  return (EffectsConfig.SEAM_OPEN_LEVEL + EffectsConfig.SEAM_FLASH_PEAK * exp(-popElapsed / EffectsConfig.SEAM_FLASH_DECAY_MILLISECONDS)) *
    (1 - tuckProgress)
}

data class ShaftEffect(val alpha: Double, val scaleX: Double, val scaleY: Double)

fun computeShaftEffect(popElapsedMilliseconds: Double, tuckProgress: Double, now: Double, rarityLevel: Double): ShaftEffect {
  if (popElapsedMilliseconds < 0 || !popElapsedMilliseconds.isFinite()) return ShaftEffect(0.0, 0.0, 0.0)
  val profile = getRarityProfile(rarityLevel)
  val ramp = easeOutCubic(clampToUnitInterval(popElapsedMilliseconds / EffectsConfig.SHAFT_RAMP_MILLISECONDS))
  val pulse = 0.85 + 0.15 * sin((now / EffectsConfig.SHAFT_PULSE_PERIOD_MILLISECONDS) * 2 * PI)
  return ShaftEffect(
    min(1.0, 1.3 * ramp * profile.shaftStrength * pulse * (1 - tuckProgress)),
    EffectsConfig.SHAFT_BASE_WIDTH + EffectsConfig.SHAFT_WIDTH_GROWTH * ramp,
    profile.shaftHeight * (EffectsConfig.SHAFT_START_HEIGHT_FRACTION + (1 - EffectsConfig.SHAFT_START_HEIGHT_FRACTION) * ramp),
  )
}

data class RingEffect(val alpha: Double, val scale: Double)

fun computeRingEffect(ringIndex: Int, popElapsedMilliseconds: Double, rarityLevel: Double): RingEffect {
  val elapsed = popElapsedMilliseconds - ringIndex * EffectsConfig.RING_DELAY_MILLISECONDS
  if (ringIndex >= getRarityProfile(rarityLevel).ringCount || !elapsed.isFinite() || elapsed < 0 || elapsed > EffectsConfig.RING_DURATION_MILLISECONDS) {
    return RingEffect(0.0, 0.0)
  }
  val progress = elapsed / EffectsConfig.RING_DURATION_MILLISECONDS
  return RingEffect(
    (1 - progress) * (1 - progress) * EffectsConfig.RING_PEAK_ALPHA,
    EffectsConfig.RING_START_SCALE + (EffectsConfig.RING_MAXIMUM_SCALE - EffectsConfig.RING_START_SCALE) * easeOutCubic(progress),
  )
}

fun computeBurstParticle(particleIndex: Int, popElapsedMilliseconds: Double, rarityLevel: Double): EffectPoint {
  if (particleIndex >= getRarityProfile(rarityLevel).burstCount || !popElapsedMilliseconds.isFinite() || popElapsedMilliseconds < 0 ||
    popElapsedMilliseconds > EffectsConfig.BURST_LIFETIME_MILLISECONDS
  ) {
    return EffectPoint.HIDDEN
  }
  val index = particleIndex.toDouble()
  val angle = index * 2.399963
  val randomA = fraction(sin(index * 12.9898) * 43758.5453)
  val randomB = fraction(sin(index * 78.233) * 12543.12)
  val speed = 0.9 + 1.5 * randomA
  val seconds = popElapsedMilliseconds / 1000
  val life = popElapsedMilliseconds / EffectsConfig.BURST_LIFETIME_MILLISECONDS
  return EffectPoint(
    cos(angle) * speed * seconds,
    (1.3 + 2 * randomB) * seconds - 0.5 * EffectsConfig.BURST_GRAVITY * seconds * seconds,
    sin(angle) * speed * 0.4 * seconds,
    EffectsConfig.BURST_SIZE * (0.5 + 0.7 * randomA) * min(1.0, popElapsedMilliseconds / 80) * (1 - life).pow(0.7),
  )
}

fun computeDustPoint(dustIndex: Int, now: Double, anticipationLinear: Double, visibility: Double): EffectPoint {
  if (visibility <= 0.001) return EffectPoint.HIDDEN
  val index = dustIndex.toDouble()
  val angle = index * ((PI * 2) / EffectsConfig.DUST_POOL_SIZE) + now * 0.0004 * (1 + anticipationLinear * 6)
  val baseRadius = 1 + fraction(index * 0.37)
  val radius = baseRadius * (1 - EffectsConfig.DUST_PULL_IN_FRACTION * anticipationLinear * anticipationLinear)
  return EffectPoint(
    cos(angle) * radius,
    sin(now * 0.0007 + index) * 0.5 + (fraction(index * 0.61) - 0.5) * 1.6,
    -(0.8 + 0.9 * fraction(index * 0.53)),
    (EffectsConfig.DUST_SIZE + 0.12 * fraction(index * 0.77)) * (0.6 + 1.0 * fraction(index * 0.53)) * visibility,
  )
}

fun computeAuraAlpha(isFocusedCard: Boolean, focusProgress: Double, seamIntensity: Double, popElapsedMilliseconds: Double): Double {
  if (!isFocusedCard) return EffectsConfig.AURA_LIST_ALPHA * (1 - focusProgress)
  val flash = if (popElapsedMilliseconds.isFinite() && popElapsedMilliseconds >= 0) 0.25 * exp(-popElapsedMilliseconds / 400) else 0.0
  return EffectsConfig.AURA_LIST_ALPHA + (EffectsConfig.AURA_FOCUSED_ALPHA - EffectsConfig.AURA_LIST_ALPHA) * focusProgress +
    0.1 * min(1.5, seamIntensity) * focusProgress + flash
}

/** Where a point of the box model ends up in the world: centre the model, scale, turn about X (pitch), turn about Y (yaw), move. */
fun transformModelPoint(x: Double, y: Double, z: Double, centerHeight: Double, pose: OpeningPose): Triple<Double, Double, Double> {
  val scaledX = x * pose.scale
  val scaledY = (y - centerHeight) * pose.scale
  val scaledZ = z * pose.scale
  val pitchCos = cos(pose.pitchRadians)
  val pitchSin = sin(pose.pitchRadians)
  val pitchedY = scaledY * pitchCos - scaledZ * pitchSin
  val pitchedZ = scaledY * pitchSin + scaledZ * pitchCos
  val yawCos = cos(pose.yawRadians)
  val yawSin = sin(pose.yawRadians)
  return Triple(scaledX * yawCos + pitchedZ * yawSin, pitchedY + pose.translateY, -scaledX * yawSin + pitchedZ * yawCos + pose.translateZ)
}

fun stepScrollSway(previousSway: Double, scrollVelocityPixelsPerSecond: Double, deltaSeconds: Double): Double {
  val target = max(
    -EffectsConfig.SWAY_MAXIMUM_RADIANS,
    min(EffectsConfig.SWAY_MAXIMUM_RADIANS, -scrollVelocityPixelsPerSecond * EffectsConfig.SWAY_RADIANS_PER_PIXEL_PER_SECOND),
  )
  return previousSway + (target - previousSway) * min(1.0, deltaSeconds * EffectsConfig.SWAY_RESPONSE_PER_SECOND)
}

/** 0..1 how much a box with this metallic finish shimmers (iridescence). */
fun getIridescenceStrength(metallic: Double): Double =
  clampToUnitInterval((metallic - EffectsConfig.IRIDESCENCE_MINIMUM_METALLIC) / EffectsConfig.IRIDESCENCE_METALLIC_RANGE)

/** Colour shift (linear RGB, added to the base colour) of a shimmering box turned to yaw / pitch. */
fun computeIridescenceTint(strength: Double, yawRadians: Double, pitchRadians: Double, now: Double): List<Double> {
  if (strength <= 0) return listOf(0.0, 0.0, 0.0)
  val phase = yawRadians * EffectsConfig.IRIDESCENCE_YAW_FREQUENCY + pitchRadians * EffectsConfig.IRIDESCENCE_PITCH_FREQUENCY +
    now * EffectsConfig.IRIDESCENCE_TIME_FREQUENCY
  val amplitude = strength * EffectsConfig.IRIDESCENCE_AMPLITUDE
  return listOf(amplitude * cos(phase), amplitude * cos(phase + 2.094), amplitude * cos(phase + 4.189))
}

// ------------------------------- Layout -------------------------------- //

/** One object of the show: a flat soft shape facing the camera, scaleX wide and scaleY high (world units); 0 = hidden. */
data class EffectItem(val x: Double, val y: Double, val z: Double, val scaleX: Double, val scaleY: Double, val alpha: Double) {
  companion object {
    val HIDDEN = EffectItem(0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
  }
}

class EffectsLayout(
  val auras: List<EffectItem>,
  val sparks: List<EffectItem>,
  val dust: List<EffectItem>,
  val shaft: EffectItem,
  val rings: List<EffectItem>,
)

fun computeEffectsLayout(
  scene: OpeningSceneState,
  now: Double,
  focusProgress: Double,
  tuckProgress: Double,
  seamIntensity: Double,
  poses: List<OpeningPose>,
  shakeX: Double,
): EffectsLayout {
  val popElapsed = getPopElapsedMilliseconds(scene, now)
  val anticipation = getAnticipationLinear(scene, now)
  val focusedPose = if (scene.focusedCardIndex >= 0 && scene.focusedCardIndex < poses.size) poses[scene.focusedCardIndex] else null
  val unit = focusedPose?.scale ?: 0.0

  val auras = poses.mapIndexed { cardIndex, pose ->
    val isFocused = cardIndex == scene.focusedCardIndex
    val alpha = if (pose.isVisible) computeAuraAlpha(isFocused, focusProgress, seamIntensity, popElapsed) * (if (isFocused) 1 - tuckProgress else 1.0) else 0.0
    val diameter = pose.scale * SceneConfig.BOX_WIDTH_UNITS * EffectsConfig.AURA_SCALE
    EffectItem(
      if (isFocused) shakeX else 0.0, pose.translateY, pose.translateZ - EffectsConfig.AURA_DEPTH_BEHIND_BOX * pose.scale,
      if (alpha > 0) diameter else 0.0, diameter, alpha,
    )
  }

  if (focusedPose == null) {
    return EffectsLayout(
      auras, List(EffectsConfig.BURST_PARTICLE_POOL_SIZE) { EffectItem.HIDDEN }, List(EffectsConfig.DUST_POOL_SIZE) { EffectItem.HIDDEN },
      EffectItem.HIDDEN, List(EffectsConfig.RING_POOL_SIZE) { EffectItem.HIDDEN },
    )
  }

  val (mouthX, mouthY, mouthZ) = transformModelPoint(
    0.0, EffectsConfig.SHAFT_ANCHOR_HEIGHT + SceneConfig.BOX_CENTER_HEIGHT_UNITS, 0.0, SceneConfig.BOX_CENTER_HEIGHT_UNITS, focusedPose,
  )
  val inFront = EffectsConfig.IN_FRONT_OF_BOX_MODEL_UNITS

  val sparks = List(EffectsConfig.BURST_PARTICLE_POOL_SIZE) { index ->
    val point = computeBurstParticle(index, popElapsed, scene.rarityLevel)
    EffectItem(mouthX + shakeX + point.x * unit, mouthY + point.y * unit, mouthZ + (point.z + inFront) * unit, point.scale * unit, point.scale * unit, 1.0)
  }

  val dustVisibility = focusProgress * (1 - tuckProgress) * (if (popElapsed >= 0) max(0.0, 1 - popElapsed / 400) else 1.0)
  val dust = List(EffectsConfig.DUST_POOL_SIZE) { index ->
    val point = computeDustPoint(index, now, anticipation, dustVisibility)
    EffectItem(
      shakeX + point.x * unit, focusedPose.translateY + point.y * unit, focusedPose.translateZ + point.z * unit,
      point.scale * unit, point.scale * unit, 1.0,
    )
  }

  val shaftEffect = computeShaftEffect(popElapsed, tuckProgress, now, scene.rarityLevel)
  val shaftWidth = shaftEffect.scaleX * unit * SceneConfig.BOX_WIDTH_UNITS
  val shaft = EffectItem(
    mouthX + shakeX, mouthY, mouthZ + inFront * unit, if (shaftEffect.alpha > 0) shaftWidth else 0.0,
    shaftEffect.scaleY * unit * SceneConfig.BOX_WIDTH_UNITS, shaftEffect.alpha,
  )

  val rings = List(EffectsConfig.RING_POOL_SIZE) { index ->
    val ring = computeRingEffect(index, popElapsed, scene.rarityLevel)
    val diameter = ring.scale * unit * SceneConfig.BOX_WIDTH_UNITS
    EffectItem(mouthX + shakeX, mouthY, mouthZ + inFront * unit, if (ring.alpha > 0) diameter else 0.0, diameter, ring.alpha)
  }

  return EffectsLayout(auras, sparks, dust, shaft, rings)
}
