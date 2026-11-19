import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { FlashListRef } from '@shopify/flash-list'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

import { CARD_HEIGHT, LIST_TOP_PADDING } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { useAdapterCatalogueCards } from '@flows/catalogueFlow/_adapters/useAdapterCatalogueCards'
import { useOpeningFacade } from '@flows/openingFlow/_facades/useOpeningFacade'
import { EOpeningPhase } from '@flows/openingFlow/_types'
import type { ICatalogueCard, ICatalogueFacade, ICatalogueViewport } from '@flows/catalogueFlow/_types'
import { type IMysterySceneScrollSourceEvent, MysteryScene } from '@mysteryScene'
import useStore from '@models/mainStorage/_storeConfigured'
import type { EBoxIdentifier } from '@networking/api/MysteryBoxApi/_types'
import { ETabRoute, type TTabParamList } from '@navigation/_types'
import { useGetBoxesQuery } from '@networking/requests/queries/BoxQueries/useGetBoxesQuery'
import { useRenderFpsMeter } from '@services/performance/useRenderFpsMeter'

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

  // --------------------------- Store ------------------------- //
  const balanceInCents = useStore(state => state.balanceInCents)

  // ----------------------- Queries / mutations -------------------- //
  const { boxesData, boxesRefetch, isLoadingBoxes, isErrorBoxes } = useGetBoxesQuery()

  // -------------------------- Adapter ------------------------- //
  const cards = useAdapterCatalogueCards({ boxesData, balanceInCents })

  // ------------------------- Opening -------------------------- //
  const opening = useOpeningFacade({ boxesData, cards })

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

  const handleScrollSourceChange = (event: IMysterySceneScrollSourceEvent) => {
    setIsNativeScroll(event.nativeEvent.source === 'native')
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
    sceneCardLooks,
    scrollViewTag,
    opening,
    isPerformanceOverlayVisible: IS_PERFORMANCE_OVERLAY_VISIBLE,
    handleFrameStats,
    handleScrollSourceChange,
    renderFrameStats,
    isRenderPaused,
    handleListLayout,
    handleScroll,
    handleRetryPress,
    handleCardPressIn,
    handleCardPressOut,
  }
}
