import type { IWalletState } from '@models/mainStorage/WalletStore/_types'

// Starting virtual balance of a session: $1,000.00.
export const INITIAL_BALANCE_IN_CENTS = 100_000

export const initialWalletState: IWalletState = {
  balanceInCents: INITIAL_BALANCE_IN_CENTS,
}
