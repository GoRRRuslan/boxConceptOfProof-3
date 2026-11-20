import type { StateCreator } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  EBeginPurchaseOutcome,
  EPurchaseStatus,
  type IPurchaseAttempt,
  type IPurchaseSlice,
  type TPurchaseSliceDependencies,
} from '@models/mainStorage/PurchaseStore/_types'
import { initialPurchaseState } from '@models/mainStorage/PurchaseStore/initialState'
import { sliceResetFns } from '@models/mainStorage/_storeConfigured/ResetterStore'
import { EPurchaseErrorCode } from '@networking/api/MysteryBoxApi/_types'

const purchaseSlice: StateCreator<
  TPurchaseSliceDependencies,
  [],
  [['zustand/immer', never]],
  IPurchaseSlice
> = immer((set, get) => {
  sliceResetFns.add(() => {
    set(initialPurchaseState)
  })

  return {
    ...initialPurchaseState,

    // Synchronous gate in front of the API: a second tap while one purchase runs, or without enough
    // money, never reaches the network.
    beginPurchase: ({ boxIdentifier, priceInCents }) => {
      const state = get()

      if (state.purchaseStatus === EPurchaseStatus.InProgress) {
        return { outcome: EBeginPurchaseOutcome.AlreadyInProgress }
      }

      if (state.balanceInCents < priceInCents) {
        return { outcome: EBeginPurchaseOutcome.InsufficientBalance }
      }

      // Re-use the key of an earlier attempt for the same box whose result is unknown, so the server
      // answers with the stored result instead of rolling a second watch.
      const attemptNumber = state.attemptCounter + 1
      const attempt: IPurchaseAttempt =
        state.retryableAttempt?.boxIdentifier === boxIdentifier
          ? state.retryableAttempt
          : { boxIdentifier, priceInCents, idempotencyKey: `purchase-${attemptNumber}` }

      set({
        purchaseStatus: EPurchaseStatus.InProgress,
        activeAttempt: attempt,
        attemptCounter: attemptNumber,
      })

      return { outcome: EBeginPurchaseOutcome.Started, attempt }
    },

    // The ONLY place that changes balance and collection: both in the same update, once per key.
    completePurchase: response => {
      const { activeAttempt, appliedIdempotencyKeys } = get()

      if (activeAttempt?.idempotencyKey !== response.idempotencyKey || appliedIdempotencyKeys.includes(response.idempotencyKey)) {
        return
      }

      set(state => {
        state.balanceInCents -= activeAttempt.priceInCents

        state.ownedWatches.push({
          ownershipIdentifier: response.idempotencyKey,
          boxIdentifier: response.boxIdentifier,
          watch: response.watch,
        })

        state.appliedIdempotencyKeys.push(response.idempotencyKey)

        state.purchaseStatus = EPurchaseStatus.Idle

        state.activeAttempt = null

        state.retryableAttempt = null
      })
    },

    // A failure changes nothing but the status. After a network error the outcome is unknown, so the
    // attempt is kept for a retry with the same key.
    failPurchase: errorCode => {
      set(state => {
        state.retryableAttempt = errorCode === EPurchaseErrorCode.NetworkError ? state.activeAttempt : null

        state.purchaseStatus = EPurchaseStatus.Idle

        state.activeAttempt = null
      })
    },

    resetPurchase: () => {
      set(initialPurchaseState)
    },
  }
})

export default purchaseSlice
