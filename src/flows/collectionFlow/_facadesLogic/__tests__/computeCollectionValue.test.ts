import { computeCollectionValue } from '@flows/collectionFlow/_facadesLogic/computeCollectionValue'
import { EBoxIdentifier, EWatchIdentifier } from '@networking/api/MysteryBoxApi/_types'

const owned = (identifier: string, valueInCents: number) => ({
  ownershipIdentifier: identifier,
  boxIdentifier: EBoxIdentifier.Starter,
  watch: { identifier: EWatchIdentifier.Casio, name: 'Casio', brand: 'Casio', valueInCents },
})

describe('computeCollectionValue', () => {
  it('is zero for an empty collection', () => {
    expect(computeCollectionValue([])).toBe(0)
  })

  it('adds up the value of every watch, duplicates included', () => {
    expect(computeCollectionValue([owned('a', 8_000), owned('b', 8_000), owned('c', 120_000)])).toBe(136_000)
  })
})
