import type { StateCreator } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { ICollectionSlice } from '@models/mainStorage/CollectionStore/_types'
import { initialCollectionState } from '@models/mainStorage/CollectionStore/initialState'
import { sliceResetFns } from '@models/mainStorage/_storeConfigured/ResetterStore'

// Watches are only ever added by the purchase flow (PurchaseStore), together with the balance change.
const collectionSlice: StateCreator<ICollectionSlice, [], [['zustand/immer', never]]> = immer(set => {
  sliceResetFns.add(() => {
    set(initialCollectionState)
  })

  return {
    ...initialCollectionState,
    resetCollection: () => {
      set(initialCollectionState)
    },
  }
})

export default collectionSlice
