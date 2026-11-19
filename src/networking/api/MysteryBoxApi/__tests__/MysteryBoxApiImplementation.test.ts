import { resetMockApiSettings, mockApiSettings } from '@networking/api/MysteryBoxApi/_config/mockApiSettings'
import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'
import { EBoxIdentifier, EMockFailureMode, EPurchaseErrorCode } from '@networking/api/MysteryBoxApi/_types'
import MysteryBoxApiImplementation from '@networking/api/MysteryBoxApi/MysteryBoxApiImplementation'

describe('MysteryBoxApiImplementation', () => {
  let api: MysteryBoxApiImplementation

  beforeEach(() => {
    resetMockApiSettings()

    mockApiSettings.latencyInMilliseconds = 0

    api = new MysteryBoxApiImplementation()
  })

  it('returns the box catalogue and the watches', async () => {
    const response = await api.getBoxes()

    expect(response.boxes).toHaveLength(BOX_CATALOGUE.length)

    expect(response.watches.length).toBeGreaterThan(0)
  })

  it('is asynchronous: the answer arrives after the configured latency', async () => {
    jest.useFakeTimers()

    mockApiSettings.latencyInMilliseconds = 500

    let isResolved = false
    const pending = api.getBoxes().then(() => {
      isResolved = true
    })

    await jest.advanceTimersByTimeAsync(499)

    expect(isResolved).toBe(false)

    await jest.advanceTimersByTimeAsync(2)

    await pending

    expect(isResolved).toBe(true)

    jest.useRealTimers()
  })

  it('returns the same stored result for the same idempotency key', async () => {
    const request = { boxIdentifier: EBoxIdentifier.Classic, idempotencyKey: 'key-1' }
    const first = await api.purchaseBox(request)
    const second = await api.purchaseBox(request)

    expect(second).toEqual(first)
  })

  it('rejects a key that was already used for a different box', async () => {
    await api.purchaseBox({ boxIdentifier: EBoxIdentifier.Classic, idempotencyKey: 'key-1' })

    await expect(api.purchaseBox({ boxIdentifier: EBoxIdentifier.Elite, idempotencyKey: 'key-1' })).rejects.toMatchObject({
      code: EPurchaseErrorCode.ServerError,
    })
  })

  it('rejects an unknown box', async () => {
    await expect(
      api.purchaseBox({ boxIdentifier: 'missing' as unknown as EBoxIdentifier, idempotencyKey: 'key-2' }),
    ).rejects.toMatchObject({ code: EPurchaseErrorCode.BoxNotFound })
  })

  it('fails with a network error or a server error when the failure switch is on', async () => {
    mockApiSettings.purchaseFailureMode = EMockFailureMode.NetworkError

    await expect(api.purchaseBox({ boxIdentifier: EBoxIdentifier.Starter, idempotencyKey: 'a' })).rejects.toMatchObject({
      code: EPurchaseErrorCode.NetworkError,
    })

    mockApiSettings.purchaseFailureMode = EMockFailureMode.ServerError

    await expect(api.purchaseBox({ boxIdentifier: EBoxIdentifier.Starter, idempotencyKey: 'a' })).rejects.toMatchObject({
      code: EPurchaseErrorCode.ServerError,
    })
  })
})
