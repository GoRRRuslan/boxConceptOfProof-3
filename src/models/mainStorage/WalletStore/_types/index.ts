export interface IWalletState {
  balanceInCents: number
}

export interface IWalletActions {
  resetWallet: () => void
}

export type IWalletSlice = IWalletState & IWalletActions
