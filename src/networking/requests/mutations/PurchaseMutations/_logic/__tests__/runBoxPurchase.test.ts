import useStore from '@models/mainStorage/_storeConfigured'
import { resetAllSlices } from '@models/mainStorage/_storeConfigured/ResetterStore'
import { INITIAL_BALANCE_IN_CENTS } from '@models/mainStorage/WalletStore/initialState'
import { mockApiSettings, resetMockApiSettings } from '@networking/api/MysteryBoxApi/_config/mockApiSettings'
import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'
import { EMockFailureMode, EPurchaseErrorCode, type IMysteryBox } from '@networking/api/MysteryBoxApi/_types'
import MysteryBoxApiImplementation from '@networking/api/MysteryBoxApi/MysteryBoxApiImplementation'
import {
  EBoxPurchaseResultStatus,
  runBoxPurchase,
} from '@networking/requests/mutations/PurchaseMutations/_logic/runBoxPurchase'

const [starterBox, affordableBox, eliteBox, unaffordableBox] = BOX_CATALOGUE

describe('runBoxPurchase', () => {
  let api: MysteryBoxApiImplementation
  let purchaseBoxSpy: jest.SpyInstance

  const buy = (box: IMysteryBox) => runBoxPurchase({ box, api, purchaseStore: useStore })

  beforeEach(() => {
    resetAllSlices()

    resetMockApiSettings()

    mockApiSettings.latencyInMilliseconds = 0

    api = new MysteryBoxApiImplementation()

    purchaseBoxSpy = jest.spyOn(api, 'purchaseBox')
  })

  it('success: exactly one balance deduction and exactly one watch', async () => {
    const result = await buy(affordableBox)

    expect(result.status).toBe(EBoxPurchaseResultStatus.Success)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - affordableBox.priceInCents)

    expect(useStore.getState().ownedWatches).toHaveLength(1)
  })

  it('insufficient balance: nothing changes and the API is never called', async () => {
    const result = await buy(unaffordableBox)

    expect(result).toEqual({ status: EBoxPurchaseResultStatus.Failed, errorCode: EPurchaseErrorCode.InsufficientBalance })

    expect(purchaseBoxSpy).not.toHaveBeenCalled()

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

    expect(useStore.getState().ownedWatches).toEqual([])
  })

  it.each([EMockFailureMode.NetworkError, EMockFailureMode.ServerError])(
    'API failure (%s): balance and collection stay unchanged',
    async failureMode => {
      mockApiSettings.purchaseFailureMode = failureMode

      const result = await buy(affordableBox)

      expect(result.status).toBe(EBoxPurchaseResultStatus.Failed)

      expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

      expect(useStore.getState().ownedWatches).toEqual([])
    },
  )

  it('repeated taps: only one purchase happens, the rest are ignored', async () => {
    const results = await Promise.all([buy(affordableBox), buy(affordableBox), buy(affordableBox), buy(affordableBox), buy(affordableBox)])

    expect(results.filter(result => result.status === EBoxPurchaseResultStatus.Success)).toHaveLength(1)

    expect(results.filter(result => result.status === EBoxPurchaseResultStatus.Ignored)).toHaveLength(4)

    expect(purchaseBoxSpy).toHaveBeenCalledTimes(1)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - affordableBox.priceInCents)

    expect(useStore.getState().ownedWatches).toHaveLength(1)
  })

  it('lost response: retrying with the same key gives the same watch and deducts only once', async () => {
    mockApiSettings.purchaseFailureMode = EMockFailureMode.ResponseLost

    const failed = await buy(affordableBox)

    expect(failed.status).toBe(EBoxPurchaseResultStatus.Failed)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

    mockApiSettings.purchaseFailureMode = EMockFailureMode.None

    const retried = await buy(affordableBox)

    expect(retried.status).toBe(EBoxPurchaseResultStatus.Success)

    expect(useStore.getState().ownedWatches).toHaveLength(1)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - affordableBox.priceInCents)

    const [[firstCall], [secondCall]] = purchaseBoxSpy.mock.calls as [[{ idempotencyKey: string }], [{ idempotencyKey: string }]]

    expect(secondCall.idempotencyKey).toBe(firstCall.idempotencyKey)
  })

  it('a failure followed by a success deducts exactly once', async () => {
    mockApiSettings.purchaseFailureMode = EMockFailureMode.ServerError

    await buy(affordableBox)

    mockApiSettings.purchaseFailureMode = EMockFailureMode.None

    await buy(affordableBox)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - affordableBox.priceInCents)

    expect(useStore.getState().ownedWatches).toHaveLength(1)
  })

  it('several sequential purchases: every success deducts once and adds one watch', async () => {
    await buy(starterBox)

    await buy(affordableBox)

    await buy(starterBox)

    const expectedSpent = starterBox.priceInCents * 2 + affordableBox.priceInCents

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - expectedSpent)

    expect(useStore.getState().ownedWatches).toHaveLength(3)

    const ownershipIdentifiers = useStore.getState().ownedWatches.map(ownedWatch => ownedWatch.ownershipIdentifier)

    expect(new Set(ownershipIdentifiers).size).toBe(3)
  })

  it('stops buying when the balance runs out', async () => {
    // 100,000 cents: two Elite boxes (40,000 each) fit, a third one does not.
    await buy(eliteBox)

    await buy(eliteBox)

    const third = await buy(eliteBox)

    expect(third).toEqual({ status: EBoxPurchaseResultStatus.Failed, errorCode: EPurchaseErrorCode.InsufficientBalance })

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - eliteBox.priceInCents * 2)

    expect(useStore.getState().ownedWatches).toHaveLength(2)
  })
})
