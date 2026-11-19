import type { TFunction } from 'i18next'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler'
import { createSynchronizable } from 'react-native-worklets'

import type { ICatalogueCard } from '@flows/catalogueFlow/_types'
import {
  ANTICIPATION_DURATION_MILLISECONDS,
  DRAG_INERTIA_MAXIMUM_MILLISECONDS,
  DRAG_RADIANS_PER_PIXEL,
  FOCUS_DURATION_MILLISECONDS,
  LID_OPEN_DURATION_MILLISECONDS,
  OPEN_SWIPE_DISTANCE,
  TUCK_DELAY_MILLISECONDS,
  TUCK_DURATION_MILLISECONDS,
} from '@flows/openingFlow/_config/openingConfig'
import { RARITY_STYLES } from '@flows/openingFlow/_config/rarityConfig'
import { useFacadeDeviceTilt } from '@flows/openingFlow/_facades/useFacadeDeviceTilt'
import { getPrimaryActionForPhase } from '@flows/openingFlow/_facadesLogic/getPrimaryActionForPhase'
import { getWatchRarity } from '@flows/openingFlow/_facadesLogic/getWatchRarity'
import {
  INITIAL_OPENING_SCENE_STATE,
  setGlowColor,
  startClose,
  startFocus,
  startLidOpen,
  startTuck,
} from '@flows/openingFlow/_facadesLogic/openingSceneState'
import { transitionOpeningPhase } from '@flows/openingFlow/_facadesLogic/openingPhaseMachine'
import {
  INITIAL_DRAG_STATE,
  applyDragMovement,
  applyZoom,
  releaseDrag,
  requestReset,
} from '@flows/openingFlow/_facadesLogic/stepDragInertia'
import {
  EOpeningEvent,
  EOpeningPhase,
  EOpeningPrimaryAction,
  EWatchRarity,
  type IDragState,
  type IOpeningFacade,
  type IOpeningPrimaryButton,
  type IOpeningReveal,
  type IOpeningSceneState,
} from '@flows/openingFlow/_types'
import useStore from '@models/mainStorage/_storeConfigured'
import type { EBoxIdentifier, EPurchaseErrorCode, IGetBoxesResponse, IWatch } from '@networking/api/MysteryBoxApi/_types'
import { EBoxPurchaseResultStatus } from '@networking/requests/mutations/PurchaseMutations/_logic/runBoxPurchase'
import { usePostPurchaseBoxMutation } from '@networking/requests/mutations/PurchaseMutations/usePostPurchaseBoxMutation'
import { hapticFeedback } from '@services/haptics/hapticFeedback'
import { ESoundEffect, soundEffects } from '@services/sounds/soundEffects'
import { formatCurrency } from '@utils/formatCurrency'
import { WATCH_IMAGE_SOURCES } from '@utils/watchImageSources'

interface IUseOpeningFacadeParams {
  boxesData: IGetBoxesResponse | undefined
  cards: ICatalogueCard[]
}

const INTERACTIVE_PHASES = [EOpeningPhase.Inspecting, EOpeningPhase.Ready, EOpeningPhase.Revealed]

const REVEAL_SOUNDS: Record<EWatchRarity, ESoundEffect> = {
  [EWatchRarity.Common]: ESoundEffect.RevealCommon,
  [EWatchRarity.Rare]: ESoundEffect.RevealRare,
  [EWatchRarity.Epic]: ESoundEffect.RevealRare,
  [EWatchRarity.Legendary]: ESoundEffect.RevealLegendary,
}

