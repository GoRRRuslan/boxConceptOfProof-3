import {
  ANTICIPATION_DURATION_MILLISECONDS,
  ANTICIPATION_SHAKE_PITCH_RADIANS,
  ANTICIPATION_SHAKE_YAW_RADIANS,
  ANTICIPATION_SWELL,
  FOCUS_DURATION_MILLISECONDS,
  GLOW_MAXIMUM,
  GLOW_PULSE_PERIOD_MILLISECONDS,
  LID_CLOSE_DURATION_MILLISECONDS,
  LID_OPEN_DURATION_MILLISECONDS,
  TUCK_DURATION_MILLISECONDS,
} from '@flows/openingFlow/_config/openingConfig'
import { clampToUnitInterval, computeAnimatedProgress, easeOutCubic } from '@flows/openingFlow/_facadesLogic/openingEasing'
import type { IOpeningSceneState } from '@flows/openingFlow/_types'

export const INITIAL_OPENING_SCENE_STATE: IOpeningSceneState = {
  focusedCardIndex: -1,
  focusTarget: 0,
  focusFromProgress: 0,
  focusStartedAtMilliseconds: 0,
  lidTarget: 0,
  lidFromProgress: 0,
  lidStartedAtMilliseconds: 0,
  openStartedAtMilliseconds: 0,
  tuckTarget: 0,
  tuckFromProgress: 0,
  tuckStartedAtMilliseconds: 0,
  glowColorLinear: [1, 1, 1],
}

// Linear 0..1 progress of the "box flies to the centre" animation at `nowMilliseconds`.
export const getFocusProgress = (state: IOpeningSceneState, nowMilliseconds: number): number => {
  'worklet'

  return computeAnimatedProgress({
    fromProgress: state.focusFromProgress,
    target: state.focusTarget,
    startedAtMilliseconds: state.focusStartedAtMilliseconds,
    nowMilliseconds,
    durationMilliseconds: FOCUS_DURATION_MILLISECONDS,
  })
}

// Linear 0..1 progress of the lid (0 closed, 1 fully open) at `nowMilliseconds`. A lid that is told to
// start in the future (after the anticipation) simply stays closed until then.
export const getLidProgress = (state: IOpeningSceneState, nowMilliseconds: number): number => {
  'worklet'

  return computeAnimatedProgress({
    fromProgress: state.lidFromProgress,
    target: state.lidTarget,
    startedAtMilliseconds: state.lidStartedAtMilliseconds,
    nowMilliseconds,
    durationMilliseconds: state.lidTarget === 1 ? LID_OPEN_DURATION_MILLISECONDS : LID_CLOSE_DURATION_MILLISECONDS,
  })
}

// Linear 0..1 progress of "the opened box is put away" at `nowMilliseconds`.
export const getTuckProgress = (state: IOpeningSceneState, nowMilliseconds: number): number => {
  'worklet'

  return computeAnimatedProgress({
    fromProgress: state.tuckFromProgress,
    target: state.tuckTarget,
    startedAtMilliseconds: state.tuckStartedAtMilliseconds,
    nowMilliseconds,
    // Putting the box away takes its time; bringing it back goes with the box flying home.
    durationMilliseconds: state.tuckTarget === 1 ? TUCK_DURATION_MILLISECONDS : LID_CLOSE_DURATION_MILLISECONDS,
  })
}

// 0..1 while the box shakes and swells before the lid moves; 0 at any other time.
export const getAnticipationProgress = (state: IOpeningSceneState, nowMilliseconds: number): number => {
  'worklet'

  if (state.openStartedAtMilliseconds === 0 || state.lidTarget !== 1) {
    return 0
  }

  const progress = (nowMilliseconds - state.openStartedAtMilliseconds) / ANTICIPATION_DURATION_MILLISECONDS

  return progress >= 1 ? 0 : clampToUnitInterval(progress)
}

export interface IAnticipationEffect {
  swell: number
  jitterYawRadians: number
  jitterPitchRadians: number
}

// The shake gets stronger as the anticipation builds up, and the box swells a little.
export const computeAnticipationEffect = (progress: number, nowMilliseconds: number): IAnticipationEffect => {
  'worklet'

  const buildUp = progress * progress

  return {
    swell: 1 + ANTICIPATION_SWELL * Math.sin((progress * Math.PI) / 2),
    jitterYawRadians: Math.sin(nowMilliseconds * 0.05) * ANTICIPATION_SHAKE_YAW_RADIANS * buildUp,
    jitterPitchRadians: Math.cos(nowMilliseconds * 0.07) * ANTICIPATION_SHAKE_PITCH_RADIANS * buildUp,
  }
}

// 0..GLOW_MAXIMUM: light from inside that grows while the lid opens and then softly pulses.
export const computeGlowStrength = (lidProgress: number, nowMilliseconds: number): number => {
  'worklet'

  if (lidProgress <= 0) {
    return 0
  }

  const pulse = 0.85 + 0.15 * Math.sin((nowMilliseconds / GLOW_PULSE_PERIOD_MILLISECONDS) * 2 * Math.PI)

  return easeOutCubic(lidProgress) * GLOW_MAXIMUM * pulse
}

// A box was selected: fly it to the centre. The lid starts closed.
export const startFocus = (state: IOpeningSceneState, cardIndex: number, nowMilliseconds: number): IOpeningSceneState => ({
  ...state,
  focusedCardIndex: cardIndex,
  focusTarget: 1,
  focusFromProgress: getFocusProgress(state, nowMilliseconds),
  focusStartedAtMilliseconds: nowMilliseconds,
  lidTarget: 0,
  lidFromProgress: 0,
  lidStartedAtMilliseconds: nowMilliseconds,
  openStartedAtMilliseconds: 0,
  tuckTarget: 0,
  tuckFromProgress: 0,
  tuckStartedAtMilliseconds: nowMilliseconds,
})

// Leaving: the box flies back into its card and the lid closes, both from wherever they are now.
export const startClose = (state: IOpeningSceneState, nowMilliseconds: number): IOpeningSceneState => ({
  ...state,
  focusTarget: 0,
  focusFromProgress: getFocusProgress(state, nowMilliseconds),
  focusStartedAtMilliseconds: nowMilliseconds,
  lidTarget: 0,
  lidFromProgress: getLidProgress(state, nowMilliseconds),
  lidStartedAtMilliseconds: nowMilliseconds,
  openStartedAtMilliseconds: 0,
  tuckTarget: 0,
  tuckFromProgress: getTuckProgress(state, nowMilliseconds),
  tuckStartedAtMilliseconds: nowMilliseconds,
})

// Opening: first the anticipation (shake + swell), then the lid swings open.
export const startLidOpen = (state: IOpeningSceneState, nowMilliseconds: number): IOpeningSceneState => ({
  ...state,
  lidTarget: 1,
  lidFromProgress: getLidProgress(state, nowMilliseconds),
  lidStartedAtMilliseconds: nowMilliseconds + ANTICIPATION_DURATION_MILLISECONDS,
  openStartedAtMilliseconds: nowMilliseconds,
})

export const setGlowColor = (state: IOpeningSceneState, glowColorLinear: [number, number, number]): IOpeningSceneState => ({
  ...state,
  glowColorLinear,
})

// The prize is on screen: the opened box is put away (shrinks and sinks), from wherever it is now.
export const startTuck = (state: IOpeningSceneState, nowMilliseconds: number): IOpeningSceneState => ({
  ...state,
  tuckTarget: 1,
  tuckFromProgress: getTuckProgress(state, nowMilliseconds),
  tuckStartedAtMilliseconds: nowMilliseconds,
})
