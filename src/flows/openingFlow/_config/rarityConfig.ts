import { EWatchRarity } from '@flows/openingFlow/_types'

export interface IRarityStyle {
  // Colour of the glow, the particles and the label (sRGB hex).
  colorHex: string
  // Light inside the opened box, linear RGB (what Filament's emissiveFactor wants).
  glowColorLinear: [number, number, number]
  // How much of the screen flashes when the watch appears (0 = no flash).
  flashOpacity: number
  particleCount: number
  // Extra haptic impacts after the usual success tap.
  hapticImpactCount: number
}

// What a prize looks and feels like, by rarity. The better the watch the bigger the show.
export const RARITY_STYLES: Record<EWatchRarity, IRarityStyle> = {
  [EWatchRarity.Common]: {
    colorHex: '#9FB7C4',
    glowColorLinear: [0.35, 0.5, 0.58],
    flashOpacity: 0,
    particleCount: 0,
    hapticImpactCount: 0,
  },
  [EWatchRarity.Rare]: {
    colorHex: '#5B8DEF',
    glowColorLinear: [0.1, 0.27, 0.85],
    flashOpacity: 0,
    particleCount: 10,
    hapticImpactCount: 1,
  },
  [EWatchRarity.Epic]: {
    colorHex: '#B05AE0',
    glowColorLinear: [0.45, 0.1, 0.8],
    flashOpacity: 0.55,
    particleCount: 18,
    hapticImpactCount: 2,
  },
  [EWatchRarity.Legendary]: {
    colorHex: '#FFC24A',
    glowColorLinear: [1, 0.55, 0.08],
    flashOpacity: 0.9,
    particleCount: 28,
    hapticImpactCount: 3,
  },
}

// 0 (common) ... 3 (legendary): how big the show in the 3D scene is.
export const RARITY_LEVELS: Record<EWatchRarity, number> = {
  [EWatchRarity.Common]: 0,
  [EWatchRarity.Rare]: 1,
  [EWatchRarity.Epic]: 2,
  [EWatchRarity.Legendary]: 3,
}

// A watch is rarer the more it is worth (in cents).
export const RARITY_THRESHOLDS_IN_CENTS: { rarity: EWatchRarity; minimumValueInCents: number }[] = [
  { rarity: EWatchRarity.Legendary, minimumValueInCents: 200_000 },
  { rarity: EWatchRarity.Epic, minimumValueInCents: 100_000 },
  { rarity: EWatchRarity.Rare, minimumValueInCents: 50_000 },
]