// Opening experience of one box on top of the catalogue: select -> inspect -> buy -> open -> reveal.
export const useOpeningFacade = ({ boxesData, cards }: IUseOpeningFacadeParams): IOpeningFacade => {
  const { t } = useTranslation()

  // --------------------------- State ------------------------- //
  const [phase, dispatchEvent] = useReducer(transitionOpeningPhase, EOpeningPhase.Browsing)
  const [selectedBoxIdentifier, setSelectedBoxIdentifier] = useState<EBoxIdentifier | null>(null)
  const [revealedWatch, setRevealedWatch] = useState<IWatch | null>(null)
  const [errorCode, setErrorCode] = useState<EPurchaseErrorCode | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  // After the finger lifts the box keeps turning (inertia): the renderer must keep drawing meanwhile.
  const [isInertiaRunning, setIsInertiaRunning] = useState<boolean>(false)
  // The opened box has been put away after the reveal: nothing moves in the 3D scene any more.
  const [isBoxPutAway, setIsBoxPutAway] = useState<boolean>(false)
  const inertiaTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // The finger really started a drag (not just a tap): only then the box has inertia to play out.
  const hasDragActivated = useRef<boolean>(false)
  const openingTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  // After leaving, the box needs a moment to fly back before another one may be selected.
  const selectionLockedUntilMilliseconds = useRef<number>(0)

  // --------------------------- Store ------------------------- //
  const balanceInCents = useStore(state => state.balanceInCents)

  // ----------------------- Queries / mutations -------------------- //
  const { mutatePurchaseBoxAsync } = usePostPurchaseBoxMutation()

  // -------------------------- Values ------------------------- //
  // Shared with the 3D scene, which reads them on every frame.
  const sceneState = useMemo(() => createSynchronizable<IOpeningSceneState>(INITIAL_OPENING_SCENE_STATE), [])
  const dragState = useMemo(() => createSynchronizable<IDragState>(INITIAL_DRAG_STATE), [])
  const tilt = useMemo(() => createSynchronizable<[number, number]>([0, 0]), [])
  const selectedBox = useMemo(
    () => boxesData?.boxes.find(box => box.identifier === selectedBoxIdentifier),
    [boxesData, selectedBoxIdentifier],
  )
  const isAffordable = selectedBox ? balanceInCents >= selectedBox.priceInCents : false
  // After the reveal the prize has the stage alone: Done appears once the opened box has been put away.
  const primaryActionState = phase === EOpeningPhase.Revealed && !isBoxPutAway ? null : getPrimaryActionForPhase(phase, isAffordable)

  // ------------------- Handlers -------------------------- //
  // The timers of an opening (sounds, reveal, putting the box away) must never outlive it: after Done or a new
  // selection a late timer would shrink the box that is flying home, or the next one.
  const clearOpeningTimers = () => {
    openingTimers.current.forEach(clearTimeout)

    openingTimers.current = []

    setIsBoxPutAway(false)
  }

  const handleCardPress = (boxIdentifier: EBoxIdentifier) => {
    const cardIndex = cards.findIndex(card => card.identifier === boxIdentifier)

    if (phase !== EOpeningPhase.Browsing || cardIndex < 0 || Date.now() < selectionLockedUntilMilliseconds.current) {
      return
    }

    clearOpeningTimers()

    setSelectedBoxIdentifier(boxIdentifier)

    setRevealedWatch(null)

    setErrorCode(null)

    dragState.setBlocking({ ...INITIAL_DRAG_STATE, lastInteractionAtMilliseconds: Date.now() })

    sceneState.setBlocking(startFocus(sceneState.getBlocking(), cardIndex, Date.now()))

    dispatchEvent(EOpeningEvent.BoxSelected)

    void hapticFeedback.selection()

    soundEffects.play(ESoundEffect.Select)
  }

  const handleBuyPress = async () => {
    if (phase !== EOpeningPhase.Inspecting || !selectedBox) {
      return
    }

    setErrorCode(null)

    dispatchEvent(EOpeningEvent.PurchasePressed)

    const result = await mutatePurchaseBoxAsync(selectedBox)

    if (result.status === EBoxPurchaseResultStatus.Success) {
      const { watch } = result.response

      setRevealedWatch(watch)

      // The light inside the box will glow in the colour of the prize.
      sceneState.setBlocking(setGlowColor(sceneState.getBlocking(), RARITY_STYLES[getWatchRarity(watch.valueInCents)].glowColorLinear))

      dispatchEvent(EOpeningEvent.PurchaseSucceeded)

      void hapticFeedback.success()

      soundEffects.play(ESoundEffect.Purchase)
    } else if (result.status === EBoxPurchaseResultStatus.Failed) {
      setErrorCode(result.errorCode)

      dispatchEvent(EOpeningEvent.PurchaseFailed)

      void hapticFeedback.error()

      soundEffects.play(ESoundEffect.Error)
    }
  }

  // Open: the box shakes and swells (anticipation), then the lid swings open, then the watch is revealed.
  const handleOpenPress = () => {
    if (phase !== EOpeningPhase.Ready) {
      return
    }

    sceneState.setBlocking(startLidOpen(sceneState.getBlocking(), Date.now()))

    // Whatever angle the box was turned to, it glides back to the base pose so the opened box always reads the same.
    dragState.setBlocking(requestReset(dragState.getBlocking(), Date.now()))

    dispatchEvent(EOpeningEvent.OpenPressed)

    void hapticFeedback.anticipation()

    soundEffects.play(ESoundEffect.Anticipation)

    openingTimers.current.push(
      setTimeout(() => {
        void hapticFeedback.lidOpening()

        soundEffects.play(ESoundEffect.LidOpen)
      }, ANTICIPATION_DURATION_MILLISECONDS),
      setTimeout(() => {
        dispatchEvent(EOpeningEvent.LidOpened)

        if (revealedWatch) {
          const rarity = getWatchRarity(revealedWatch.valueInCents)

          soundEffects.play(REVEAL_SOUNDS[rarity])

          hapticFeedback.rarityReveal(RARITY_STYLES[rarity].hapticImpactCount)
        }
      }, ANTICIPATION_DURATION_MILLISECONDS + LID_OPEN_DURATION_MILLISECONDS),
      setTimeout(() => {
        sceneState.setBlocking(startTuck(sceneState.getBlocking(), Date.now()))
      }, ANTICIPATION_DURATION_MILLISECONDS + LID_OPEN_DURATION_MILLISECONDS + TUCK_DELAY_MILLISECONDS),
      setTimeout(() => {
        setIsBoxPutAway(true)
      }, ANTICIPATION_DURATION_MILLISECONDS + LID_OPEN_DURATION_MILLISECONDS + TUCK_DELAY_MILLISECONDS + TUCK_DURATION_MILLISECONDS),
    )
  }

  const handleBackPress = () => {
    if (!INTERACTIVE_PHASES.includes(phase)) {
      return
    }

    selectionLockedUntilMilliseconds.current = Date.now() + FOCUS_DURATION_MILLISECONDS

    clearOpeningTimers()

    sceneState.setBlocking(startClose(sceneState.getBlocking(), Date.now()))

    setErrorCode(null)

    dispatchEvent(EOpeningEvent.ClosePressed)
  }

  const handlePrimaryPress = (action: EOpeningPrimaryAction) => {
    if (action === EOpeningPrimaryAction.Buy) {
      void handleBuyPress()
    } else if (action === EOpeningPrimaryAction.Open) {
      handleOpenPress()
    } else {
      handleBackPress()
    }
  }

  // ------------------- Gestures ------------------------- //
  const isGestureEnabled = INTERACTIVE_PHASES.includes(phase)

  // Turn with one finger; the box keeps turning after release (inertia, see the scene). On a bought box
  // a swipe up opens it instead of tilting it.
  const panGesture = usePanGesture({
    runOnJS: true,
    enabled: isGestureEnabled,
    onActivate: () => {
      hasDragActivated.current = true

      clearTimeout(inertiaTimer.current)

      setIsInertiaRunning(false)

      setIsDragging(true)
    },
    onUpdate: event => {
      dragState.setBlocking(
        applyDragMovement(
          dragState.getBlocking(),
          event.changeX,
          phase === EOpeningPhase.Ready ? 0 : event.changeY,
          DRAG_RADIANS_PER_PIXEL,
          Date.now(),
        ),
      )
    },
    onDeactivate: event => {
      dragState.setBlocking(
        releaseDrag(
          dragState.getBlocking(),
          event.velocityX * DRAG_RADIANS_PER_PIXEL,
          phase === EOpeningPhase.Ready ? 0 : event.velocityY * DRAG_RADIANS_PER_PIXEL,
          Date.now(),
        ),
      )

      if (phase === EOpeningPhase.Ready && event.translationY < -OPEN_SWIPE_DISTANCE) {
        handleOpenPress()
      }
    },
    onFinalize: () => {
      if (!hasDragActivated.current) {
        return
      }

      hasDragActivated.current = false

      dragState.setBlocking({ ...dragState.getBlocking(), isDragging: false })

      setIsDragging(false)

      setIsInertiaRunning(true)

      inertiaTimer.current = setTimeout(() => {
        setIsInertiaRunning(false)
      }, DRAG_INERTIA_MAXIMUM_MILLISECONDS)
    },
  })

  // Pinch to zoom.
  const pinchGesture = usePinchGesture({
    runOnJS: true,
    enabled: isGestureEnabled,
    onUpdate: event => {
      dragState.setBlocking(applyZoom(dragState.getBlocking(), event.scaleChange, Date.now()))
    },
  })

  // Double tap: everything glides back to the default view.
  const doubleTapGesture = useTapGesture({
    runOnJS: true,
    enabled: isGestureEnabled,
    numberOfTaps: 2,
    onActivate: () => {
      dragState.setBlocking(requestReset(dragState.getBlocking(), Date.now()))

      setIsInertiaRunning(true)

      clearTimeout(inertiaTimer.current)

      inertiaTimer.current = setTimeout(() => {
        setIsInertiaRunning(false)
      }, DRAG_INERTIA_MAXIMUM_MILLISECONDS)
    },
  })

  const gesture = useSimultaneousGestures(panGesture, pinchGesture, doubleTapGesture)

  // ------------------- Side effects ----------------------- //
  useFacadeDeviceTilt({ isActive: phase !== EOpeningPhase.Browsing, tilt })

  useEffect(
    () => () => {
      openingTimers.current.forEach(clearTimeout)

      clearTimeout(inertiaTimer.current)
    },
    [],
  )

  // ------------------------ View data ------------------------ //
  const primaryButton: IOpeningPrimaryButton | null = primaryActionState
    ? {
        labelText: getPrimaryLabelText(t, primaryActionState.action, phase, selectedBox ? formatCurrency(selectedBox.priceInCents) : ''),
        isDisabled: primaryActionState.isDisabled,
        testID: `${primaryActionState.action}Button`,
        onPress: () => {
          handlePrimaryPress(primaryActionState.action)
        },
      }
    : null

  const reveal: IOpeningReveal | null =
    phase === EOpeningPhase.Revealed && revealedWatch ? buildReveal(t, revealedWatch) : null

  return {
    phase,
    isOverlayVisible: phase !== EOpeningPhase.Browsing,
    isListHidden: phase !== EOpeningPhase.Browsing,
    isDragging: isDragging || isInertiaRunning || phase === EOpeningPhase.Opening,
    isBoxPutAway,
    boxNameText: selectedBox?.name ?? '',
    priceText: selectedBox ? formatCurrency(selectedBox.priceInCents) : '',
    hintText: getHintText(t, phase, isAffordable),
    errorText: errorCode ? t(`opening.errors.${errorCode}`) : null,
    backLabelText: t('opening.back'),
    isBackVisible: phase === EOpeningPhase.Inspecting || phase === EOpeningPhase.Ready,
    primaryButton,
    reveal,
    gesture,
    tilt,
    sceneState,
    dragState,
    handleCardPress,
    handleBackPress,
  }
}

