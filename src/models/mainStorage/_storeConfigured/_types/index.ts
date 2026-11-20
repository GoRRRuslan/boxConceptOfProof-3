import type { ICollectionSlice } from '@models/mainStorage/CollectionStore/_types'
import type { IPurchaseSlice } from '@models/mainStorage/PurchaseStore/_types'
import type { IWalletSlice } from '@models/mainStorage/WalletStore/_types'

export type Store = IWalletSlice & ICollectionSlice & IPurchaseSlice
