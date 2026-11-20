import type { IMysteryBoxApi } from '@networking/api/MysteryBoxApi/MysteryBoxApi'
import { mockApiSettings } from '@networking/api/MysteryBoxApi/_config/mockApiSettings'
import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'
import { WATCH_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/watchCatalogue'
import { rollWatchForPurchase } from '@networking/api/MysteryBoxApi/_mockLogic/rollWatchForPurchase'
import {
  EMockFailureMode,
  EPurchaseErrorCode,
  type IGetBoxesResponse,
  type IPurchaseBoxRequestData,
  type IPurchaseBoxResponse,
} from '@networking/api/MysteryBoxApi/_types'
import { PurchaseError } from '@networking/errorHandling/PurchaseError'
import { delay } from '@utils/delay'

// Simulated backend. It is asynchronous, can be made slow or failing, and is idempotent per key.
class MysteryBoxApiImplementation implements IMysteryBoxApi {
  // Results the "server" already produced, by idempotency key.
  private processedPurchases = new Map<string, IPurchaseBoxResponse>()

  getBoxes = async (): Promise<IGetBoxesResponse> => {
    await delay(mockApiSettings.latencyInMilliseconds)

    return { boxes: structuredClone(BOX_CATALOGUE), watches: structuredClone(WATCH_CATALOGUE) }
  }

  purchaseBox = async (body: IPurchaseBoxRequestData): Promise<IPurchaseBoxResponse> => {
    await delay(mockApiSettings.latencyInMilliseconds)

    if (mockApiSettings.purchaseFailureMode === EMockFailureMode.NetworkError) {
      throw new PurchaseError(EPurchaseErrorCode.NetworkError)
    }

    if (mockApiSettings.purchaseFailureMode === EMockFailureMode.ServerError) {
      throw new PurchaseError(EPurchaseErrorCode.ServerError)
    }

    const response = this.processPurchase(body)

    // The server did its job, but the answer never arrives.
    if (mockApiSettings.purchaseFailureMode === EMockFailureMode.ResponseLost) {
      throw new PurchaseError(EPurchaseErrorCode.NetworkError)
    }

    return response
  }

  // Test helper: forget every processed purchase (a fresh "server").
  resetServer = () => {
    this.processedPurchases.clear()
  }

  private processPurchase = (body: IPurchaseBoxRequestData): IPurchaseBoxResponse => {
    const alreadyProcessed = this.processedPurchases.get(body.idempotencyKey)

    if (alreadyProcessed) {
      if (alreadyProcessed.boxIdentifier !== body.boxIdentifier) {
        throw new PurchaseError(EPurchaseErrorCode.ServerError)
      }

      return alreadyProcessed
    }

    const box = BOX_CATALOGUE.find(candidate => candidate.identifier === body.boxIdentifier)

    if (!box) {
      throw new PurchaseError(EPurchaseErrorCode.BoxNotFound)
    }

    const drop = rollWatchForPurchase(box.dropTable, body.idempotencyKey)
    const watch = WATCH_CATALOGUE.find(candidate => candidate.identifier === drop.watchIdentifier)

    if (!watch) {
      throw new PurchaseError(EPurchaseErrorCode.ServerError)
    }

    const response: IPurchaseBoxResponse = {
      idempotencyKey: body.idempotencyKey,
      boxIdentifier: box.identifier,
      watch: { ...watch },
    }

    this.processedPurchases.set(body.idempotencyKey, response)

    return response
  }
}

export default MysteryBoxApiImplementation
