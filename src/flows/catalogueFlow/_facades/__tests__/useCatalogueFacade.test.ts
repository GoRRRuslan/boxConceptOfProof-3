import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { createElement, type ReactNode } from 'react'
import { Alert } from 'react-native'

import '@i18next/i18init'
import { useCatalogueFacade } from '@flows/catalogueFlow/_facades/useCatalogueFacade'
import { MysteryScene } from '@mysteryScene'
import { INITIAL_BALANCE_IN_CENTS } from '@models/mainStorage/WalletStore/initialState'
import useStore from '@models/mainStorage/_storeConfigured'
import { resetAllSlices } from '@models/mainStorage/_storeConfigured/ResetterStore'
import { mockApiSettings, resetMockApiSettings } from '@networking/api/MysteryBoxApi/_config/mockApiSettings'
import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'

const mockSetParams = jest.fn()

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ setParams: mockSetParams, addListener: () => () => undefined }) }))

// Short waits for the scene, so that its cases can be tested in real time.
jest.mock('@flows/catalogueFlow/_config/catalogueLayoutConfig', () => ({
  ...jest.requireActual<Record<string, unknown>>('@flows/catalogueFlow/_config/catalogueLayoutConfig'),
  ENTRANCE_DURATION_MILLISECONDS: 50,
  ENTRANCE_STAGGER_MILLISECONDS: 10,
  SCENE_READY_SETTLE_MILLISECONDS: 100,
  SCENE_READY_TIMEOUT_MILLISECONDS: 700,
}))

jest.mock('react-native-gesture-handler', () => ({
  usePanGesture: () => ({}),
  usePinchGesture: () => ({}),
  useTapGesture: () => ({}),
  useLongPressGesture: () => ({}),
  useSimultaneousGestures: () => ({}),
}))

jest.mock('expo-sensors', () => ({
  DeviceMotion: { isAvailableAsync: () => Promise.resolve(false), setUpdateInterval: jest.fn(), addListener: jest.fn() },
}))

jest.mock('@services/sounds/soundEffects', () => ({
  ESoundEffect: {},
  soundEffects: { play: jest.fn(), prepare: jest.fn() },
}))

jest.mock('@services/haptics/hapticFeedback', () => ({
  hapticFeedback: {
    success: jest.fn(),
    error: jest.fn(),
    lidOpening: jest.fn(),
    selection: jest.fn(),
    anticipation: jest.fn(),
    rarityReveal: jest.fn(),
  },
}))

jest.mock('@services/performance/useRenderFpsMeter', () => ({
  useRenderFpsMeter: () => ({ handleFrameStats: jest.fn(), renderFrameStats: null, isRenderPaused: false }),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children)
}

const scrollEvent = (offsetY: number) => ({ nativeEvent: { contentOffset: { y: offsetY } } }) as never

describe('useCatalogueFacade', () => {
  beforeEach(() => {
    resetAllSlices()

    resetMockApiSettings()

    mockApiSettings.latencyInMilliseconds = 0

    jest.clearAllMocks()
  })

  it('loads the boxes and builds one card per box', async () => {
    const { result } = await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    expect(result.current.isLoadingBoxes).toBe(true)

    await waitFor(() => {
      expect(result.current.cards).toHaveLength(BOX_CATALOGUE.length)
    })

    expect(result.current.isLoadingBoxes).toBe(false)
  })

  it('is not ready until the native scene has loaded its model and settled, then is', async () => {
    const { result } = await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.cards).toHaveLength(BOX_CATALOGUE.length)
    })

    // The boxes are loaded, the model is not: still not ready.
    expect(result.current.isSceneReady).toBe(false)

    await act(() => {
      result.current.handleModelLoaded()
    })

    // The model is there, but the boxes are still popping in and the picture has not settled.
    expect(result.current.isSceneReady).toBe(false)

    await waitFor(() => {
      expect(result.current.isSceneReady).toBe(true)
    })
  })

  it('stops waiting for a scene whose model never loads', async () => {
    const { result } = await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.cards).toHaveLength(BOX_CATALOGUE.length)
    })

    expect(result.current.isSceneReady).toBe(false)

    await waitFor(
      () => {
        expect(result.current.isSceneReady).toBe(true)
      },
      { timeout: 2000 },
    )
  })

  it('keeps the tab bar while the list is shown', async () => {
    await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    expect(mockSetParams).toHaveBeenCalledWith({ isTabBarHidden: false })

    expect(mockSetParams).not.toHaveBeenCalledWith({ isTabBarHidden: true })
  })

  it('resets the balance to the starting one after a confirmation, and keeps it when nothing is confirmed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)

    const { result } = await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    await act(() => {
      useStore.setState({ balanceInCents: 12_300 })
    })

    await act(() => {
      result.current.handleResetBalancePress()
    })

    const buttons = alertSpy.mock.calls[0]?.[2] ?? []

    expect(useStore.getState().balanceInCents).toBe(12_300)

    await act(() => {
      buttons.find(button => button.style === 'destructive')?.onPress?.()
    })

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

    alertSpy.mockRestore()
  })

  it('exposes the wallet balance in cents and follows it', async () => {
    const { result } = await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    expect(result.current.balanceInCents).toBe(100_000)

    await act(() => {
      useStore.setState({ balanceInCents: 55_000 })
    })

    expect(result.current.balanceInCents).toBe(55_000)
  })

  it('sends every scroll offset straight to the native scene', async () => {
    const { result } = await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    await act(() => {
      result.current.handleScroll(scrollEvent(240))

      result.current.handleScroll(scrollEvent(255))
    })

    expect(MysteryScene.setScrollOffset).toHaveBeenNthCalledWith(1, 240)

    expect(MysteryScene.setScrollOffset).toHaveBeenNthCalledWith(2, 255)
  })

  it('gives the scene one look (colour and finish) per card', async () => {
    const { result } = await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.sceneCardLooks).toHaveLength(BOX_CATALOGUE.length)
    })

    expect(result.current.sceneCardLooks[0]).toEqual({
      color: [result.current.cards[0].colorLinearRgba[0], result.current.cards[0].colorLinearRgba[1], result.current.cards[0].colorLinearRgba[2]],
      ...result.current.cards[0].finish,
    })
  })

  it('stores the viewport size reported by the list layout', async () => {
    const { result } = await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    expect(result.current.viewport).toBeNull()

    await act(() => {
      result.current.handleListLayout({ nativeEvent: { layout: { width: 390, height: 640, x: 0, y: 0 } } } as never)
    })

    expect(result.current.viewport).toEqual({ width: 390, height: 640 })
  })

  it('squeezes the pressed box until the finger lifts', async () => {
    const { result } = await renderHook(() => useCatalogueFacade(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.cards.length).toBeGreaterThan(0)
    })

    await act(() => {
      result.current.handleCardPressIn(BOX_CATALOGUE[2].identifier)
    })

    expect(MysteryScene.pressIn).toHaveBeenCalledWith(2)

    await act(() => {
      result.current.handleCardPressOut()
    })

    expect(MysteryScene.pressOut).toHaveBeenCalledTimes(1)
  })
})
