export enum EWatchIdentifier {
  Casio = 'casio',
  Gmt = 'gmt',
  Perpetual = 'perpetual',
  SkyDweller = 'skyDweller',
}

export enum EBoxIdentifier {
  Starter = 'starter',
  Classic = 'classic',
  Elite = 'elite',
  Legend = 'legend',
  Chrono = 'chrono',
  Aviator = 'aviator',
  Diver = 'diver',
  Grand = 'grand',
}

export enum EPurchaseErrorCode {
  InsufficientBalance = 'insufficientBalance',
  BoxNotFound = 'boxNotFound',
  NetworkError = 'networkError',
  ServerError = 'serverError',
}

export enum EMockFailureMode {
  None = 'none',
  // The request never reaches the server: nothing was processed.
  NetworkError = 'networkError',
  // The server rejects the request: nothing was processed.
  ServerError = 'serverError',
  // The server processes the purchase but the response is lost on the way back.
  ResponseLost = 'responseLost',
}

// All money is stored in integer cents to avoid floating point errors.
export interface IWatch {
  identifier: EWatchIdentifier
  name: string
  brand: string
  valueInCents: number
}

export interface IBoxDropEntry {
  watchIdentifier: EWatchIdentifier
  // Relative weight; the chance of a watch is its weight divided by the sum of all weights of the box.
  weight: number
}

export interface IMysteryBox {
  identifier: EBoxIdentifier
  name: string
  priceInCents: number
  colorHex: string
  dropTable: IBoxDropEntry[]
}

export interface IGetBoxesResponse {
  boxes: IMysteryBox[]
  watches: IWatch[]
}

export interface IPurchaseBoxRequestData {
  boxIdentifier: EBoxIdentifier
  // Same key = same purchase: the server returns the stored result instead of rolling again.
  idempotencyKey: string
}

export interface IPurchaseBoxResponse {
  idempotencyKey: string
  boxIdentifier: EBoxIdentifier
  watch: IWatch
}
