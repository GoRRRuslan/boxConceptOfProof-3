import { ANTICIPATION_DURATION_MILLISECONDS, LID_OPEN_DURATION_MILLISECONDS } from '@flows/openingFlow/_config/openingConfig'
import {
  AURA_FOCUSED_ALPHA,
  AURA_LIST_ALPHA,
  BURST_GRAVITY,
  BURST_LIFETIME_MILLISECONDS,
  BURST_SIZE,
  DUST_POOL_SIZE,
  DUST_PULL_IN_FRACTION,
  DUST_SIZE,
  HIT_STOP_MILLISECONDS,
  LID_SETTLE_DECAY_MILLISECONDS,
  LID_SETTLE_DEGREES,
  LID_SETTLE_PERIOD_MILLISECONDS,
  PUNCH_SCALE,
  PUNCH_SCALE_DECAY_MILLISECONDS,
  PUNCH_SHAKE_DECAY_MILLISECONDS,
  PUNCH_SHAKE_FREQUENCY,
  PUNCH_SHAKE_UNITS,
  RARITY_EFFECT_PROFILES,
  RING_DELAY_MILLISECONDS,
  RING_DURATION_MILLISECONDS,
  RING_MAXIMUM_SCALE,
  RING_PEAK_ALPHA,
  RING_START_SCALE,
  SEAM_ANTICIPATION_EXPONENT,
  SEAM_ANTICIPATION_RANGE,
  SEAM_ANTICIPATION_START,
  SEAM_FLASH_DECAY_MILLISECONDS,
  SEAM_FLASH_PEAK,
  SEAM_IDLE_AMPLITUDE,
  SEAM_IDLE_BASE,
  SEAM_IDLE_PERIOD_MILLISECONDS,
  SEAM_OPEN_LEVEL,
  SHAFT_BASE_WIDTH,
  SHAFT_PULSE_PERIOD_MILLISECONDS,
  SHAFT_RAMP_MILLISECONDS,
  SHAFT_START_HEIGHT_FRACTION,
  SHAFT_WIDTH_GROWTH,
  SWAY_MAXIMUM_RADIANS,
  SWAY_RADIANS_PER_PIXEL_PER_SECOND,
  SWAY_RESPONSE_PER_SECOND,
  type IRarityEffectProfile,
} from '@flows/openingFlow/_config/effectsConfig'
import { clampToUnitInterval, easeOutCubic } from '@flows/openingFlow/_facadesLogic/openingEasing'
import type { IOpeningSceneState } from '@flows/openingFlow/_types'

// Pure maths of the show around the box. Nothing here touches the 3D engine: the scene asks "where is particle 7 now?" and
// places an object there. The same functions (as copies) drive the other repositories, and the native scene core of the
// native repository is checked against this file with shared test vectors.

export interface IEffectPoint {
  x: number
  y: number
  z: number
  // 0 = hidden. World units per model unit are applied by the caller.
  scale: number
}

export interface IShaftEffect {
  alpha: number
  scaleX: number
  scaleY: number
}

export interface ICameraPunch {
  scaleBoost: number
  shakeX: number
  shakeY: number
}

export const HIDDEN_EFFECT_POINT: IEffectPoint = { x: 0, y: 0, z: 0, scale: 0 }

const fraction = (value: number): number => {
  return value - Math.floor(value)
}

export const getRarityProfile = (rarityLevel: number): IRarityEffectProfile => {
  return RARITY_EFFECT_PROFILES[Math.max(0, Math.min(RARITY_EFFECT_PROFILES.length - 1, Math.round(rarityLevel)))]
}

// Milliseconds since the lid was let go (negative during the anticipation, minus infinity when the box is not being opened).
export const getPopElapsedMilliseconds = (scene: IOpeningSceneState, nowMilliseconds: number): number => {
  return scene.lidTarget === 1 && scene.lidStartedAtMilliseconds > 0
    ? nowMilliseconds - scene.lidStartedAtMilliseconds
    : Number.NEGATIVE_INFINITY
}

// 0..1 how far the anticipation has come (0 outside of it).
export const getAnticipationLinear = (scene: IOpeningSceneState, nowMilliseconds: number): number => {
  if (scene.lidTarget !== 1 || scene.openStartedAtMilliseconds === 0) {
    return 0
  }

  return clampToUnitInterval((nowMilliseconds - scene.openStartedAtMilliseconds) / ANTICIPATION_DURATION_MILLISECONDS)
}

// The box holds its breath just before the lid is let go: the shake dies away over the last HIT_STOP_MILLISECONDS.
export const computeJitterScale = (popElapsedMilliseconds: number): number => {
  const untilPop = -popElapsedMilliseconds

  if (!Number.isFinite(untilPop) || untilPop <= 0 || untilPop >= HIT_STOP_MILLISECONDS) {
    return 1
  }

  const normalized = untilPop / HIT_STOP_MILLISECONDS

  return normalized * normalized * (3 - 2 * normalized)
}

