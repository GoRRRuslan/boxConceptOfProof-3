import type { IBoxDropEntry } from '@networking/api/MysteryBoxApi/_types'

// Small deterministic string hash (FNV-1a plus a final bit mixer) so the same idempotency key always rolls the
// same number, and keys that only differ in their last digit (purchase-1, purchase-2...) still roll very different ones.
const hashToUnitInterval = (value: string): number => {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)

    hash = Math.imul(hash, 16777619)
  }

  hash ^= hash >>> 16

  hash = Math.imul(hash, 0x85ebca6b)

  hash ^= hash >>> 13

  hash = Math.imul(hash, 0xc2b2ae35)

  hash ^= hash >>> 16

  return (hash >>> 0) / 4294967296
}

// Picks a drop-table entry by weight. Deterministic for a given seed, so a retried purchase
// (same idempotency key) can never turn into a different watch.
export const rollWatchForPurchase = (dropTable: IBoxDropEntry[], seed: string): IBoxDropEntry => {
  const totalWeight = dropTable.reduce((sum, entry) => sum + entry.weight, 0)
  const target = hashToUnitInterval(seed) * totalWeight
  let accumulatedWeight = 0

  for (const entry of dropTable) {
    accumulatedWeight += entry.weight

    if (target < accumulatedWeight) {
      return entry
    }
  }

  return dropTable[dropTable.length - 1]
}
