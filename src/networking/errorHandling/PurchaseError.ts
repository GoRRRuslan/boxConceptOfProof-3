import type { EPurchaseErrorCode } from '@networking/api/MysteryBoxApi/_types'

export class PurchaseError extends Error {
  readonly code: EPurchaseErrorCode

  constructor(code: EPurchaseErrorCode) {
    super(code)

    this.name = 'PurchaseError'

    this.code = code
  }
}
