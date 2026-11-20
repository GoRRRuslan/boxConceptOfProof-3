import type { ImageSourcePropType } from 'react-native'
import type { useSimultaneousGestures } from 'react-native-gesture-handler'

import type { EBoxIdentifier } from '@networking/api/MysteryBoxApi/_types'
import type { ITiltCell } from '@services/tiltCell/createTiltCell'

export enum EOpeningPhase {
  // The list is shown, no box is selected.
  Browsing = 'browsing',
  // A box is centred; the user can turn it and decide to buy.
  Inspecting = 'inspecting',
  // The purchase request is running.
  Purchasing = 'purchasing',
  // Bought (balance deducted, watch owned); waiting for the user to open it.
  Ready = 'ready',
  // The lid is opening.
  Opening = 'opening',
  // The lid is open and the watch is shown.
  Revealed = 'revealed',
}

// Stable string of the phase, used as a cache/activity key.
export type IOpeningPhaseKey = `${EOpeningPhase}`

export enum EOpeningEvent {
  BoxSelected = 'boxSelected',
  PurchasePressed = 'purchasePressed',
  PurchaseSucceeded = 'purchaseSucceeded',
  PurchaseFailed = 'purchaseFailed',
  OpenPressed = 'openPressed',
  LidOpened = 'lidOpened',
  ClosePressed = 'closePressed',
}

// Opening state of the 3D scene as timestamps and targets. The native scene owns this state; this type is kept for the
// TypeScript reference implementation (src/services/sceneReference) that generates the parity test vectors.
export interface IOpeningSceneState {
  // Index of the card whose box is opened/centred; -1 when none.
  focusedCardIndex: number
  focusTarget: 0 | 1
  focusFromProgress: number
  focusStartedAtMilliseconds: number
  lidTarget: 0 | 1
  lidFromProgress: number
  // The lid starts moving after the anticipation; 0 while the box is not being opened.
  lidStartedAtMilliseconds: number
  openStartedAtMilliseconds: number
  // After the reveal the box is put away (shrinks and sinks) so that nothing competes with the prize; 0 = in place, 1 = put away.
  tuckTarget: 0 | 1
  tuckFromProgress: number
  tuckStartedAtMilliseconds: number
  // Colour (linear RGB) of the light inside the box once it is open; depends on the rarity of the prize.
  glowColorLinear: [number, number, number]
  // Rarity of the bought prize as 0 (common) ... 3 (legendary); -1 until a prize has been bought. Drives the size of the show and
  // tells the scene that the box is "armed" (its seams breathe).
  rarityLevel: number
}

// Rotation of the focused box by the user's finger, with inertia after release.
export interface IDragState {
  yawRadians: number
  pitchRadians: number
  yawVelocityRadiansPerSecond: number
  pitchVelocityRadiansPerSecond: number
  isDragging: boolean
  zoom: number
  // Slow turning by itself while nobody touches the box.
  autoYawRadians: number
  lastInteractionAtMilliseconds: number
  // Double tap: gliding back to the default orientation and zoom.
  isResetting: boolean
}

export interface IOpeningPose {
  isVisible: boolean
  scale: number
  yawRadians: number
  pitchRadians: number
  translateY: number
  translateZ: number
}

export enum EOpeningPrimaryAction {
  Buy = 'buy',
  Open = 'open',
  Done = 'done',
}

export interface IOpeningPrimaryButton {
  labelText: string
  isDisabled: boolean
  testID: string
  onPress: () => void
}

export interface IOpeningReveal {
  titleText: string
  nameText: string
  brandText: string
  valueText: string
  imageSource: ImageSourcePropType
  rarity: EWatchRarity
  rarityLabelText: string
  rarityColorHex: string
  // The show around the watch grows with its rarity.
  flashOpacity: number
  particleCount: number
}

export interface IOpeningFacade {
  phase: EOpeningPhase
  isOverlayVisible: boolean
  isListHidden: boolean
  // After the reveal the opened box is put away; from then on nothing moves in the scene and it may rest.
  isBoxPutAway: boolean
  boxNameText: string
  priceText: string
  hintText: string
  errorText: string | null
  backLabelText: string
  isBackVisible: boolean
  primaryButton: IOpeningPrimaryButton | null
  reveal: IOpeningReveal | null
  // Pan (turn) + pinch (zoom) + double tap (reset), all at once.
  gesture: ReturnType<typeof useSimultaneousGestures>
  // Device tilt, each axis -1..1 (the native scene gets it too; the watch of the reveal slides against it).
  tilt: ITiltCell<[number, number]>
  handleCardPress: (boxIdentifier: EBoxIdentifier) => void
  handleBackPress: () => void
}

export enum EWatchRarity {
  Common = 'common',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
}
