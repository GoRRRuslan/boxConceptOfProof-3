import { ENTRANCE_MAXIMUM_STAGGERED_CARDS, ENTRANCE_STAGGER_MILLISECONDS } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'

// How long the texts of the card at `cardIndex` wait before they appear: one stagger step per card, up to a limit,
// so a long list does not make the last cards wait for seconds.
export const getCardEntranceDelay = (cardIndex: number): number =>
  Math.min(Math.max(cardIndex, 0), ENTRANCE_MAXIMUM_STAGGERED_CARDS) * ENTRANCE_STAGGER_MILLISECONDS
