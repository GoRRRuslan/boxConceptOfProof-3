import type { StateCreator } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { IWalletSlice } from '@models/mainStorage/WalletStore/_types'
import { initialWalletState } from '@models/mainStorage/WalletStore/initialState'
import { sliceResetFns } from '@models/mainStorage/_storeConfigured/ResetterStore'

// The balance is only ever changed by the purchase flow (PurchaseStore), together with the collection.
const walletSlice: StateCreator<IWalletSlice, [], [['zustand/immer', never]]> = immer(set => {
  sliceResetFns.add(() => {
    set(initialWalletState)
  })

  return {
    ...initialWalletState,
    resetWallet: () => {
      set(initialWalletState)
    },
  }
})

export default walletSlice
