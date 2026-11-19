import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import useStore from '@models/mainStorage/_storeConfigured'
import { resetAllSlices } from '@models/mainStorage/_storeConfigured/ResetterStore'
import { INITIAL_BALANCE_IN_CENTS } from '@models/mainStorage/WalletStore/initialState'
import { mockApiSettings, resetMockApiSettings } from '@networking/api/MysteryBoxApi/_config/mockApiSettings'
import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'
import { EBoxPurchaseResultStatus } from '@networking/requests/mutations/PurchaseMutations/_logic/runBoxPurchase'
import { usePostPurchaseBoxMutation } from '@networking/requests/mutations/PurchaseMutations/usePostPurchaseBoxMutation'

const [, box] = BOX_CATALOGUE

describe('usePostPurchaseBoxMutation', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })}>
      {children}
    </QueryClientProvider>
  )

  beforeEach(() => {
    resetAllSlices()

    resetMockApiSettings()

    mockApiSettings.latencyInMilliseconds = 150
  })

  it('buys through the real API mock: one deduction, one watch, and a pending state while it runs', async () => {
    const { result } = await renderHook(() => usePostPurchaseBoxMutation(), { wrapper })

    let purchasePromise: ReturnType<typeof result.current.mutatePurchaseBoxAsync> | undefined

    await act(() => {
      purchasePromise = result.current.mutatePurchaseBoxAsync(box)
    })

    await waitFor(() => {
      expect(result.current.isPendingPurchaseBox).toBe(true)
    })

    const purchaseResult = await act(() => purchasePromise)

    expect(purchaseResult?.status).toBe(EBoxPurchaseResultStatus.Success)

    await waitFor(() => {
      expect(result.current.isPendingPurchaseBox).toBe(false)
    })

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - box.priceInCents)

    expect(useStore.getState().ownedWatches).toHaveLength(1)
  })

  it('rapid repeated calls produce one purchase', async () => {
    const { result } = await renderHook(() => usePostPurchaseBoxMutation(), { wrapper })

    await act(async () => {
      await Promise.all([
        result.current.mutatePurchaseBoxAsync(box),
        result.current.mutatePurchaseBoxAsync(box),
        result.current.mutatePurchaseBoxAsync(box),
      ])
    })

    expect(useStore.getState().ownedWatches).toHaveLength(1)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - box.priceInCents)
  })
})
