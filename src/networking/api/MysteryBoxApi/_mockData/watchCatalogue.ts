import { EWatchIdentifier, type IWatch } from '@networking/api/MysteryBoxApi/_types'

export const WATCH_CATALOGUE: IWatch[] = [
  { identifier: EWatchIdentifier.Casio, name: 'Casio Vintage', brand: 'Casio', valueInCents: 8_000 },
  { identifier: EWatchIdentifier.Gmt, name: 'GMT Master', brand: 'Rolex', valueInCents: 120_000 },
  { identifier: EWatchIdentifier.Perpetual, name: 'Oyster Perpetual', brand: 'Rolex', valueInCents: 90_000 },
  { identifier: EWatchIdentifier.SkyDweller, name: 'Sky-Dweller', brand: 'Rolex', valueInCents: 250_000 },
]
