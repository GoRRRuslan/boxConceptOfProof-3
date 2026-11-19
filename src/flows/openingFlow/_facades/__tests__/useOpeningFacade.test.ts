import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { createElement, type ReactNode } from 'react'

import '@i18next/i18init'
import {
  ANTICIPATION_DURATION_MILLISECONDS,
  DRAG_INERTIA_MAXIMUM_MILLISECONDS,
  FOCUS_DURATION_MILLISECONDS,
  LID_OPEN_DURATION_MILLISECONDS,
  OPEN_SWIPE_DISTANCE,
  TUCK_DELAY_MILLISECONDS,
  TUCK_DURATION_MILLISECONDS,
} from '@flows/openingFlow/_config/openingConfig'
import { useOpeningFacade } from '@flows/openingFlow/_facades/useOpeningFacade'
import { EOpeningPhase } from '@flows/openingFlow/_types'
import useStore from '@models/mainStorage/_storeConfigured'
import { resetAllSlices } from '@models/mainStorage/_storeConfigured/ResetterStore'
import { INITIAL_BALANCE_IN_CENTS } from '@models/mainStorage/WalletStore/initialState'
import MysteryBoxApi from '@networking/api/MysteryBoxApi'
import { mockApiSettings, resetMockApiSettings } from '@networking/api/MysteryBoxApi/_config/mockApiSettings'
import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'
import { WATCH_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/watchCatalogue'
import { EBoxIdentifier, EMockFailureMode } from '@networking/api/MysteryBoxApi/_types'
import { hapticFeedback } from '@services/haptics/hapticFeedback'
import { soundEffects } from '@services/sounds/soundEffects'

const mockSceneStates: unknown[] = []

jest.mock('react-native-gesture-handler', () => ({
  usePanGesture: (config: unknown) => config,
  usePinchGesture: (config: unknown) => config,
  useTapGesture: (config: unknown) => config,
  // The composed gesture is just the three configs, so the tests can call each callback.
  useSimultaneousGestures: (pan: unknown, pinch: unknown, tap: unknown) => ({ pan, pinch, tap }),
}))

jest.mock('expo-sensors', () => ({
  DeviceMotion: { isAvailableAsync: () => Promise.resolve(false), setUpdateInterval: jest.fn(), addListener: jest.fn() },
}))

jest.mock('@services/sounds/soundEffects', () => ({
  ESoundEffect: {
    Select: 'select',
    Purchase: 'purchase',
    Anticipation: 'anticipation',
    LidOpen: 'lidOpen',
    RevealCommon: 'revealCommon',
    RevealRare: 'revealRare',
    RevealLegendary: 'revealLegendary',
    Error: 'error',
  },
  soundEffects: { play: jest.fn() },
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

jest.mock('react-native-worklets', () => ({
  createSynchronizable: (initial: unknown) => {
    let value = initial

    return {
      getBlocking: () => value,
      setBlocking: (next: unknown) => {
        value = next

        mockSceneStates.push(next)
      },
    }
  },
}))

jest.mock('@assets/images/watches/full/casio.webp', () => 1, { virtual: true })

jest.mock('@assets/images/watches/full/gmt.webp', () => 2, { virtual: true })

jest.mock('@assets/images/watches/full/perpetual.webp', () => 3, { virtual: true })

jest.mock('@assets/images/watches/full/sky-dweller.webp', () => 4, { virtual: true })

jest.mock('@assets/images/watches/thumb/casio.webp', () => 5, { virtual: true })

jest.mock('@assets/images/watches/thumb/gmt.webp', () => 6, { virtual: true })

jest.mock('@assets/images/watches/thumb/perpetual.webp', () => 7, { virtual: true })

jest.mock('@assets/images/watches/thumb/sky-dweller.webp', () => 8, { virtual: true })

const boxesData = { boxes: BOX_CATALOGUE, watches: WATCH_CATALOGUE }
const cards = BOX_CATALOGUE.map(box => ({ identifier: box.identifier }) as never)
const [starterBox, , , legendBox] = BOX_CATALOGUE

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })

  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children)
}

const renderFacade = () => renderHook(() => useOpeningFacade({ boxesData, cards }), { wrapper: createWrapper() })

