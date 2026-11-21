import type { TFunction } from 'i18next'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLongPressGesture, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler'

import type { ICatalogueCard } from '@flows/catalogueFlow/_types'
import {
  ANTICIPATION_DURATION_MILLISECONDS,
  ANTICIPATION_HAPTIC_PULSES_MILLISECONDS,
  FOCUS_DURATION_MILLISECONDS,
  HOLD_TO_OPEN_MILLISECONDS,
  LID_OPEN_DURATION_MILLISECONDS,
  OPEN_SWIPE_DISTANCE,
  TUCK_DELAY_MILLISECONDS,
  TUCK_DURATION_MILLISECONDS,
} from '@flows/openingFlow/_config/openingConfig'
import { RARITY_LEVELS, RARITY_STYLES } from '@flows/openingFlow/_config/rarityConfig'
import { useFacadeDeviceTilt } from '@flows/openingFlow/_facades/useFacadeDeviceTilt'
import { getPrimaryActionForPhase } from '@flows/openingFlow/_facadesLogic/getPrimaryActionForPhase'
import { getWatchRarity } from '@flows/openingFlow/_facadesLogic/getWatchRarity'
import { transitionOpeningPhase } from '@flows/openingFlow/_facadesLogic/openingPhaseMachine'
import {
  EOpeningEvent,
  EOpeningPhase,
  EOpeningPrimaryAction,
  EWatchRarity,
  type IOpeningFacade,
  type IOpeningPrimaryButton,
  type IOpeningReveal,
} from '@flows/openingFlow/_types'
import { MysteryScene } from '@mysteryScene'
import useStore from '@models/mainStorage/_storeConfigured'
import type { EBoxIdentifier, EPurchaseErrorCode, IGetBoxesResponse, IWatch } from '@networking/api/MysteryBoxApi/_types'
import { EBoxPurchaseResultStatus } from '@networking/requests/mutations/PurchaseMutations/_logic/runBoxPurchase'
import { usePostPurchaseBoxMutation } from '@networking/requests/mutations/PurchaseMutations/usePostPurchaseBoxMutation'
import { hapticFeedback } from '@services/haptics/hapticFeedback'
import { ESoundEffect, soundEffects } from '@services/sounds/soundEffects'
import { createTiltCell } from '@services/tiltCell/createTiltCell'
import { formatCurrency } from '@utils/formatCurrency'
import { WATCH_IMAGE_SOURCES } from '@utils/watchImageSources'

interface IUseOpeningFacadeParams {
  boxesData: IGetBoxesResponse | undefined
  cards: ICatalogueCard[]
}

