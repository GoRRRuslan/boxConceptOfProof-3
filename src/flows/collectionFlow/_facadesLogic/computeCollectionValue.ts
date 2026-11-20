import type { IOwnedWatch } from '@models/mainStorage/CollectionStore/_types'

// Total value (in cents) of the watches the user owns.
export const computeCollectionValue = (ownedWatches: IOwnedWatch[]): number =>
  ownedWatches.reduce((total, ownedWatch) => total + ownedWatch.watch.valueInCents, 0)
