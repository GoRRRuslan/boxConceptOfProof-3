import {
  ENTRANCE_DURATION_MILLISECONDS,
  PRESS_DURATION_MILLISECONDS,
  PRESS_SCALE,
} from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { clampToUnitInterval, easeOutBack, easeOutCubic, interpolate } from '@flows/openingFlow/_facadesLogic/openingEasing'

// A box that has not "arrived" yet is invisible; then it grows to full size with a small overshoot.
// `elapsedMilliseconds` is the time since this card's own entrance began (it may be negative).
export const computeEntranceScale = (elapsedMilliseconds: number): number => {
  'worklet'

  if (elapsedMilliseconds <= 0) {
    return 0
  }

  return Math.max(0, easeOutBack(clampToUnitInterval(elapsedMilliseconds / ENTRANCE_DURATION_MILLISECONDS)))
}

export interface IPressState {
  cardIndex: number
  isPressed: boolean
  // The squeeze factor the card had when the finger went down / up, so a quick release does not jump.
  fromScale: number
  changedAtMilliseconds: number
}

export const INITIAL_PRESS_STATE: IPressState = {
  cardIndex: -1,
  isPressed: false,
  fromScale: 1,
  changedAtMilliseconds: 0,
}

// Current squeeze factor of the pressed card: glides to PRESS_SCALE while the finger is down and back to 1 after.
export const computePressScale = (state: IPressState, nowMilliseconds: number): number => {
  'worklet'

  const progress = easeOutCubic(clampToUnitInterval((nowMilliseconds - state.changedAtMilliseconds) / PRESS_DURATION_MILLISECONDS))

  return interpolate(state.fromScale, state.isPressed ? PRESS_SCALE : 1, progress)
}

export const startPress = (state: IPressState, cardIndex: number, nowMilliseconds: number): IPressState => ({
  cardIndex,
  isPressed: true,
  fromScale: state.cardIndex === cardIndex ? computePressScale(state, nowMilliseconds) : 1,
  changedAtMilliseconds: nowMilliseconds,
})

export const endPress = (state: IPressState, nowMilliseconds: number): IPressState => ({
  ...state,
  isPressed: false,
  fromScale: computePressScale(state, nowMilliseconds),
  changedAtMilliseconds: nowMilliseconds,
})
