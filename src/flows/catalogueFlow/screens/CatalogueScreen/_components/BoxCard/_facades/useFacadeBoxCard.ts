import { CARD_TEXT_ENTRANCE_DURATION_MILLISECONDS } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { getCardEntranceDelay } from '@flows/catalogueFlow/_facadesLogic/getCardEntranceDelay'
import { useEntranceAnimation } from '@services/animation/useEntranceAnimation'

// The texts of a card fade in one card after the other (the 3D boxes pop in on their own, see the scene).
export const useFacadeBoxCard = (cardIndex: number) => {
  const { animatedStyle } = useEntranceAnimation({
    delayMilliseconds: getCardEntranceDelay(cardIndex),
    durationMilliseconds: CARD_TEXT_ENTRANCE_DURATION_MILLISECONDS,
  })

  return { animatedStyle }
}
