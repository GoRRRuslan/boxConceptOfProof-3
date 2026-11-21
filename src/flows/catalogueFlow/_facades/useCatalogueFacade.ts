import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { FlashListRef } from '@shopify/flash-list'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AppState, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'

import {
  CARD_HEIGHT,
  ENTRANCE_DURATION_MILLISECONDS,
  ENTRANCE_STAGGER_MILLISECONDS,
  LIST_TOP_PADDING,
  SCENE_READY_SETTLE_MILLISECONDS,
  SCENE_READY_TIMEOUT_MILLISECONDS,
} from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { logDiagnostic } from '@services/performance/diagnosticLog'
import { useAdapterCatalogueCards } from '@flows/catalogueFlow/_adapters/useAdapterCatalogueCards'
import { useOpeningFacade } from '@flows/openingFlow/_facades/useOpeningFacade'
import { EOpeningPhase } from '@flows/openingFlow/_types'
import type { ICatalogueCard, ICatalogueFacade, ICatalogueViewport } from '@flows/catalogueFlow/_types'
import { type IMysterySceneScrollSourceEvent, MysteryScene } from '@mysteryScene'
import useStore from '@models/mainStorage/_storeConfigured'
import type { EBoxIdentifier } from '@networking/api/MysteryBoxApi/_types'
import { ETabRoute, type TTabParamList } from '@navigation/_types'
import { INITIAL_BALANCE_IN_CENTS } from '@models/mainStorage/WalletStore/initialState'
import { formatCurrency } from '@utils/formatCurrency'
import { useGetBoxesQuery } from '@networking/requests/queries/BoxQueries/useGetBoxesQuery'
import { useRenderFpsMeter } from '@services/performance/useRenderFpsMeter'

// Back from the background after at least this long: the 3D view is rebuilt (iOS may have taken its drawing surface away).
const REBUILD_SCENE_AFTER_BACKGROUND_MILLISECONDS = 1500
// An opening in one of these phases is closed when the user leaves the Boxes tab.
const LEAVE_TAB_CLOSES_PHASES = [EOpeningPhase.Inspecting, EOpeningPhase.Ready, EOpeningPhase.Revealed]
// Measurement builds show the live frame-rate overlay: EXPO_PUBLIC_SHOW_PERFORMANCE=1
const IS_PERFORMANCE_OVERLAY_VISIBLE = process.env.EXPO_PUBLIC_SHOW_PERFORMANCE === '1'
// Measurement builds can scroll the list up and down by themselves: EXPO_PUBLIC_AUTO_SCROLL=1
const IS_AUTO_SCROLL = process.env.EXPO_PUBLIC_AUTO_SCROLL === '1'
// EXPO_PUBLIC_SCROLL_SOURCE=bridge feeds the scroll offset through JavaScript instead of letting the scene read the native
// scroll view itself (used to measure the difference).
const IS_NATIVE_SCROLL_ALLOWED = process.env.EXPO_PUBLIC_SCROLL_SOURCE !== 'bridge'
const AUTO_SCROLL_SWEEP_MILLISECONDS = 2400
const AUTO_SCROLL_TICK_MILLISECONDS = 16
const PERFORMANCE_SCENARIO_LABEL = IS_AUTO_SCROLL ? 'catalogue-scroll' : 'catalogue'

