import useStore from '@models/mainStorage/_storeConfigured'
import { resetAllSlices } from '@models/mainStorage/_storeConfigured/ResetterStore'
import { INITIAL_BALANCE_IN_CENTS } from '@models/mainStorage/WalletStore/initialState'
import { EBeginPurchaseOutcome, EPurchaseStatus } from '@models/mainStorage/PurchaseStore/_types'
import { EBoxIdentifier, EPurchaseErrorCode, EWatchIdentifier } from '@networking/api/MysteryBoxApi/_types'

const PRICE_IN_CENTS = 15_000
const beginParams = { boxIdentifier: EBoxIdentifier.Classic, priceInCents: PRICE_IN_CENTS }
const buildResponse = (idempotencyKey: string) => ({
  idempotencyKey,
  boxIdentifier: EBoxIdentifier.Classic,
  watch: { identifier: EWatchIdentifier.Casio, name: 'Casio Vintage', brand: 'Casio', valueInCents: 8_000 },
})

describe('PurchaseStore', () => {
  beforeEach(() => {
    resetAllSlices()
  })

  it('starts with the initial balance, an empty collection and no purchase running', () => {
    const state = useStore.getState()

    expect(state.balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

    expect(state.ownedWatches).toEqual([])

    expect(state.purchaseStatus).toBe(EPurchaseStatus.Idle)
  })

  it('a successful purchase deducts the price once and adds exactly one watch', () => {
    const result = useStore.getState().beginPurchase(beginParams)

    expect(result.outcome).toBe(EBeginPurchaseOutcome.Started)

    useStore.getState().completePurchase(buildResponse('purchase-1'))

    const state = useStore.getState()

    expect(state.balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - PRICE_IN_CENTS)

    expect(state.ownedWatches).toHaveLength(1)

    expect(state.purchaseStatus).toBe(EPurchaseStatus.Idle)
  })

  it('completing the same purchase twice changes nothing the second time', () => {
    useStore.getState().beginPurchase(beginParams)

    useStore.getState().completePurchase(buildResponse('purchase-1'))

    useStore.getState().completePurchase(buildResponse('purchase-1'))

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - PRICE_IN_CENTS)

    expect(useStore.getState().ownedWatches).toHaveLength(1)
  })

  it('ignores a completion that does not belong to the running purchase', () => {
    useStore.getState().beginPurchase(beginParams)

    useStore.getState().completePurchase(buildResponse('some-other-key'))

    expect(useStore.getState().ownedWatches).toHaveLength(0)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)
  })

  it('refuses a second purchase while one is running', () => {
    useStore.getState().beginPurchase(beginParams)

    expect(useStore.getState().beginPurchase(beginParams).outcome).toBe(EBeginPurchaseOutcome.AlreadyInProgress)
  })

  it('refuses a purchase that costs more than the balance and changes nothing', () => {
    const result = useStore.getState().beginPurchase({ ...beginParams, priceInCents: INITIAL_BALANCE_IN_CENTS + 1 })

    expect(result.outcome).toBe(EBeginPurchaseOutcome.InsufficientBalance)

    const state = useStore.getState()

    expect(state.balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

    expect(state.purchaseStatus).toBe(EPurchaseStatus.Idle)

  })

  it('a failed purchase changes neither balance nor collection and unlocks the next purchase', () => {
    useStore.getState().beginPurchase(beginParams)

    useStore.getState().failPurchase(EPurchaseErrorCode.ServerError)

    const state = useStore.getState()

    expect(state.balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

    expect(state.ownedWatches).toEqual([])

    expect(state.purchaseStatus).toBe(EPurchaseStatus.Idle)

    expect(useStore.getState().beginPurchase(beginParams).outcome).toBe(EBeginPurchaseOutcome.Started)
  })

  it('after a network error the retry for the same box re-uses the idempotency key', () => {
    const first = useStore.getState().beginPurchase(beginParams)

    useStore.getState().failPurchase(EPurchaseErrorCode.NetworkError)

    const second = useStore.getState().beginPurchase(beginParams)

    expect(first.outcome).toBe(EBeginPurchaseOutcome.Started)

    expect(second.outcome).toBe(EBeginPurchaseOutcome.Started)

    if (first.outcome === EBeginPurchaseOutcome.Started && second.outcome === EBeginPurchaseOutcome.Started) {
      expect(second.attempt.idempotencyKey).toBe(first.attempt.idempotencyKey)
    }
  })

  it('after a server error a new purchase gets a new idempotency key', () => {
    const first = useStore.getState().beginPurchase(beginParams)

    useStore.getState().failPurchase(EPurchaseErrorCode.ServerError)

    const second = useStore.getState().beginPurchase(beginParams)

    if (first.outcome === EBeginPurchaseOutcome.Started && second.outcome === EBeginPurchaseOutcome.Started) {
      expect(second.attempt.idempotencyKey).not.toBe(first.attempt.idempotencyKey)
    }
  })

  it('resetting all slices returns the session to its initial state', () => {
    useStore.getState().beginPurchase(beginParams)

    useStore.getState().completePurchase(buildResponse('purchase-1'))

    resetAllSlices()

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

    expect(useStore.getState().ownedWatches).toEqual([])
  })
})
