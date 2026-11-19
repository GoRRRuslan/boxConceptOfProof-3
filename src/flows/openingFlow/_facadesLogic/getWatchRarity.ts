import { RARITY_THRESHOLDS_IN_CENTS } from '@flows/openingFlow/_config/rarityConfig'
import { EWatchRarity } from '@flows/openingFlow/_types'

// Rarity of a prize from its value: Common < $500 <= Rare < $1,000 <= Epic < $2,000 <= Legendary.
export const getWatchRarity = (valueInCents: number): EWatchRarity =>
  RARITY_THRESHOLDS_IN_CENTS.find(threshold => valueInCents >= threshold.minimumValueInCents)?.rarity ?? EWatchRarity.Common
