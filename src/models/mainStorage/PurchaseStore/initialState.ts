import { EPurchaseStatus, type IPurchaseState } from '@models/mainStorage/PurchaseStore/_types'

export const initialPurchaseState: IPurchaseState = {
  purchaseStatus: EPurchaseStatus.Idle,
  activeAttempt: null,
  retryableAttempt: null,
  attemptCounter: 0,
  appliedIdempotencyKeys: [],
}
