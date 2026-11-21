import { create } from 'zustand'

import collectionSlice from '@models/mainStorage/CollectionStore'
import purchaseSlice from '@models/mainStorage/PurchaseStore'
import walletSlice from '@models/mainStorage/WalletStore'
import type { Store } from '@models/mainStorage/_storeConfigured/_types'
import { type IStoreSnapshot, loadStoreSnapshot, saveStoreSnapshot } from '@services/persistence/storeSnapshot'

const SAVE_DELAY_MILLISECONDS = 250

const useStore = create<Store>()((...params) => ({
  ...walletSlice(...params),
  ...collectionSlice(...params),
  ...purchaseSlice(...params),
}))

const pickSnapshot = (state: Store): IStoreSnapshot => ({
  balanceInCents: state.balanceInCents,
  ownedWatches: state.ownedWatches,
  appliedIdempotencyKeys: state.appliedIdempotencyKeys,
  attemptCounter: state.attemptCounter,
})

// The money and the bought watches survive the app being removed from memory in the background (see storeSnapshot.ts). Restored before
// anything is drawn; every later change is written a moment after it happens (a burst of changes is one write).
const restoredSnapshot = loadStoreSnapshot()

if (restoredSnapshot) {
  useStore.setState(restoredSnapshot)
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
let lastSavedSnapshotText = ''

useStore.subscribe(state => {
  clearTimeout(saveTimer)

  saveTimer = setTimeout(() => {
    const snapshot = pickSnapshot(state)
    const snapshotText = JSON.stringify(snapshot)

    if (snapshotText !== lastSavedSnapshotText) {
      lastSavedSnapshotText = snapshotText

      saveStoreSnapshot(snapshot)
    }
  }, SAVE_DELAY_MILLISECONDS)
})

export default useStore
