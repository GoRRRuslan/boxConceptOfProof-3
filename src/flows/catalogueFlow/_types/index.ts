import type { FlashListRef } from '@shopify/flash-list'
import type { RefObject } from 'react'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

import type { IOpeningFacade } from '@flows/openingFlow/_types'
import type { IMysterySceneCardLook, IMysterySceneFrameStatsEvent, IMysterySceneScrollSourceEvent } from '@mysteryScene'
import type { EBoxIdentifier } from '@networking/api/MysteryBoxApi/_types'
import type { IRenderFrameStats } from '@services/performance/summarizeFrameDeltas'

// Linear RGBA, each channel 0..1.
export type TColorRgba = [number, number, number, number]

export interface IBoxFinish {
  roughness: number
  metallic: number
  clearCoat: number
}

export interface ICatalogueCard {
  identifier: EBoxIdentifier
  name: string
  priceText: string
  prizeText: string
  // Shown only when the balance is too low for this box; null otherwise.
  affordabilityText: string | null
  isAffordable: boolean
  colorLinearRgba: TColorRgba
  finish: IBoxFinish
}

export interface ICatalogueViewport {
  width: number
  height: number
}

export interface ICatalogueFacade {
  titleText: string
  balanceLabelText: string
  balanceInCents: number
  loadingText: string
  errorText: string
  retryLabelText: string
  isLoadingBoxes: boolean
  // False until the 3D scene is ready to be shown: the loader stays up until then, the list is hidden.
  isSceneReady: boolean
  // Changes when the 3D scene has to be built anew (back from the background).
  sceneEpoch: number
  isErrorBoxes: boolean
  cards: ICatalogueCard[]
  viewport: ICatalogueViewport | null
  listRef: RefObject<FlashListRef<ICatalogueCard> | null>
  // What the native scene needs per box (colour and finish).
  sceneCardLooks: IMysterySceneCardLook[]
  // React tag of the list's native scroll view (the scene reads its scroll position itself), null until the list exists.
  scrollViewTag: number | null
  opening: IOpeningFacade
  isPerformanceOverlayVisible: boolean
  handleFrameStats: (event: IMysterySceneFrameStatsEvent) => void
  handleScrollSourceChange: (event: IMysterySceneScrollSourceEvent) => void
  handleModelLoaded: () => void
  renderFrameStats: IRenderFrameStats | null
  isRenderPaused: boolean
  handleListLayout: (event: LayoutChangeEvent) => void
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  handleRetryPress: () => void
  handleCardPressIn: (boxIdentifier: EBoxIdentifier) => void
  handleCardPressOut: () => void
}
