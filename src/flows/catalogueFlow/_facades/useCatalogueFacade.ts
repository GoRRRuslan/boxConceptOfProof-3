import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { FlashListRef } from '@shopify/flash-list'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { createSynchronizable } from 'react-native-worklets'

import { CARD_HEIGHT, LIST_TOP_PADDING } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { INITIAL_PRESS_STATE, type IPressState, endPress, startPress } from '@flows/catalogueFlow/_facadesLogic/computeCardAnimation'
import { useAdapterCatalogueCards } from '@flows/catalogueFlow/_adapters/useAdapterCatalogueCards'
import { useOpeningFacade } from '@flows/openingFlow/_facades/useOpeningFacade'
import { EOpeningPhase } from '@flows/openingFlow/_types'
import type { ICatalogueCard, ICatalogueFacade, ICatalogueSceneSync, ICatalogueViewport } from '@flows/catalogueFlow/_types'
import useStore from '@models/mainStorage/_storeConfigured'
import type { EBoxIdentifier } from '@networking/api/MysteryBoxApi/_types'
import { ETabRoute, type TTabParamList } from '@navigation/_types'
import { useGetBoxesQuery } from '@networking/requests/queries/BoxQueries/useGetBoxesQuery'
import { useRenderFpsMeter } from '@services/performance/useRenderFpsMeter'

// The list counts as "scrolling" until this long after its last scroll event (covers the fling).
const SCROLL_IDLE_MILLISECONDS = 250
const PRESS_RELEASE_RENDER_MILLISECONDS = 350
// Measurement builds show the live frame-rate overlay: EXPO_PUBLIC_SHOW_PERFORMANCE=1
const IS_PERFORMANCE_OVERLAY_VISIBLE = process.env.EXPO_PUBLIC_SHOW_PERFORMANCE === '1'
// Measurement builds can scroll the list up and down by themselves: EXPO_PUBLIC_AUTO_SCROLL=1
const IS_AUTO_SCROLL = process.env.EXPO_PUBLIC_AUTO_SCROLL === '1'
const AUTO_SCROLL_SWEEP_MILLISECONDS = 2400
const AUTO_SCROLL_TICK_MILLISECONDS = 16
const PERFORMANCE_SCENARIO_LABEL = IS_AUTO_SCROLL ? 'catalogue-scroll' : 'catalogue'

export const useCatalogueFacade = (): ICatalogueFacade => {
  const { t } = useTranslation()

  // ------------------------ Services ----------------------- //
  const { renderCallback, renderFrameStats, isRenderPaused } = useRenderFpsMeter(PERFORMANCE_SCENARIO_LABEL)

  // ------------------------ Navigation ----------------------- //
  const navigation = useNavigation<BottomTabNavigationProp<TTabParamList, ETabRoute.Catalogue>>()

  // --------------------------- State ------------------------- //
  const [viewport, setViewport] = useState<ICatalogueViewport | null>(null)
  const [isScrolling, setIsScrolling] = useState<boolean>(false)
  // A finger is on a card (or just left it): the squeeze animation needs frames.
  const [isPressing, setIsPressing] = useState<boolean>(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const listRef = useRef<FlashListRef<ICatalogueCard> | null>(null)
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // --------------------------- Store ------------------------- //
  const balanceInCents = useStore(state => state.balanceInCents)

  // ----------------------- Queries / mutations -------------------- //
  const { boxesData, boxesRefetch, isLoadingBoxes, isErrorBoxes } = useGetBoxesQuery()

  // -------------------------- Adapter ------------------------- //
  const cards = useAdapterCatalogueCards({ boxesData, balanceInCents })

  // ------------------------- Opening -------------------------- //
  const opening = useOpeningFacade({ boxesData, cards })

  // -------------------------- Values ------------------------- //
  // Shared with the 3D scene: written on every scroll event, read on every rendered frame.
  const scrollOffset = useMemo(() => createSynchronizable(0), [])
  const isRenderContinuous =
    isScrolling ||
    isPressing ||
    opening.isDragging ||
    [EOpeningPhase.Inspecting, EOpeningPhase.Purchasing, EOpeningPhase.Ready, EOpeningPhase.Opening].includes(opening.phase) ||
    // Revealed stays continuous (the light inside the box pulses) until the box has been put away.
    (opening.phase === EOpeningPhase.Revealed && !opening.isBoxPutAway)
  const pressState = useMemo(() => createSynchronizable<IPressState>(INITIAL_PRESS_STATE), [])
  const sceneSync: ICatalogueSceneSync = useMemo(
    () => ({
      scrollOffset,
      openingScene: opening.sceneState,
      dragState: opening.dragState,
      tilt: opening.tilt,
      pressState,
    }),
    [scrollOffset, opening.sceneState, opening.dragState, opening.tilt, pressState],
  )

  // ------------------- Handlers -------------------------- //
  const handleListLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout

    setViewport(previous => (previous?.width === width && previous.height === height ? previous : { width, height }))
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.setBlocking(event.nativeEvent.contentOffset.y)

    setIsScrolling(true)

    clearTimeout(scrollIdleTimer.current)

    scrollIdleTimer.current = setTimeout(() => {
      setIsScrolling(false)
    }, SCROLL_IDLE_MILLISECONDS)
  }

  const handleRetryPress = () => {
    void boxesRefetch()
  }

  // The box under the finger is squeezed a little until the finger lifts.
  const handleCardPressIn = (boxIdentifier: EBoxIdentifier) => {
    const cardIndex = cards.findIndex(card => card.identifier === boxIdentifier)

    pressState.setBlocking(startPress(pressState.getBlocking(), cardIndex, Date.now()))

    clearTimeout(pressTimer.current)

    setIsPressing(true)
  }

  const handleCardPressOut = () => {
    pressState.setBlocking(endPress(pressState.getBlocking(), Date.now()))

    // Keep drawing until the box has bounced back.
    clearTimeout(pressTimer.current)

    pressTimer.current = setTimeout(() => {
      setIsPressing(false)
    }, PRESS_RELEASE_RENDER_MILLISECONDS)
  }

  // ------------------- Side effects ----------------------- //
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

  useEffect(
    () => () => {
      clearTimeout(scrollIdleTimer.current)

      clearTimeout(pressTimer.current)
    },
    [],
  )

  return {
    titleText: t('catalogue.title'),
    balanceLabelText: t('catalogue.balanceLabel'),
    balanceInCents,
    loadingText: t('catalogue.loading'),
    errorText: t('catalogue.error'),
    retryLabelText: t('catalogue.retry'),
    isLoadingBoxes,
    isErrorBoxes,
    cards,
    viewport,
    listRef,
    sceneSync,
    opening,
    phaseKey: opening.phase,
    isRenderContinuous,
    isPerformanceOverlayVisible: IS_PERFORMANCE_OVERLAY_VISIBLE,
    renderCallback,
    renderFrameStats,
    isRenderPaused,
    handleListLayout,
    handleScroll,
    handleRetryPress,
    handleCardPressIn,
    handleCardPressOut,
  }
}
