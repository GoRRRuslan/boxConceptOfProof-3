import {
  ANTICIPATION_DURATION_MILLISECONDS,
  LID_OPEN_DURATION_MILLISECONDS,
} from '@flows/openingFlow/_config/openingConfig'
import { BURST_LIFETIME_MILLISECONDS, HIT_STOP_MILLISECONDS, RING_DURATION_MILLISECONDS } from '@flows/openingFlow/_config/effectsConfig'
import {
  computeBurstParticle,
  computeCameraPunch,
  computeDustPoint,
  computeIridescenceTint,
  getIridescenceStrength,
  computeJitterScale,
  computeLidSettleDegrees,
  computeRingEffect,
  computeSeamIntensity,
  computeShaftEffect,
  getPopElapsedMilliseconds,
  stepScrollSway,
  transformModelPoint,
} from '@flows/openingFlow/_facadesLogic/computeSceneEffects'
import { INITIAL_OPENING_SCENE_STATE, setGlowColor, startFocus, startLidOpen } from '@flows/openingFlow/_facadesLogic/openingSceneState'

const armedScene = setGlowColor(startFocus(INITIAL_OPENING_SCENE_STATE, 0, 1000), [1, 0.5, 0], 3)

describe('computeSceneEffects', () => {
  describe('timeline', () => {
    it('knows how long ago the lid was let go, and that it is never while the box is closed', () => {
      expect(getPopElapsedMilliseconds(armedScene, 5000)).toBe(Number.NEGATIVE_INFINITY)

      const opening = startLidOpen(armedScene, 2000)

      expect(getPopElapsedMilliseconds(opening, 2000)).toBe(-ANTICIPATION_DURATION_MILLISECONDS)

      expect(getPopElapsedMilliseconds(opening, 2000 + ANTICIPATION_DURATION_MILLISECONDS + 300)).toBe(300)
    })

    it('holds the breath: the shake dies away in the last moment before the lid is let go', () => {
      expect(computeJitterScale(Number.NEGATIVE_INFINITY)).toBe(1)

      expect(computeJitterScale(-HIT_STOP_MILLISECONDS - 50)).toBe(1)

      expect(computeJitterScale(-HIT_STOP_MILLISECONDS / 2)).toBeCloseTo(0.5, 5)

      expect(computeJitterScale(-1)).toBeLessThan(0.01)

      expect(computeJitterScale(10)).toBe(1)
    })
  })

  describe('camera punch and lid', () => {
    it('punches only after the lid is let go, harder for better prizes, and settles', () => {
      expect(computeCameraPunch(-100, 3)).toEqual({ scaleBoost: 0, shakeX: 0, shakeY: 0 })

      expect(computeCameraPunch(Number.NEGATIVE_INFINITY, 3).scaleBoost).toBe(0)

      expect(computeCameraPunch(0, 3).scaleBoost).toBeGreaterThan(computeCameraPunch(0, 0).scaleBoost)

      expect(computeCameraPunch(1500, 3).scaleBoost).toBeLessThan(0.0001)
    })

    it('lets the lid swing past the open position and settle', () => {
      expect(computeLidSettleDegrees(LID_OPEN_DURATION_MILLISECONDS - 10)).toBe(0)

      expect(computeLidSettleDegrees(Number.NEGATIVE_INFINITY)).toBe(0)

      expect(Math.abs(computeLidSettleDegrees(LID_OPEN_DURATION_MILLISECONDS + 70))).toBeGreaterThan(1)

      expect(Math.abs(computeLidSettleDegrees(LID_OPEN_DURATION_MILLISECONDS + 3000))).toBeLessThan(0.01)
    })
  })

  describe('seams', () => {
    const focused = 1

    it('stay dark until a prize is bought, then breathe softly', () => {
      expect(computeSeamIntensity(startFocus(INITIAL_OPENING_SCENE_STATE, 0, 0), 5000, focused, 0)).toBe(0)

      expect(computeSeamIntensity(armedScene, 5000, 0.5, 0)).toBe(0)

      const idle = computeSeamIntensity(armedScene, 5000, focused, 0)

      expect(idle).toBeGreaterThan(0.05)

      expect(idle).toBeLessThan(0.5)
    })

    it('build up while the box shakes, flash when the lid is let go and fade when the box is put away', () => {
      const opening = startLidOpen(armedScene, 2000)
      const early = computeSeamIntensity(opening, 2100, focused, 0)
      const late = computeSeamIntensity(opening, 2000 + ANTICIPATION_DURATION_MILLISECONDS - 10, focused, 0)
      const flash = computeSeamIntensity(opening, 2000 + ANTICIPATION_DURATION_MILLISECONDS + 5, focused, 0)
      const open = computeSeamIntensity(opening, 2000 + ANTICIPATION_DURATION_MILLISECONDS + 3000, focused, 0)

      expect(late).toBeGreaterThan(early)

      expect(flash).toBeGreaterThan(late)

      expect(open).toBeCloseTo(0.5, 1)

      expect(computeSeamIntensity(opening, 2000 + ANTICIPATION_DURATION_MILLISECONDS + 3000, focused, 1)).toBe(0)
    })
  })

  describe('the show', () => {
    it('rises as a light shaft out of the open box, taller for better prizes, and goes away with the box', () => {
      expect(computeShaftEffect(-1, 0, 0, 3).alpha).toBe(0)

      const legendary = computeShaftEffect(2000, 0, 0, 3)
      const common = computeShaftEffect(2000, 0, 0, 0)

      expect(legendary.alpha).toBeGreaterThan(common.alpha)

      expect(legendary.scaleY).toBeGreaterThan(common.scaleY)

      expect(computeShaftEffect(2000, 1, 0, 3).alpha).toBe(0)
    })

    it('sends out as many shock waves as the rarity allows, one after the other', () => {
      expect(computeRingEffect(0, -1, 3).alpha).toBe(0)

      expect(computeRingEffect(0, 100, 3).alpha).toBeGreaterThan(0)

      expect(computeRingEffect(2, 100, 3).alpha).toBe(0)

      expect(computeRingEffect(2, 400, 3).alpha).toBeGreaterThan(0)

      expect(computeRingEffect(1, 400, 0).alpha).toBe(0)

      expect(computeRingEffect(0, RING_DURATION_MILLISECONDS + 1, 3).alpha).toBe(0)
    })

    it('bursts into sparks that fly up, fall under gravity and fade; common prizes get fewer', () => {
      expect(computeBurstParticle(0, -5, 3).scale).toBe(0)

      expect(computeBurstParticle(31, 300, 3).scale).toBeGreaterThan(0)

      expect(computeBurstParticle(31, 300, 0).scale).toBe(0)

      const early = computeBurstParticle(3, 200, 3)
      const late = computeBurstParticle(3, 1200, 3)

      expect(early.y).toBeGreaterThan(0)

      expect(late.scale).toBeLessThan(early.scale)

      expect(computeBurstParticle(3, BURST_LIFETIME_MILLISECONDS + 1, 3).scale).toBe(0)
    })

    it('keeps the dust behind the box, draws it in while the box shakes and hides it when invisible', () => {
      const calm = computeDustPoint(0, 1000, 0, 1)
      const charged = computeDustPoint(0, 1000, 1, 1)

      expect(Math.abs(charged.x)).toBeLessThan(Math.abs(calm.x))

      for (let index = 0; index < 10; index += 1) {
        expect(computeDustPoint(index, 1000, 0.5, 1).z).toBeLessThan(-0.7)
      }

      expect(computeDustPoint(2, 1000, 0, 0).scale).toBe(0)
    })
  })

  describe('iridescence', () => {
    it('shimmers only glossy metallic boxes, more the glossier', () => {
      expect(getIridescenceStrength(0)).toBe(0)

      expect(getIridescenceStrength(0.1)).toBe(0)

      expect(getIridescenceStrength(0.3)).toBeGreaterThan(0)

      expect(getIridescenceStrength(0.65)).toBe(1)

      expect(computeIridescenceTint(0, 1, 1, 1000)).toEqual([0, 0, 0])
    })

    it('moves through the colours as the box turns and the time passes, within the amplitude', () => {
      const first = computeIridescenceTint(1, 0, 0, 1000)
      const turned = computeIridescenceTint(1, 1.5, 0, 1000)
      const later = computeIridescenceTint(1, 0, 0, 3000)

      expect(turned).not.toEqual(first)

      expect(later).not.toEqual(first)

      first.concat(turned, later).forEach(channel => {
        expect(Math.abs(channel)).toBeLessThanOrEqual(0.16 + 1e-9)
      })
    })
  })

  describe('placing things in the world', () => {
    const pose = { scale: 2, pitchRadians: 0, yawRadians: 0, translateY: 1, translateZ: 3 }

    it('moves a model point like the box itself: centre, scale, turn, move', () => {
      expect(transformModelPoint(0, 0.56, 0, 0.56, pose)).toEqual([0, 1, 3])

      expect(transformModelPoint(0.5, 1.56, 0, 0.56, pose)).toEqual([1, 3, 3])
    })

    it('turns about X (pitch) before turning about Y (yaw)', () => {
      const [x, y, z] = transformModelPoint(0, 1.56, 0, 0.56, { ...pose, scale: 1, translateY: 0, translateZ: 0, pitchRadians: Math.PI / 2 })

      expect(x).toBeCloseTo(0, 6)

      expect(y).toBeCloseTo(0, 6)

      expect(z).toBeCloseTo(1, 6)

      const [yawedX, , yawedZ] = transformModelPoint(1, 0.56, 0, 0.56, { ...pose, scale: 1, translateY: 0, translateZ: 0, yawRadians: Math.PI / 2 })

      expect(yawedX).toBeCloseTo(0, 6)

      expect(yawedZ).toBeCloseTo(-1, 6)
    })
  })

  describe('scroll sway', () => {
    it('leans against a fast scroll and settles back when it stops', () => {
      let sway = 0

      for (let frame = 0; frame < 20; frame += 1) {
        sway = stepScrollSway(sway, 2000, 1 / 60)
      }

      expect(sway).toBeLessThan(-0.1)

      expect(sway).toBeGreaterThanOrEqual(-0.25)

      for (let frame = 0; frame < 120; frame += 1) {
        sway = stepScrollSway(sway, 0, 1 / 60)
      }

      expect(Math.abs(sway)).toBeLessThan(0.01)
    })
  })
})
