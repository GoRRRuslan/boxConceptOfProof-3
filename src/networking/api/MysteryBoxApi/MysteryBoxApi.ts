import type {
  IGetBoxesResponse,
  IPurchaseBoxRequestData,
  IPurchaseBoxResponse,
} from '@networking/api/MysteryBoxApi/_types'

export interface IMysteryBoxApi {
  getBoxes: () => Promise<IGetBoxesResponse>

  purchaseBox: (body: IPurchaseBoxRequestData) => Promise<IPurchaseBoxResponse>
}
