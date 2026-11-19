import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'
import { rollWatchForPurchase } from '@networking/api/MysteryBoxApi/_mockLogic/rollWatchForPurchase'

describe('rollWatchForPurchase', () => {
  const [{ dropTable }] = BOX_CATALOGUE

  it('is deterministic: the same seed always gives the same watch', () => {
    const first = rollWatchForPurchase(dropTable, 'purchase-7')

    for (let repeat = 0; repeat < 20; repeat += 1) {
      expect(rollWatchForPurchase(dropTable, 'purchase-7')).toBe(first)
    }
  })

  it('only returns watches that are in the drop table', () => {
    const allowed = dropTable.map(entry => entry.watchIdentifier)

    for (let seed = 0; seed < 200; seed += 1) {
      expect(allowed).toContain(rollWatchForPurchase(dropTable, `purchase-${seed}`).watchIdentifier)
    }
  })

  it('follows the weights over many seeds', () => {
    const counts = new Map<string, number>()
    const totalRolls = 4000

    for (let seed = 0; seed < totalRolls; seed += 1) {
      const { watchIdentifier } = rollWatchForPurchase(dropTable, `purchase-${seed}`)

      counts.set(watchIdentifier, (counts.get(watchIdentifier) ?? 0) + 1)
    }

    const totalWeight = dropTable.reduce((sum, entry) => sum + entry.weight, 0)

    for (const entry of dropTable) {
      const expectedShare = entry.weight / totalWeight
      const actualShare = (counts.get(entry.watchIdentifier) ?? 0) / totalRolls

      expect(Math.abs(actualShare - expectedShare)).toBeLessThan(0.05)
    }
  })

  it('gives different watches to the first few purchases (keys that differ only in the last digit)', () => {
    const watches = Array.from({ length: 12 }, (_, index) => rollWatchForPurchase(dropTable, `purchase-${index + 1}`).watchIdentifier)

    expect(new Set(watches).size).toBeGreaterThan(1)
  })

  it('does not always give the best (or the worst) watch to the first purchases of a box with real odds', () => {
    const [, classicBox] = BOX_CATALOGUE
    const watches = Array.from({ length: 30 }, (_, index) => rollWatchForPurchase(classicBox.dropTable, `purchase-${index + 1}`).watchIdentifier)

    expect(new Set(watches).size).toBeGreaterThanOrEqual(2)
  })
})
