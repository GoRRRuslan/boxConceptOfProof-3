import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react-native'
import { createElement, type ReactNode } from 'react'

import '@i18next/i18init'
import { useCollectionFacade } from '@flows/collectionFlow/_facades/useCollectionFacade'
import useStore from '@models/mainStorage/_storeConfigured'
import { resetAllSlices } from '@models/mainStorage/_storeConfigured/ResetterStore'
import { ETabRoute } from '@navigation/_types'
import { mockApiSettings, resetMockApiSettings } from '@networking/api/MysteryBoxApi/_config/mockApiSettings'
import { WATCH_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/watchCatalogue'
import { EBoxIdentifier } from '@networking/api/MysteryBoxApi/_types'

const mockNavigate = jest.fn()

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }))

jest.mock('@assets/images/watches/full/casio.webp', () => 1, { virtual: true })

jest.mock('@assets/images/watches/full/gmt.webp', () => 2, { virtual: true })

jest.mock('@assets/images/watches/full/perpetual.webp', () => 3, { virtual: true })

jest.mock('@assets/images/watches/full/sky-dweller.webp', () => 4, { virtual: true })

jest.mock('@assets/images/watches/thumb/casio.webp', () => 5, { virtual: true })

jest.mock('@assets/images/watches/thumb/gmt.webp', () => 6, { virtual: true })

jest.mock('@assets/images/watches/thumb/perpetual.webp', () => 7, { virtual: true })

jest.mock('@assets/images/watches/thumb/sky-dweller.webp', () => 8, { virtual: true })

const [casio, gmt] = WATCH_CATALOGUE

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children)
}

const ownedWatch = (ownershipIdentifier: string, watch: typeof casio) => ({
  ownershipIdentifier,
  boxIdentifier: EBoxIdentifier.Starter,
  watch,
})

describe('useCollectionFacade', () => {
  beforeEach(() => {
    resetAllSlices()

    resetMockApiSettings()

    mockApiSettings.latencyInMilliseconds = 0

    mockNavigate.mockClear()
  })

  it('shows the empty state for a new session', async () => {
    const { result } = await renderHook(() => useCollectionFacade(), { wrapper: createWrapper() })

    expect(result.current.isEmpty).toBe(true)

    expect(result.current.items).toEqual([])

    expect(result.current.totalValueInCents).toBe(0)

    expect(result.current.countText).toBe('0 watches')
  })

  it('shows the owned watches with their count; the total value counts up to its new value', async () => {
    jest.useFakeTimers()

    const { result } = await renderHook(() => useCollectionFacade(), { wrapper: createWrapper() })

    await act(() => {
      useStore.setState({ ownedWatches: [ownedWatch('purchase-1', casio), ownedWatch('purchase-2', gmt)] })
    })

    expect(result.current.isEmpty).toBe(false)

    expect(result.current.items).toHaveLength(2)

    expect(result.current.countText).toBe('2 watches')

    await act(async () => {
      await jest.advanceTimersByTimeAsync(900)
    })

    expect(result.current.totalValueInCents).toBe(128_000)

    jest.useRealTimers()
  })

  it('uses the singular for one watch', async () => {
    const { result } = await renderHook(() => useCollectionFacade(), { wrapper: createWrapper() })

    await act(() => {
      useStore.setState({ ownedWatches: [ownedWatch('purchase-1', casio)] })
    })

    expect(result.current.countText).toBe('1 watch')
  })

  it('"Browse boxes" goes to the catalogue tab', async () => {
    const { result } = await renderHook(() => useCollectionFacade(), { wrapper: createWrapper() })

    await act(() => {
      result.current.handleBrowsePress()
    })

    expect(mockNavigate).toHaveBeenCalledWith(ETabRoute.Catalogue)
  })

  it('opens the detail of a tapped watch and closes it again', async () => {
    const { result } = await renderHook(() => useCollectionFacade(), { wrapper: createWrapper() })

    await act(() => {
      useStore.setState({ ownedWatches: [ownedWatch('purchase-1', casio), ownedWatch('purchase-2', gmt)] })
    })

    expect(result.current.selectedItem).toBeNull()

    await act(() => {
      result.current.handleItemPress('purchase-2')
    })

    expect(result.current.selectedItem).toMatchObject({ ownershipIdentifier: 'purchase-2', nameText: gmt.name, rarityLabelText: 'Epic' })

    await act(() => {
      result.current.handleDetailClose()
    })

    expect(result.current.selectedItem).toBeNull()
  })
})
