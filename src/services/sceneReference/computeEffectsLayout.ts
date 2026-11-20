import { BOX_CENTER_HEIGHT_UNITS, BOX_WIDTH_UNITS } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import {
  AURA_SCALE,
  BURST_PARTICLE_POOL_SIZE,
  DUST_POOL_SIZE,
  RING_POOL_SIZE,
  SHAFT_ANCHOR_HEIGHT,
} from '@flows/openingFlow/_config/effectsConfig'
import {
  computeAuraAlpha,
  computeBurstParticle,
  computeDustPoint,
  computeRingEffect,
  computeShaftEffect,
  getAnticipationLinear,
  getPopElapsedMilliseconds,
  transformModelPoint,
} from '@flows/openingFlow/_facadesLogic/computeSceneEffects'
import type { IOpeningPose, IOpeningSceneState } from '@flows/openingFlow/_types'

// REFERENCE IMPLEMENTATION (see computeSceneFrame.ts). Where every effect object of the show around the box is this frame:
// the native scenes (Swift, Kotlin) compute exactly this and only draw it; the shared test vectors prove they agree.

// How far behind its box (in model units) the aura sits.
const AURA_DEPTH_BEHIND_BOX = 0.9
// The light shaft, the shock waves and the sparks are drawn this far in front of the open box, so nothing cuts them off.
const IN_FRONT_OF_BOX_MODEL_UNITS = 1.3

// One object of the show: a flat soft shape facing the camera, `scaleX` wide and `scaleY` high (world units); 0 = hidden.
export interface IEffectItem {
  x: number
  y: number
  z: number
  scaleX: number
  scaleY: number
  alpha: number
}

export interface IEffectsLayout {
  // One glow behind every card's box.
  auras: IEffectItem[]
  sparks: IEffectItem[]
  dust: IEffectItem[]
  shaft: IEffectItem
  rings: IEffectItem[]
}

export interface IEffectsLayoutInput {
  scene: IOpeningSceneState
  nowMilliseconds: number
  focusProgress: number
  tuckProgress: number
  seamIntensity: number
  // Pose of every card's box this frame (after the camera punch).
  poses: IOpeningPose[]
  // Horizontal shake of the focused box (camera punch).
  shakeX: number
}

const HIDDEN: IEffectItem = { x: 0, y: 0, z: 0, scaleX: 0, scaleY: 0, alpha: 0 }

export const computeEffectsLayout = ({
  scene,
  nowMilliseconds,
  focusProgress,
  tuckProgress,
  seamIntensity,
  poses,
  shakeX,
}: IEffectsLayoutInput): IEffectsLayout => {
  const popElapsed = getPopElapsedMilliseconds(scene, nowMilliseconds)
  const anticipation = getAnticipationLinear(scene, nowMilliseconds)
  const focusedPose = scene.focusedCardIndex >= 0 && scene.focusedCardIndex < poses.length ? poses[scene.focusedCardIndex] : null
  const unit = focusedPose ? focusedPose.scale : 0

  const auras = poses.map((pose, cardIndex): IEffectItem => {
    const isFocused = cardIndex === scene.focusedCardIndex
    const alpha = pose.isVisible ? computeAuraAlpha(isFocused, focusProgress, seamIntensity, popElapsed) * (isFocused ? 1 - tuckProgress : 1) : 0
    const diameter = pose.scale * BOX_WIDTH_UNITS * AURA_SCALE

    return {
      x: isFocused ? shakeX : 0,
      y: pose.translateY,
      z: pose.translateZ - AURA_DEPTH_BEHIND_BOX * pose.scale,
      scaleX: alpha > 0 ? diameter : 0,
      scaleY: diameter,
      alpha,
    }
  })

  if (!focusedPose) {
    return {
      auras,
      sparks: Array.from({ length: BURST_PARTICLE_POOL_SIZE }, () => HIDDEN),
      dust: Array.from({ length: DUST_POOL_SIZE }, () => HIDDEN),
      shaft: HIDDEN,
      rings: Array.from({ length: RING_POOL_SIZE }, () => HIDDEN),
    }
  }

  const [mouthX, mouthY, mouthZ] = transformModelPoint(
    0,
    SHAFT_ANCHOR_HEIGHT + BOX_CENTER_HEIGHT_UNITS,
    0,
    BOX_CENTER_HEIGHT_UNITS,
    focusedPose,
  )
  const sparks = Array.from({ length: BURST_PARTICLE_POOL_SIZE }, (_, index): IEffectItem => {
    const point = computeBurstParticle(index, popElapsed, scene.rarityLevel)

    return {
      x: mouthX + shakeX + point.x * unit,
      y: mouthY + point.y * unit,
      z: mouthZ + (point.z + IN_FRONT_OF_BOX_MODEL_UNITS) * unit,
      scaleX: point.scale * unit,
      scaleY: point.scale * unit,
      alpha: 1,
    }
  })
  const dustVisibility = focusProgress * (1 - tuckProgress) * (popElapsed >= 0 ? Math.max(0, 1 - popElapsed / 400) : 1)
  const dust = Array.from({ length: DUST_POOL_SIZE }, (_, index): IEffectItem => {
    const point = computeDustPoint(index, nowMilliseconds, anticipation, dustVisibility)

    return {
      x: shakeX + point.x * unit,
      y: focusedPose.translateY + point.y * unit,
      z: focusedPose.translateZ + point.z * unit,
      scaleX: point.scale * unit,
      scaleY: point.scale * unit,
      alpha: 1,
    }
  })
  const shaftEffect = computeShaftEffect(popElapsed, tuckProgress, nowMilliseconds, scene.rarityLevel)
  const shaftWidth = shaftEffect.scaleX * unit * BOX_WIDTH_UNITS
  const shaft: IEffectItem = {
    x: mouthX + shakeX,
    y: mouthY,
    z: mouthZ + IN_FRONT_OF_BOX_MODEL_UNITS * unit,
    scaleX: shaftEffect.alpha > 0 ? shaftWidth : 0,
    scaleY: shaftEffect.scaleY * unit * BOX_WIDTH_UNITS,
    alpha: shaftEffect.alpha,
  }
  const rings = Array.from({ length: RING_POOL_SIZE }, (_, index): IEffectItem => {
    const ring = computeRingEffect(index, popElapsed, scene.rarityLevel)
    const diameter = ring.scale * unit * BOX_WIDTH_UNITS

    return {
      x: mouthX + shakeX,
      y: mouthY,
      z: mouthZ + IN_FRONT_OF_BOX_MODEL_UNITS * unit,
      scaleX: ring.alpha > 0 ? diameter : 0,
      scaleY: diameter,
      alpha: ring.alpha,
    }
  })

  return { auras, sparks, dust, shaft, rings }
}