// A short push of the camera when the lid is let go: the picture swells and shakes, then settles.
export const computeCameraPunch = (popElapsedMilliseconds: number, rarityLevel: number): ICameraPunch => {
  if (popElapsedMilliseconds < 0 || !Number.isFinite(popElapsedMilliseconds)) {
    return { scaleBoost: 0, shakeX: 0, shakeY: 0 }
  }

  const strength = getRarityProfile(rarityLevel).punchStrength
  const shake = Math.exp(-popElapsedMilliseconds / PUNCH_SHAKE_DECAY_MILLISECONDS) * PUNCH_SHAKE_UNITS * strength

  return {
    scaleBoost: PUNCH_SCALE * strength * Math.exp(-popElapsedMilliseconds / PUNCH_SCALE_DECAY_MILLISECONDS),
    shakeX: Math.sin(popElapsedMilliseconds * PUNCH_SHAKE_FREQUENCY) * shake,
    shakeY: Math.cos(popElapsedMilliseconds * PUNCH_SHAKE_FREQUENCY * 1.3) * shake,
  }
}

// Degrees added to the lid angle after it reached the open position: it swings a little past and settles.
export const computeLidSettleDegrees = (popElapsedMilliseconds: number): number => {
  const settleElapsed = popElapsedMilliseconds - LID_OPEN_DURATION_MILLISECONDS

  if (!Number.isFinite(settleElapsed) || settleElapsed < 0) {
    return 0
  }

  return (
    LID_SETTLE_DEGREES *
    Math.exp(-settleElapsed / LID_SETTLE_DECAY_MILLISECONDS) *
    Math.sin((settleElapsed / LID_SETTLE_PERIOD_MILLISECONDS) * 2 * Math.PI)
  )
}

// 0..~2.4 strength of the light along the seams of the box. It breathes on a bought box, builds up while the box shakes,
// flashes when the lid is let go and stays softly lit while the box is open. Multiplied by the rarity colour and boost.
export const computeSeamIntensity = (
  scene: IOpeningSceneState,
  nowMilliseconds: number,
  focusLinearProgress: number,
  tuckProgress: number,
): number => {
  if (scene.focusTarget !== 1 || focusLinearProgress < 1 || scene.rarityLevel < 0) {
    return 0
  }

  if (scene.lidTarget === 0) {
    return SEAM_IDLE_BASE + SEAM_IDLE_AMPLITUDE * Math.sin((nowMilliseconds / SEAM_IDLE_PERIOD_MILLISECONDS) * 2 * Math.PI)
  }

  const popElapsed = getPopElapsedMilliseconds(scene, nowMilliseconds)

  if (popElapsed < 0) {
    return SEAM_ANTICIPATION_START + SEAM_ANTICIPATION_RANGE * getAnticipationLinear(scene, nowMilliseconds) ** SEAM_ANTICIPATION_EXPONENT
  }

  return (SEAM_OPEN_LEVEL + SEAM_FLASH_PEAK * Math.exp(-popElapsed / SEAM_FLASH_DECAY_MILLISECONDS)) * (1 - tuckProgress)
}

// Light shaft rising from the open box (anchored at its mouth). scaleY is in box heights.
export const computeShaftEffect = (
  popElapsedMilliseconds: number,
  tuckProgress: number,
  nowMilliseconds: number,
  rarityLevel: number,
): IShaftEffect => {
  if (popElapsedMilliseconds < 0 || !Number.isFinite(popElapsedMilliseconds)) {
    return { alpha: 0, scaleX: 0, scaleY: 0 }
  }

  const profile = getRarityProfile(rarityLevel)
  const ramp = easeOutCubic(clampToUnitInterval(popElapsedMilliseconds / SHAFT_RAMP_MILLISECONDS))
  const pulse = 0.85 + 0.15 * Math.sin((nowMilliseconds / SHAFT_PULSE_PERIOD_MILLISECONDS) * 2 * Math.PI)

  return {
    alpha: Math.min(1, 1.3 * ramp * profile.shaftStrength * pulse * (1 - tuckProgress)),
    scaleX: SHAFT_BASE_WIDTH + SHAFT_WIDTH_GROWTH * ramp,
    scaleY: profile.shaftHeight * (SHAFT_START_HEIGHT_FRACTION + (1 - SHAFT_START_HEIGHT_FRACTION) * ramp),
  }
}

// Expanding shock waves; scale is in box widths.
export interface IRingEffect {
  alpha: number
  scale: number
}

export const computeRingEffect = (ringIndex: number, popElapsedMilliseconds: number, rarityLevel: number): IRingEffect => {
  const elapsed = popElapsedMilliseconds - ringIndex * RING_DELAY_MILLISECONDS

  if (ringIndex >= getRarityProfile(rarityLevel).ringCount || !Number.isFinite(elapsed) || elapsed < 0 || elapsed > RING_DURATION_MILLISECONDS) {
    return { alpha: 0, scale: 0 }
  }

  const progress = elapsed / RING_DURATION_MILLISECONDS

  return {
    alpha: (1 - progress) * (1 - progress) * RING_PEAK_ALPHA,
    scale: RING_START_SCALE + (RING_MAXIMUM_SCALE - RING_START_SCALE) * easeOutCubic(progress),
  }
}

