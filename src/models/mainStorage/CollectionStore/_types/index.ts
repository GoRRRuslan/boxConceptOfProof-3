import type { EBoxIdentifier, IWatch } from '@networking/api/MysteryBoxApi/_types'

export interface IOwnedWatch {
  // The idempotency key of the purchase that produced it: unique per purchase.
  ownershipIdentifier: string
  boxIdentifier: EBoxIdentifier
  watch: IWatch
}

export interface ICollectionState {
  ownedWatches: IOwnedWatch[]
}

export interface ICollectionActions {
  resetCollection: () => void
}

export type ICollectionSlice = ICollectionState & ICollectionActions
