// The show around the box: seams, light shaft, shock waves, particles, dust. Every number here is shared (as a copy) by the
// three repositories so the effect looks the same everywhere.

// Pools of scene objects that are re-used (nothing is created while the app runs).
export const BURST_PARTICLE_POOL_SIZE = 32
export const RING_POOL_SIZE = 3
export const DUST_POOL_SIZE = 10

// Anticipation ends with a short held breath; then the lid is let go.
export const HIT_STOP_MILLISECONDS = 140
// Camera punch after the lid is let go.
export const PUNCH_SCALE = 0.07
export const PUNCH_SCALE_DECAY_MILLISECONDS = 110
export const PUNCH_SHAKE_UNITS = 0.02
export const PUNCH_SHAKE_DECAY_MILLISECONDS = 140
export const PUNCH_SHAKE_FREQUENCY = 0.09
// The lid does not stop dead: it swings a little past and settles.
export const LID_SETTLE_DEGREES = 4
export const LID_SETTLE_DECAY_MILLISECONDS = 180
export const LID_SETTLE_PERIOD_MILLISECONDS = 280

// Seams: the coloured trim of the box lights up.
export const SEAM_IDLE_BASE = 0.2
export const SEAM_IDLE_AMPLITUDE = 0.12
export const SEAM_IDLE_PERIOD_MILLISECONDS = 1400
export const SEAM_ANTICIPATION_START = 0.25
export const SEAM_ANTICIPATION_RANGE = 1.75
export const SEAM_ANTICIPATION_EXPONENT = 1.6
export const SEAM_FLASH_PEAK = 2.4
export const SEAM_FLASH_DECAY_MILLISECONDS = 260
export const SEAM_OPEN_LEVEL = 0.5

// Light shaft out of the open box.
export const SHAFT_RAMP_MILLISECONDS = 450
export const SHAFT_PULSE_PERIOD_MILLISECONDS = 3100
export const SHAFT_BASE_WIDTH = 0.85
export const SHAFT_WIDTH_GROWTH = 0.15
export const SHAFT_START_HEIGHT_FRACTION = 0.35
export const SHAFT_ANCHOR_HEIGHT = 0.3

// Shock waves.
export const RING_DELAY_MILLISECONDS = 140
export const RING_DURATION_MILLISECONDS = 900
export const RING_MAXIMUM_SCALE = 3.4
export const RING_START_SCALE = 0.2
export const RING_PEAK_ALPHA = 0.9

// Burst of particles.
export const BURST_LIFETIME_MILLISECONDS = 1500
export const BURST_GRAVITY = 2.6
export const BURST_SIZE = 0.11

// Faint light motes behind the box that are drawn in during the anticipation.
export const DUST_SIZE = 0.16
export const DUST_PULL_IN_FRACTION = 0.85

// Aura (a soft coloured glow behind every box).
export const AURA_LIST_ALPHA = 0.1
export const AURA_FOCUSED_ALPHA = 0.14
export const AURA_SCALE = 2.4

// Sway of the boxes when the list is scrolled fast.
export const SWAY_RADIANS_PER_PIXEL_PER_SECOND = 0.00035
export const SWAY_MAXIMUM_RADIANS = 0.25
export const SWAY_RESPONSE_PER_SECOND = 10

export interface IRarityEffectProfile {
  burstCount: number
  ringCount: number
  // 0..1 strength and height (in box heights) of the light shaft.
  shaftStrength: number
  shaftHeight: number
  // Multiplier of the light of the seams and of the inside of the box (the bloom turns > 1 into a glow).
  emissiveBoost: number
  // 0..1 strength of the camera punch.
  punchStrength: number
}

// Index = rarity level (0 common ... 3 legendary). The better the prize the bigger the show.
export const RARITY_EFFECT_PROFILES: IRarityEffectProfile[] = [
  { burstCount: 6, ringCount: 1, shaftStrength: 0.45, shaftHeight: 3.2, emissiveBoost: 1, punchStrength: 0.5 },
  { burstCount: 12, ringCount: 1, shaftStrength: 0.65, shaftHeight: 3.2, emissiveBoost: 1.2, punchStrength: 0.7 },
  { burstCount: 20, ringCount: 2, shaftStrength: 0.85, shaftHeight: 3.4, emissiveBoost: 1.5, punchStrength: 0.85 },
  { burstCount: 32, ringCount: 3, shaftStrength: 1, shaftHeight: 3.6, emissiveBoost: 2, punchStrength: 1 },
]
