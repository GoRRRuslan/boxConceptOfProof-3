import { getWatchRarity } from '@flows/openingFlow/_facadesLogic/getWatchRarity'
import { EWatchRarity } from '@flows/openingFlow/_types'
import { WATCH_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/watchCatalogue'
import { EWatchIdentifier } from '@networking/api/MysteryBoxApi/_types'

describe('getWatchRarity', () => {
  it.each([
    [0, EWatchRarity.Common],
    [49_999, EWatchRarity.Common],
    [50_000, EWatchRarity.Rare],
    [99_999, EWatchRarity.Rare],
    [100_000, EWatchRarity.Epic],
    [199_999, EWatchRarity.Epic],
    [200_000, EWatchRarity.Legendary],
    [5_000_000, EWatchRarity.Legendary],
  ])('%i cents is %s', (valueInCents, expected) => {
    expect(getWatchRarity(valueInCents)).toBe(expected)
  })

  it('gives every watch of the catalogue a different rarity', () => {
    const rarityOf = (identifier: EWatchIdentifier) => {
      const watch = WATCH_CATALOGUE.find(candidate => candidate.identifier === identifier)

      return watch ? getWatchRarity(watch.valueInCents) : undefined
    }

    expect(rarityOf(EWatchIdentifier.Casio)).toBe(EWatchRarity.Common)

    expect(rarityOf(EWatchIdentifier.Perpetual)).toBe(EWatchRarity.Rare)

    expect(rarityOf(EWatchIdentifier.Gmt)).toBe(EWatchRarity.Epic)

    expect(rarityOf(EWatchIdentifier.SkyDweller)).toBe(EWatchRarity.Legendary)
  })
})
