import type { ICollectionSlice } from '@models/mainStorage/CollectionStore/_types'
import type { IWalletSlice } from '@models/mainStorage/WalletStore/_types'
import type { EBoxIdentifier, EPurchaseErrorCode, IPurchaseBoxResponse } from '@networking/api/MysteryBoxApi/_types'

export enum EPurchaseStatus {
  Idle = 'idle',
  InProgress = 'inProgress',
}

export enum EBeginPurchaseOutcome {
  Started = 'started',
  AlreadyInProgress = 'alreadyInProgress',
  InsufficientBalance = 'insufficientBalance',
}

export interface IPurchaseAttempt {
  boxIdentifier: EBoxIdentifier
  priceInCents: number
  idempotencyKey: string
}

export interface IBeginPurchaseParams {
  boxIdentifier: EBoxIdentifier
  priceInCents: number
}

export type TBeginPurchaseResult =
  | { outcome: EBeginPurchaseOutcome.Started; attempt: IPurchaseAttempt }
  | { outcome: EBeginPurchaseOutcome.AlreadyInProgress }
  | { outcome: EBeginPurchaseOutcome.InsufficientBalance }

export interface IPurchaseState {
  purchaseStatus: EPurchaseStatus
  // The purchase currently being processed; the lock that makes repeated taps harmless.
  activeAttempt: IPurchaseAttempt | null
  // A failed attempt whose outcome the client cannot know (lost response): retried with the same key.
  retryableAttempt: IPurchaseAttempt | null
  attemptCounter: number
  // Keys already applied to balance and collection: a purchase can never be applied twice.
  appliedIdempotencyKeys: string[]
}

export interface IPurchaseActions {
  beginPurchase: (params: IBeginPurchaseParams) => TBeginPurchaseResult
  completePurchase: (response: IPurchaseBoxResponse) => void
  failPurchase: (errorCode: EPurchaseErrorCode) => void
  resetPurchase: () => void
}

export type IPurchaseSlice = IPurchaseState & IPurchaseActions

// The purchase slice reads and writes the wallet and the collection in ONE state update.
export type TPurchaseSliceDependencies = IPurchaseSlice & IWalletSlice & ICollectionSlice