export const useCatalogueFacade = (): ICatalogueFacade => {
  const { t } = useTranslation()

  // ------------------------ Services ----------------------- //
  const { handleFrameStats, renderFrameStats, isRenderPaused } = useRenderFpsMeter(PERFORMANCE_SCENARIO_LABEL)

  // ------------------------ Navigation ----------------------- //
  const navigation = useNavigation<BottomTabNavigationProp<TTabParamList, ETabRoute.Catalogue>>()

  // --------------------------- State ------------------------- //
  const [viewport, setViewport] = useState<ICatalogueViewport | null>(null)
  const listRef = useRef<FlashListRef<ICatalogueCard> | null>(null)
  // The scene reads the list's native scroll view itself once it is attached; until then (or if that fails) JavaScript feeds it.
  const [scrollViewTag, setScrollViewTag] = useState<number | null>(null)
  const [isNativeScroll, setIsNativeScroll] = useState<boolean>(false)
  // The native scene says its model is loaded; the scene counts as ready a little later (boxes popped in, frames steady).
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false)
  const [isSceneReady, setIsSceneReady] = useState<boolean>(false)
  // Bumped when the app comes back after a while in the background: the 3D scene is built anew (see the effect below).
  const [sceneEpoch, setSceneEpoch] = useState<number>(0)
  const backgroundedAt = useRef<number | null>(null)

  // --------------------------- Store ------------------------- //
  const balanceInCents = useStore(state => state.balanceInCents)

  // ----------------------- Queries / mutations -------------------- //
  const { boxesData, boxesRefetch, isLoadingBoxes, isErrorBoxes } = useGetBoxesQuery()

  // -------------------------- Adapter ------------------------- //
  const cards = useAdapterCatalogueCards({ boxesData, balanceInCents })

  // ------------------------- Opening -------------------------- //
  const opening = useOpeningFacade({ boxesData, cards })
  const openingRef = useRef(opening)

  // -------------------------- Values ------------------------- //
  const sceneCardLooks = useMemo(
    () => cards.map(card => ({ color: [card.colorLinearRgba[0], card.colorLinearRgba[1], card.colorLinearRgba[2]] as [number, number, number], ...card.finish })),
    [cards],
  )

  // ------------------- Handlers -------------------------- //
  const handleListLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout

    setViewport(previous => (previous?.width === width && previous.height === height ? previous : { width, height }))
  }

  // The scroll offset goes straight into the native scene (one synchronous native call, no view update); the scene
  // draws by itself while it changes.
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isNativeScroll) {
      MysteryScene.setScrollOffset(event.nativeEvent.contentOffset.y)
    }
  }

  const handleModelLoaded = () => {
    logDiagnostic('scene.model.loaded')

    setIsModelLoaded(true)
  }

  const handleScrollSourceChange = (event: IMysterySceneScrollSourceEvent) => {
    setIsNativeScroll(event.nativeEvent.source === 'native')
  }

  // The balance goes back to the starting one after a confirmation (the watches stay): for testing the purchases again and again.
  const handleResetBalancePress = () => {
    Alert.alert(t('catalogue.resetBalanceTitle'), t('catalogue.resetBalanceMessage', { amount: formatCurrency(INITIAL_BALANCE_IN_CENTS) }), [
      { text: t('catalogue.resetBalanceCancel'), style: 'cancel' },
      {
        text: t('catalogue.resetBalanceConfirm'),
        style: 'destructive',
        onPress: () => {
          useStore.getState().resetWallet()
        },
      },
    ])
  }

  const handleRetryPress = () => {
    void boxesRefetch()
  }

  // The box under the finger is squeezed a little until the finger lifts.
  const handleCardPressIn = (boxIdentifier: EBoxIdentifier) => {
    MysteryScene.pressIn(cards.findIndex(card => card.identifier === boxIdentifier))
  }

  const handleCardPressOut = () => {
    MysteryScene.pressOut()
  }

  // ------------------- Side effects ----------------------- //
  // Once the list exists, tell the scene which native scroll view to read.
  useEffect(() => {
    if (IS_NATIVE_SCROLL_ALLOWED && viewport && cards.length > 0) {
      const scrollableNode: unknown = listRef.current?.getScrollableNode()

      setScrollViewTag(typeof scrollableNode === 'number' ? scrollableNode : null)
    }
  }, [viewport, cards.length])

  useEffect(() => {
    openingRef.current = opening
  })

  // After a stay in the background the 3D view could show frozen boxes or a box left over from an opening: the drawing surface is rebuilt,
  // and the scene redraws everything from the opening state, which is the single truth.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') {
        backgroundedAt.current = Date.now()

        return
      }

      if (nextState !== 'active' || backgroundedAt.current === null) {
        return
      }

      const awayMilliseconds = Date.now() - backgroundedAt.current

      backgroundedAt.current = null

      if (awayMilliseconds >= REBUILD_SCENE_AFTER_BACKGROUND_MILLISECONDS) {
        logDiagnostic('scene.rebuild', { awayMilliseconds })

        setSceneEpoch(previous => previous + 1)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  // Leaving the Boxes tab puts an opened box away: coming back shows the list, not the box that was open.
  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      logDiagnostic('tab.blur', { tab: 'catalogue' })

      if (LEAVE_TAB_CLOSES_PHASES.includes(openingRef.current.phase)) {
        openingRef.current.handleBackPress()
      }
    })

    return () => {
      unsubscribeBlur()
    }
  }, [navigation])

  // While a prize is shown the tab bar is not needed: Done leads back to the list.
  const isTabBarHidden = opening.phase === EOpeningPhase.Revealed

  useEffect(() => {
    navigation.setParams({ isTabBarHidden })
  }, [navigation, isTabBarHidden])

  useEffect(() => {
    if (!IS_AUTO_SCROLL || !viewport || cards.length === 0) {
      return
    }

    // Triangle wave between the top and the bottom of the list: a steady, repeatable scroll workload.
    const maximumOffset = LIST_TOP_PADDING + cards.length * CARD_HEIGHT - viewport.height
    const startedAt = Date.now()
    const autoScrollTimer = setInterval(() => {
      const phase = ((Date.now() - startedAt) / AUTO_SCROLL_SWEEP_MILLISECONDS) % 1
      const wave = phase < 0.5 ? phase * 2 : 2 - phase * 2

      listRef.current?.scrollToOffset({ offset: wave * maximumOffset, animated: false })
    }, AUTO_SCROLL_TICK_MILLISECONDS)

    return () => {
      clearInterval(autoScrollTimer)
    }
  }, [viewport, cards.length])

  // The scene is ready when the model has been loaded, every box has popped in and the picture has settled. The wait is capped, so
  // that a model that fails to load does not keep the loader up forever.
  useEffect(() => {
    if (isSceneReady || cards.length === 0) {
      return undefined
    }

    const entranceMilliseconds = (cards.length - 1) * ENTRANCE_STAGGER_MILLISECONDS + ENTRANCE_DURATION_MILLISECONDS
    const readyTimer = isModelLoaded
      ? setTimeout(() => {
          logDiagnostic('scene.ready', { isTimedOut: false })

          setIsSceneReady(true)
        }, entranceMilliseconds + SCENE_READY_SETTLE_MILLISECONDS)
      : undefined
    const timeoutTimer = setTimeout(() => {
      logDiagnostic('scene.ready', { isTimedOut: true })

      setIsSceneReady(true)
    }, SCENE_READY_TIMEOUT_MILLISECONDS)

    return () => {
      clearTimeout(readyTimer)

      clearTimeout(timeoutTimer)
    }
  }, [isSceneReady, isModelLoaded, cards.length])

  return {
    titleText: t('catalogue.title'),
    balanceLabelText: t('catalogue.balanceLabel'),
    balanceInCents,
    loadingText: t('catalogue.loading'),
    errorText: t('catalogue.error'),
    retryLabelText: t('catalogue.retry'),
    resetBalanceLabelText: t('catalogue.resetBalance'),
    isLoadingBoxes,
    isSceneReady,
    sceneEpoch,
    isErrorBoxes,
    cards,
    viewport,
    listRef,
    sceneCardLooks,
    scrollViewTag,
    opening,
    isPerformanceOverlayVisible: IS_PERFORMANCE_OVERLAY_VISIBLE,
    handleFrameStats,
    handleScrollSourceChange,
    handleModelLoaded,
    renderFrameStats,
    isRenderPaused,
    handleListLayout,
    handleScroll,
    handleRetryPress,
    handleResetBalancePress,
    handleCardPressIn,
    handleCardPressOut,
  }
}