// When the sounds are prepared: after the entrance of the boxes, before anyone has tapped anything.
const SOUND_PREPARE_DELAY_MILLISECONDS = 2500

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
  // The opened box has been put away after the reveal: nothing moves in the 3D scene any more.
  const [isBoxPutAway, setIsBoxPutAway] = useState<boolean>(false)
  const isPurchaseInFlight = useRef<boolean>(false)
  const openingTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  // After leaving, the box needs a moment to fly back before another one may be selected.
  const selectionLockedUntilMilliseconds = useRef<number>(0)

  // --------------------------- Store ------------------------- //
  const balanceInCents = useStore(state => state.balanceInCents)

  // ----------------------- Queries / mutations -------------------- //
  const { mutatePurchaseBoxAsync } = usePostPurchaseBoxMutation()

  // -------------------------- Values ------------------------- //
  // Device tilt for the JavaScript side (the watch of the reveal); the native scene gets the same tilt.
  const tilt = useMemo(() => createTiltCell<[number, number]>([0, 0]), [])
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

    MysteryScene.focus(cardIndex)

    dispatchEvent(EOpeningEvent.BoxSelected)

    void hapticFeedback.selection()

    soundEffects.play(ESoundEffect.Select)
  }

  const handleBuyPress = async () => {
    // One purchase at a time: a second press (a double tap, a press right after coming back to the app) must not buy again.
    if (phase !== EOpeningPhase.Inspecting || !selectedBox || isPurchaseInFlight.current) {
      return
    }

    isPurchaseInFlight.current = true

    setErrorCode(null)

    dispatchEvent(EOpeningEvent.PurchasePressed)

    let result: Awaited<ReturnType<typeof mutatePurchaseBoxAsync>>

    try {
      result = await mutatePurchaseBoxAsync(selectedBox)
    } finally {
      isPurchaseInFlight.current = false
    }

    if (result.status === EBoxPurchaseResultStatus.Success) {
      const { watch } = result.response

      setRevealedWatch(watch)

      // The light inside the box will glow in the colour of the prize.
      const purchasedRarity = getWatchRarity(watch.valueInCents)
      const [red, green, blue] = RARITY_STYLES[purchasedRarity].glowColorLinear

      MysteryScene.setGlowColor(red, green, blue, RARITY_LEVELS[purchasedRarity])

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

    // The native scene lets the box glide back to its base pose first, so an opened box always reads the same.
    MysteryScene.openLid()

    dispatchEvent(EOpeningEvent.OpenPressed)

    void hapticFeedback.anticipation()

    soundEffects.play(ESoundEffect.Anticipation)

    // The pulses get denser and harder as the box charges.
    openingTimers.current.push(
      ...ANTICIPATION_HAPTIC_PULSES_MILLISECONDS.map((pulseDelay, pulseIndex) =>
        setTimeout(() => {
          void hapticFeedback.anticipationPulse(pulseIndex / (ANTICIPATION_HAPTIC_PULSES_MILLISECONDS.length - 1))
        }, pulseDelay)),
    )

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
        MysteryScene.tuck()
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

    MysteryScene.closeBox()

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

  // Turn with one finger; the native scene keeps the box turning after release (inertia). On a bought box
  // a swipe up opens it instead of tilting it.
  const panGesture = usePanGesture({
    runOnJS: true,
    enabled: isGestureEnabled,
    onUpdate: event => {
      // Vertical drag is inverted on purpose: the finger moving up turns the top of the box up (and down turns it down).
      MysteryScene.dragBy(event.changeX, phase === EOpeningPhase.Ready ? 0 : -event.changeY)
    },
    onDeactivate: event => {
      MysteryScene.dragEnd(event.velocityX, phase === EOpeningPhase.Ready ? 0 : -event.velocityY)

      if (phase === EOpeningPhase.Ready && event.translationY < -OPEN_SWIPE_DISTANCE) {
        handleOpenPress()
      }
    },
  })

  // Pinch to zoom.
  const pinchGesture = usePinchGesture({
    runOnJS: true,
    enabled: isGestureEnabled,
    onUpdate: event => {
      MysteryScene.pinch(event.scaleChange)
    },
  })

  // Double tap: everything glides back to the default view.
  const doubleTapGesture = useTapGesture({
    runOnJS: true,
    enabled: isGestureEnabled,
    numberOfTaps: 2,
    onActivate: () => {
      MysteryScene.resetView()
    },
  })

  // Hold a finger on a bought box: it charges and opens.
  const holdGesture = useLongPressGesture({
    runOnJS: true,
    enabled: phase === EOpeningPhase.Ready,
    minDuration: HOLD_TO_OPEN_MILLISECONDS,
    onActivate: () => {
      handleOpenPress()
    },
  })

  const gesture = useSimultaneousGestures(panGesture, pinchGesture, doubleTapGesture, holdGesture)

  // ------------------- Side effects ----------------------- //
  useFacadeDeviceTilt({ isActive: phase !== EOpeningPhase.Browsing, tilt })

  useEffect(
    () => () => {
      openingTimers.current.forEach(clearTimeout)
    },
    [],
  )

  // The audio session and the players are created while the app is idle after the start, not on the first sound (a stall of about a second).
  useEffect(() => {
    const prepareTimer = setTimeout(soundEffects.prepare, SOUND_PREPARE_DELAY_MILLISECONDS)

    return () => {
      clearTimeout(prepareTimer)
    }
  }, [])

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