// One particle of the burst; x, y, z are offsets from the mouth of the box in model units.
export const computeBurstParticle = (particleIndex: number, popElapsedMilliseconds: number, rarityLevel: number): IEffectPoint => {
  if (
    particleIndex >= getRarityProfile(rarityLevel).burstCount ||
    !Number.isFinite(popElapsedMilliseconds) ||
    popElapsedMilliseconds < 0 ||
    popElapsedMilliseconds > BURST_LIFETIME_MILLISECONDS
  ) {
    return HIDDEN_EFFECT_POINT
  }

  const angle = particleIndex * 2.399963
  const randomA = fraction(Math.sin(particleIndex * 12.9898) * 43758.5453)
  const randomB = fraction(Math.sin(particleIndex * 78.233) * 12543.12)
  const speed = 0.9 + 1.5 * randomA
  const seconds = popElapsedMilliseconds / 1000
  const life = popElapsedMilliseconds / BURST_LIFETIME_MILLISECONDS

  return {
    x: Math.cos(angle) * speed * seconds,
    y: (1.3 + 2 * randomB) * seconds - 0.5 * BURST_GRAVITY * seconds * seconds,
    z: Math.sin(angle) * speed * 0.4 * seconds,
    scale: BURST_SIZE * (0.5 + 0.7 * randomA) * Math.min(1, popElapsedMilliseconds / 80) * (1 - life) ** 0.7,
  }
}

// Faint light motes floating BEHIND the focused box (never in front of or inside it, so nothing crosses the figure); during the
// anticipation they are drawn in towards the box and disappear behind it. Offsets from the box centre in model units.
export const computeDustPoint = (
  dustIndex: number,
  nowMilliseconds: number,
  anticipationLinear: number,
  visibility: number,
): IEffectPoint => {
  if (visibility <= 0.001) {
    return HIDDEN_EFFECT_POINT
  }

  const angle = dustIndex * ((Math.PI * 2) / DUST_POOL_SIZE) + nowMilliseconds * 0.0004 * (1 + anticipationLinear * 6)
  const baseRadius = 1 + fraction(dustIndex * 0.37)
  const radius = baseRadius * (1 - DUST_PULL_IN_FRACTION * anticipationLinear * anticipationLinear)

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(nowMilliseconds * 0.0007 + dustIndex) * 0.5 + (fraction(dustIndex * 0.61) - 0.5) * 1.6,
    z: -(0.8 + 0.9 * fraction(dustIndex * 0.53)),
    scale: (DUST_SIZE + 0.12 * fraction(dustIndex * 0.77)) * visibility,
  }
}

// Alpha of the coloured glow behind a box.
export const computeAuraAlpha = (isFocusedCard: boolean, focusProgress: number, seamIntensity: number, popElapsedMilliseconds: number): number => {
  if (!isFocusedCard) {
    return AURA_LIST_ALPHA * (1 - focusProgress)
  }

  const flash = Number.isFinite(popElapsedMilliseconds) && popElapsedMilliseconds >= 0 ? 0.25 * Math.exp(-popElapsedMilliseconds / 400) : 0

  return AURA_LIST_ALPHA + (AURA_FOCUSED_ALPHA - AURA_LIST_ALPHA) * focusProgress + 0.1 * Math.min(1.5, seamIntensity) * focusProgress + flash
}

interface IBoxPoseForPoint {
  scale: number
  pitchRadians: number
  yawRadians: number
  translateY: number
  translateZ: number
}

// Where a point of the box model ends up in the world. Same order as the transform of the box: move the model so its centre
// is at the origin, scale, turn about X (pitch), turn about Y (yaw), move to the box position.
export const transformModelPoint = (
  x: number,
  y: number,
  z: number,
  centerHeight: number,
  pose: IBoxPoseForPoint,
): [number, number, number] => {
  const scaledX = x * pose.scale
  const scaledY = (y - centerHeight) * pose.scale
  const scaledZ = z * pose.scale
  const pitchCos = Math.cos(pose.pitchRadians)
  const pitchSin = Math.sin(pose.pitchRadians)
  const pitchedY = scaledY * pitchCos - scaledZ * pitchSin
  const pitchedZ = scaledY * pitchSin + scaledZ * pitchCos
  const yawCos = Math.cos(pose.yawRadians)
  const yawSin = Math.sin(pose.yawRadians)

  return [scaledX * yawCos + pitchedZ * yawSin, pitchedY + pose.translateY, -scaledX * yawSin + pitchedZ * yawCos + pose.translateZ]
}

// Low-pass filtered sway of the list boxes from the scroll speed (pixels per second): they lean against the direction of
// the scroll and swing back when it stops.
export const stepScrollSway = (previousSway: number, scrollVelocityPixelsPerSecond: number, deltaSeconds: number): number => {
  const target = Math.max(
    -SWAY_MAXIMUM_RADIANS,
    Math.min(SWAY_MAXIMUM_RADIANS, -scrollVelocityPixelsPerSecond * SWAY_RADIANS_PER_PIXEL_PER_SECOND),
  )

  return previousSway + (target - previousSway) * Math.min(1, deltaSeconds * SWAY_RESPONSE_PER_SECOND)
}
