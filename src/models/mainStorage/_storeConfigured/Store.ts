import { create } from 'zustand'

import collectionSlice from '@models/mainStorage/CollectionStore'
import purchaseSlice from '@models/mainStorage/PurchaseStore'
import walletSlice from '@models/mainStorage/WalletStore'
import type { Store } from '@models/mainStorage/_storeConfigured/_types'

// Session-scoped on purpose: nothing is persisted, a fresh launch starts with the initial balance.
const useStore = create<Store>()((...params) => ({
  ...walletSlice(...params),
  ...collectionSlice(...params),
  ...purchaseSlice(...params),
}))

export default useStore