const buildReveal = (t: TFunction, watch: IWatch): IOpeningReveal => {
  const rarity = getWatchRarity(watch.valueInCents)
  const style = RARITY_STYLES[rarity]

  return {
    titleText: t('opening.revealTitle'),
    nameText: watch.name,
    brandText: watch.brand,
    valueText: t('opening.watchValue', { amount: formatCurrency(watch.valueInCents) }),
    imageSource: WATCH_IMAGE_SOURCES[watch.identifier],
    rarity,
    rarityLabelText: t(`opening.rarity.${rarity}`),
    rarityColorHex: style.colorHex,
    flashOpacity: style.flashOpacity,
    particleCount: style.particleCount,
  }
}

const getPrimaryLabelText = (t: TFunction, action: EOpeningPrimaryAction, phase: EOpeningPhase, priceText: string): string => {
  if (action === EOpeningPrimaryAction.Buy) {
    return phase === EOpeningPhase.Purchasing ? t('opening.buying') : t('opening.buy', { price: priceText })
  }

  if (action === EOpeningPrimaryAction.Open) {
    return phase === EOpeningPhase.Opening ? t('opening.opening') : t('opening.open')
  }

  return t('opening.done')
}

const getHintText = (t: TFunction, phase: EOpeningPhase, isAffordable: boolean): string => {
  if (phase === EOpeningPhase.Inspecting) {
    return isAffordable ? t('opening.hintInspect') : t('catalogue.notEnoughBalance')
  }

  if (phase === EOpeningPhase.Ready) {
    return t('opening.hintReady')
  }

  return phase === EOpeningPhase.Opening ? t('opening.hintOpening') : ''
}
