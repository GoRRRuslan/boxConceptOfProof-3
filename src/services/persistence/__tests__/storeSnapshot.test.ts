import { isStoreSnapshot, parseStoreSnapshot, serializeStoreSnapshot } from '@services/persistence/storeSnapshot'

const SNAPSHOT = { balanceInCents: 77_000, ownedWatches: [], appliedIdempotencyKeys: ['purchase-1'], attemptCounter: 1 }

describe('storeSnapshot', () => {
  it('writes what it reads back', () => {
    expect(parseStoreSnapshot(serializeStoreSnapshot(SNAPSHOT))).toEqual(SNAPSHOT)
  })

  it('throws away a damaged or foreign file instead of crashing', () => {
    expect(parseStoreSnapshot('not json')).toBeNull()

    expect(parseStoreSnapshot('{"version":99,"snapshot":{}}')).toBeNull()

    expect(parseStoreSnapshot(JSON.stringify({ version: 1, snapshot: { balanceInCents: -5 } }))).toBeNull()
  })

  it('accepts only a complete snapshot', () => {
    expect(isStoreSnapshot(SNAPSHOT)).toBe(true)

    expect(isStoreSnapshot({ ...SNAPSHOT, appliedIdempotencyKeys: [1] })).toBe(false)

    expect(isStoreSnapshot(null)).toBe(false)
  })
})