describe('useOpeningFacade', () => {
  beforeEach(() => {
    resetAllSlices()

    resetMockApiSettings()

    mockApiSettings.latencyInMilliseconds = 0

    // A fresh "server": purchase keys of earlier tests must not leak into this one.
    MysteryBoxApi.resetServer()

    mockSceneStates.length = 0

    jest.clearAllMocks()
  })

  it('starts browsing with no overlay', async () => {
    const { result } = await renderFacade()

    expect(result.current.phase).toBe(EOpeningPhase.Browsing)

    expect(result.current.isOverlayVisible).toBe(false)

    expect(result.current.primaryButton).toBeNull()
  })

  it('selecting a box centres it and offers to buy it', async () => {
    const { result } = await renderFacade()

    await act(() => {
      result.current.handleCardPress(EBoxIdentifier.Starter)
    })

    expect(result.current.phase).toBe(EOpeningPhase.Inspecting)

    expect(result.current.isListHidden).toBe(true)

    expect(result.current.boxNameText).toBe('Starter Box')

    expect(result.current.primaryButton?.labelText).toBe('Buy for $50')

    expect(result.current.primaryButton?.isDisabled).toBe(false)

    expect(hapticFeedback.selection).toHaveBeenCalled()
  })

  it('goes all the way: buy, open, reveal, done — one deduction and one watch', async () => {
    jest.useFakeTimers()

    const { result } = await renderFacade()

    await act(() => {
      result.current.handleCardPress(EBoxIdentifier.Starter)
    })

    await act(async () => {
      result.current.primaryButton?.onPress()

      await jest.advanceTimersByTimeAsync(50)
    })

    expect(result.current.phase).toBe(EOpeningPhase.Ready)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - starterBox.priceInCents)

    expect(useStore.getState().ownedWatches).toHaveLength(1)

    expect(hapticFeedback.success).toHaveBeenCalled()

    expect(result.current.primaryButton?.labelText).toBe('Open the box')

    await act(() => {
      result.current.primaryButton?.onPress()
    })

    expect(result.current.phase).toBe(EOpeningPhase.Opening)

    expect(result.current.primaryButton?.isDisabled).toBe(true)

    expect(hapticFeedback.anticipation).toHaveBeenCalled()

    await act(async () => {
      await jest.advanceTimersByTimeAsync(ANTICIPATION_DURATION_MILLISECONDS + LID_OPEN_DURATION_MILLISECONDS + 10)
    })

    expect(result.current.phase).toBe(EOpeningPhase.Revealed)

    expect(result.current.reveal?.nameText).toBe(useStore.getState().ownedWatches[0].watch.name)

    // The prize has the stage alone: Done appears only once the opened box has been put away.
    expect(result.current.primaryButton).toBeNull()

    await act(async () => {
      await jest.advanceTimersByTimeAsync(TUCK_DELAY_MILLISECONDS + TUCK_DURATION_MILLISECONDS + 10)
    })

    expect(result.current.primaryButton?.labelText).toBe('Done')

    await act(() => {
      result.current.primaryButton?.onPress()
    })

    expect(result.current.phase).toBe(EOpeningPhase.Browsing)

    // Opening and closing did not buy anything a second time.
    expect(useStore.getState().ownedWatches).toHaveLength(1)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS - starterBox.priceInCents)

    jest.useRealTimers()
  })

  it('a failed purchase changes nothing, explains why and allows another try', async () => {
    mockApiSettings.purchaseFailureMode = EMockFailureMode.ServerError

    const { result } = await renderFacade()

    await act(() => {
      result.current.handleCardPress(EBoxIdentifier.Starter)
    })

    await act(() => {
      result.current.primaryButton?.onPress()
    })

    await waitFor(() => {
      expect(result.current.phase).toBe(EOpeningPhase.Inspecting)
    })

    expect(result.current.errorText).toContain('Nothing was charged')

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

    expect(useStore.getState().ownedWatches).toEqual([])

    expect(hapticFeedback.error).toHaveBeenCalled()

    mockApiSettings.purchaseFailureMode = EMockFailureMode.None

    await act(() => {
      result.current.primaryButton?.onPress()
    })

    await waitFor(() => {
      expect(result.current.phase).toBe(EOpeningPhase.Ready)
    })

    expect(result.current.errorText).toBeNull()

    expect(useStore.getState().ownedWatches).toHaveLength(1)
  })

  it('a box the balance cannot pay for cannot be bought', async () => {
    const { result } = await renderFacade()

    await act(() => {
      result.current.handleCardPress(EBoxIdentifier.Legend)
    })

    expect(result.current.primaryButton?.isDisabled).toBe(true)

    expect(result.current.hintText).toBe('Not enough balance')

    await act(() => {
      result.current.primaryButton?.onPress()
    })

    expect(result.current.phase).toBe(EOpeningPhase.Inspecting)

    expect(useStore.getState().balanceInCents).toBe(INITIAL_BALANCE_IN_CENTS)

    expect(legendBox.priceInCents).toBeGreaterThan(INITIAL_BALANCE_IN_CENTS)
  })

  it('may go back before buying, and cannot select a second box while one is open', async () => {
    const { result } = await renderFacade()

    await act(() => {
      result.current.handleCardPress(EBoxIdentifier.Starter)
    })

    await act(() => {
      result.current.handleCardPress(EBoxIdentifier.Classic)
    })

    expect(result.current.boxNameText).toBe('Starter Box')

    await act(() => {
      result.current.handleBackPress()
    })

    expect(result.current.phase).toBe(EOpeningPhase.Browsing)

    expect(result.current.isOverlayVisible).toBe(false)
  })

  it('tells the 3D scene which card is opened and starts the lid', async () => {
    const { result } = await renderFacade()

    await act(() => {
      result.current.handleCardPress(EBoxIdentifier.Elite)
    })

    expect(result.current.sceneState.getBlocking()).toMatchObject({ focusedCardIndex: 2, focusTarget: 1, lidTarget: 0 })

    await act(() => {
      result.current.primaryButton?.onPress()
    })

    await waitFor(() => {
      expect(result.current.phase).toBe(EOpeningPhase.Ready)
    })

    await act(() => {
      result.current.primaryButton?.onPress()
    })

    expect(result.current.sceneState.getBlocking()).toMatchObject({ lidTarget: 1 })
  })

  it('keeps the renderer busy after the finger lifts, until the inertia has played out', async () => {
    jest.useFakeTimers()

    const { result } = await renderFacade()
    const gesture = (result.current.gesture as unknown as { pan: Record<string, (event?: unknown) => void> }).pan

    await act(() => {
      gesture.onActivate()
    })

    expect(result.current.isDragging).toBe(true)

    await act(() => {
      gesture.onFinalize()
    })

    expect(result.current.isDragging).toBe(true)

    await act(async () => {
      await jest.advanceTimersByTimeAsync(DRAG_INERTIA_MAXIMUM_MILLISECONDS + 10)
    })

    expect(result.current.isDragging).toBe(false)

    jest.useRealTimers()
  })

  it('does not keep the renderer busy after a plain tap that never became a drag', async () => {
    jest.useFakeTimers()

    const { result } = await renderFacade()
    const gesture = (result.current.gesture as unknown as { pan: Record<string, (event?: unknown) => void> }).pan

    await act(() => {
      gesture.onFinalize()
    })

    expect(result.current.isDragging).toBe(false)

    jest.useRealTimers()
  })

  describe('opening: anticipation, light, reveal', () => {
    const buyAndGetReady = async (result: Awaited<ReturnType<typeof renderFacade>>['result']) => {
      await act(() => {
        result.current.handleCardPress(EBoxIdentifier.Starter)
      })

      await act(async () => {
        result.current.primaryButton?.onPress()

        await jest.advanceTimersByTimeAsync(50)
      })
    }

    it('the lid starts only after the anticipation, and the reveal comes after the lid', async () => {
      jest.useFakeTimers()

      const { result } = await renderFacade()

      await buyAndGetReady(result)

      await act(() => {
        result.current.primaryButton?.onPress()
      })

      const scene = result.current.sceneState.getBlocking() as { lidStartedAtMilliseconds: number; openStartedAtMilliseconds: number }

      expect(scene.lidStartedAtMilliseconds - scene.openStartedAtMilliseconds).toBe(ANTICIPATION_DURATION_MILLISECONDS)

      expect(hapticFeedback.anticipation).toHaveBeenCalled()

      expect(soundEffects.play).toHaveBeenCalledWith('anticipation')

      await act(async () => {
        await jest.advanceTimersByTimeAsync(ANTICIPATION_DURATION_MILLISECONDS + 10)
      })

      expect(hapticFeedback.lidOpening).toHaveBeenCalled()

      expect(soundEffects.play).toHaveBeenCalledWith('lidOpen')

      expect(result.current.phase).toBe(EOpeningPhase.Opening)

      await act(async () => {
        await jest.advanceTimersByTimeAsync(LID_OPEN_DURATION_MILLISECONDS)
      })

      expect(result.current.phase).toBe(EOpeningPhase.Revealed)

      jest.useRealTimers()
    })

    describe('putting the box away after the reveal', () => {
      const openAndReveal = async (result: Awaited<ReturnType<typeof renderFacade>>['result']) => {
        await buyAndGetReady(result)

        await act(async () => {
          result.current.primaryButton?.onPress()

          await jest.advanceTimersByTimeAsync(ANTICIPATION_DURATION_MILLISECONDS + LID_OPEN_DURATION_MILLISECONDS + 10)
        })
      }

      it('puts the box away after a moment and then lets the renderer rest', async () => {
        jest.useFakeTimers()

        const { result } = await renderFacade()

        await openAndReveal(result)

        expect(result.current.phase).toBe(EOpeningPhase.Revealed)

        expect(result.current.isBoxPutAway).toBe(false)

        await act(async () => {
          await jest.advanceTimersByTimeAsync(TUCK_DELAY_MILLISECONDS)
        })

        expect(result.current.sceneState.getBlocking()).toMatchObject({ tuckTarget: 1 })

        await act(async () => {
          await jest.advanceTimersByTimeAsync(TUCK_DURATION_MILLISECONDS)
        })

        expect(result.current.isBoxPutAway).toBe(true)

        jest.useRealTimers()
      })

      it('a late timer never puts away a box that is already flying home', async () => {
        jest.useFakeTimers()

        const { result } = await renderFacade()

        await openAndReveal(result)

        // Leaving before the box is put away (Done is not offered yet, but Back must be safe at any moment).
        await act(() => {
          result.current.handleBackPress()
        })

        await act(async () => {
          await jest.advanceTimersByTimeAsync(TUCK_DELAY_MILLISECONDS + TUCK_DURATION_MILLISECONDS + 1000)
        })

        expect(result.current.sceneState.getBlocking()).toMatchObject({ tuckTarget: 0 })

        expect(result.current.isBoxPutAway).toBe(false)

        jest.useRealTimers()
      })

      it('a late timer never puts away the next box that is selected right after Done', async () => {
        jest.useFakeTimers()

        const { result } = await renderFacade()

        await openAndReveal(result)

        await act(() => {
          result.current.handleBackPress()
        })

        await act(async () => {
          await jest.advanceTimersByTimeAsync(FOCUS_DURATION_MILLISECONDS + 10)
        })

        await act(() => {
          result.current.handleCardPress(EBoxIdentifier.Starter)
        })

        await act(async () => {
          await jest.advanceTimersByTimeAsync(TUCK_DELAY_MILLISECONDS + TUCK_DURATION_MILLISECONDS + 1000)
        })

        expect(result.current.phase).toBe(EOpeningPhase.Inspecting)

        expect(result.current.sceneState.getBlocking()).toMatchObject({ tuckTarget: 0, focusTarget: 1 })

        jest.useRealTimers()
      })
    })

    it('tells the scene the colour of the light inside before the box is opened', async () => {
      jest.useFakeTimers()

      const { result } = await renderFacade()

      await buyAndGetReady(result)

      const scene = result.current.sceneState.getBlocking() as { glowColorLinear: number[] }

      // The first purchase is a Casio: a common prize with a soft blue-grey glow.
      expect(scene.glowColorLinear).toEqual([0.35, 0.5, 0.58])

      jest.useRealTimers()
    })

    it('the reveal knows the rarity of the prize and plays the matching sound and haptics', async () => {
      jest.useFakeTimers()

      const { result } = await renderFacade()

      await buyAndGetReady(result)

      await act(() => {
        result.current.primaryButton?.onPress()
      })

      await act(async () => {
        await jest.advanceTimersByTimeAsync(ANTICIPATION_DURATION_MILLISECONDS + LID_OPEN_DURATION_MILLISECONDS + 10)
      })

      expect(result.current.reveal).toMatchObject({ rarityLabelText: 'Common', particleCount: 0, flashOpacity: 0 })

      expect(soundEffects.play).toHaveBeenCalledWith('revealCommon')

      expect(hapticFeedback.rarityReveal).toHaveBeenCalledWith(0)

      jest.useRealTimers()
    })

    it('plays a sound for every step of the purchase', async () => {
      const { result } = await renderFacade()

      await act(() => {
        result.current.handleCardPress(EBoxIdentifier.Starter)
      })

      expect(soundEffects.play).toHaveBeenCalledWith('select')

      await act(() => {
        result.current.primaryButton?.onPress()
      })

      await waitFor(() => {
        expect(soundEffects.play).toHaveBeenCalledWith('purchase')
      })
    })

    it('plays the error sound when the purchase fails', async () => {
      mockApiSettings.purchaseFailureMode = EMockFailureMode.ServerError

      const { result } = await renderFacade()

      await act(() => {
        result.current.handleCardPress(EBoxIdentifier.Starter)
      })

      await act(() => {
        result.current.primaryButton?.onPress()
      })

      await waitFor(() => {
        expect(soundEffects.play).toHaveBeenCalledWith('error')
      })
    })
  })

  describe('gestures', () => {
    const getGestures = (result: Awaited<ReturnType<typeof renderFacade>>['result']) =>
      result.current.gesture as unknown as {
        pan: Record<string, (event?: unknown) => void>
        pinch: Record<string, (event?: unknown) => void>
        tap: Record<string, (event?: unknown) => void>
      }

    it('pinch zooms the box within limits', async () => {
      const { result } = await renderFacade()

      await act(() => {
        result.current.handleCardPress(EBoxIdentifier.Starter)
      })

      await act(() => {
        getGestures(result).pinch.onUpdate({ scaleChange: 1.5 })
      })

      expect((result.current.dragState.getBlocking() as { zoom: number }).zoom).toBeCloseTo(1.5)

      await act(() => {
        getGestures(result).pinch.onUpdate({ scaleChange: 10 })
      })

      expect((result.current.dragState.getBlocking() as { zoom: number }).zoom).toBe(2)
    })

    it('a double tap resets the turn and the zoom', async () => {
      const { result } = await renderFacade()

      await act(() => {
        result.current.handleCardPress(EBoxIdentifier.Starter)
      })

      await act(() => {
        getGestures(result).pinch.onUpdate({ scaleChange: 1.5 })

        getGestures(result).tap.onActivate()
      })

      expect((result.current.dragState.getBlocking() as { isResetting: boolean }).isResetting).toBe(true)
    })

    it('dragging turns the box while inspecting', async () => {
      const { result } = await renderFacade()

      await act(() => {
        result.current.handleCardPress(EBoxIdentifier.Starter)
      })

      await act(() => {
        getGestures(result).pan.onUpdate({ changeX: 50, changeY: 10 })
      })

      expect((result.current.dragState.getBlocking() as { yawRadians: number }).yawRadians).toBeGreaterThan(0)
    })

    it('swiping up on a bought box opens it, a short swipe does not', async () => {
      jest.useFakeTimers()

      const { result } = await renderFacade()

      await act(() => {
        result.current.handleCardPress(EBoxIdentifier.Starter)
      })

      await act(async () => {
        result.current.primaryButton?.onPress()

        await jest.advanceTimersByTimeAsync(50)
      })

      expect(result.current.phase).toBe(EOpeningPhase.Ready)

      await act(() => {
        getGestures(result).pan.onDeactivate({ velocityX: 0, velocityY: 0, translationY: -(OPEN_SWIPE_DISTANCE - 20) })
      })

      expect(result.current.phase).toBe(EOpeningPhase.Ready)

      await act(() => {
        getGestures(result).pan.onDeactivate({ velocityX: 0, velocityY: 0, translationY: -(OPEN_SWIPE_DISTANCE + 20) })
      })

      expect(result.current.phase).toBe(EOpeningPhase.Opening)

      jest.useRealTimers()
    })

    it('does not tilt the box when the finger moves up and down on a bought box', async () => {
      jest.useFakeTimers()

      const { result } = await renderFacade()

      await act(() => {
        result.current.handleCardPress(EBoxIdentifier.Starter)
      })

      await act(async () => {
        result.current.primaryButton?.onPress()

        await jest.advanceTimersByTimeAsync(50)
      })

      await act(() => {
        getGestures(result).pan.onUpdate({ changeX: 0, changeY: 80 })
      })

      expect((result.current.dragState.getBlocking() as { pitchRadians: number }).pitchRadians).toBe(0)

      jest.useRealTimers()
    })
  })
})
