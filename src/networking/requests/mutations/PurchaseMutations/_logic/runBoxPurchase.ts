import { EBeginPurchaseOutcome, type IPurchaseSlice } from '@models/mainStorage/PurchaseStore/_types'
import type { IMysteryBoxApi } from '@networking/api/MysteryBoxApi/MysteryBoxApi'
import { EPurchaseErrorCode, type IMysteryBox, type IPurchaseBoxResponse } from '@networking/api/MysteryBoxApi/_types'
import { PurchaseError } from '@networking/errorHandling/PurchaseError'

export enum EBoxPurchaseResultStatus {
  Success = 'success',
  // A purchase was already running: the repeated tap is dropped without any effect.
  Ignored = 'ignored',
  Failed = 'failed',
}

export type TBoxPurchaseResult =
  | { status: EBoxPurchaseResultStatus.Success; response: IPurchaseBoxResponse }
  | { status: EBoxPurchaseResultStatus.Ignored }
  | { status: EBoxPurchaseResultStatus.Failed; errorCode: EPurchaseErrorCode }

interface IRunBoxPurchaseParams {
  box: IMysteryBox
  api: Pick<IMysteryBoxApi, 'purchaseBox'>
  purchaseStore: { getState: () => IPurchaseSlice }
}

// One purchase from tap to result. Balance and collection change only inside `completePurchase`,
// after the API succeeded, and only once per idempotency key. Every other path leaves them alone.
export const runBoxPurchase = async ({ box, api, purchaseStore }: IRunBoxPurchaseParams): Promise<TBoxPurchaseResult> => {
  const beginResult = purchaseStore.getState().beginPurchase({
    boxIdentifier: box.identifier,
    priceInCents: box.priceInCents,
  })

  if (beginResult.outcome === EBeginPurchaseOutcome.AlreadyInProgress) {
    return { status: EBoxPurchaseResultStatus.Ignored }
  }

  if (beginResult.outcome === EBeginPurchaseOutcome.InsufficientBalance) {
    return { status: EBoxPurchaseResultStatus.Failed, errorCode: EPurchaseErrorCode.InsufficientBalance }
  }

  try {
    const response = await api.purchaseBox({
      boxIdentifier: beginResult.attempt.boxIdentifier,
      idempotencyKey: beginResult.attempt.idempotencyKey,
    })

    purchaseStore.getState().completePurchase(response)

    return { status: EBoxPurchaseResultStatus.Success, response }
  } catch (error) {
    // Anything that is not a known purchase error is reported as a server error.
    const errorCode = error instanceof PurchaseError ? error.code : EPurchaseErrorCode.ServerError

    purchaseStore.getState().failPurchase(errorCode)

    return { status: EBoxPurchaseResultStatus.Failed, errorCode }
  }
}
