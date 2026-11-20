package expo.modules.mysteryscene.math

import kotlin.math.PI
import kotlin.math.sin

/** What the scene knows about the opening, as timestamps and targets (so every frame is a pure function of "now"). */
data class OpeningSceneState(
  val focusedCardIndex: Int = -1,
  val focusTarget: Double = 0.0,
  val focusFromProgress: Double = 0.0,
  val focusStartedAtMilliseconds: Double = 0.0,
  val lidTarget: Double = 0.0,
  val lidFromProgress: Double = 0.0,
  val lidStartedAtMilliseconds: Double = 0.0,
  val openStartedAtMilliseconds: Double = 0.0,
  val tuckTarget: Double = 0.0,
  val tuckFromProgress: Double = 0.0,
  val tuckStartedAtMilliseconds: Double = 0.0,
  val glowColorLinear: List<Double> = listOf(1.0, 1.0, 1.0),
  /** 0 (common) ... 3 (legendary); -1 until a prize has been bought (the box is "armed" from then on). */
  val rarityLevel: Double = -1.0,
)

fun getFocusProgress(state: OpeningSceneState, now: Double): Double = computeAnimatedProgress(
  state.focusFromProgress, state.focusTarget, state.focusStartedAtMilliseconds, now, SceneConfig.FOCUS_DURATION_MILLISECONDS,
)

fun getLidProgress(state: OpeningSceneState, now: Double): Double = computeAnimatedProgress(
  state.lidFromProgress, state.lidTarget, state.lidStartedAtMilliseconds, now,
  if (state.lidTarget == 1.0) SceneConfig.LID_OPEN_DURATION_MILLISECONDS else SceneConfig.LID_CLOSE_DURATION_MILLISECONDS,
)

fun getTuckProgress(state: OpeningSceneState, now: Double): Double = computeAnimatedProgress(
  state.tuckFromProgress, state.tuckTarget, state.tuckStartedAtMilliseconds, now,
  if (state.tuckTarget == 1.0) SceneConfig.TUCK_DURATION_MILLISECONDS else SceneConfig.LID_CLOSE_DURATION_MILLISECONDS,
)

fun getAnticipationProgress(state: OpeningSceneState, now: Double): Double {
  if (state.openStartedAtMilliseconds == 0.0 || state.lidTarget != 1.0) return 0.0
  val progress = (now - state.openStartedAtMilliseconds) / SceneConfig.ANTICIPATION_DURATION_MILLISECONDS
  return if (progress >= 1) 0.0 else clampToUnitInterval(progress)
}

fun computeGlowStrength(lidProgress: Double, now: Double): Double {
  if (lidProgress <= 0) return 0.0
  val pulse = 0.85 + 0.15 * sin((now / SceneConfig.GLOW_PULSE_PERIOD_MILLISECONDS) * 2 * PI)
  return easeOutCubic(lidProgress) * SceneConfig.GLOW_MAXIMUM * pulse
}

fun startFocus(state: OpeningSceneState, cardIndex: Int, now: Double) = state.copy(
  focusedCardIndex = cardIndex, rarityLevel = -1.0, focusTarget = 1.0, focusFromProgress = getFocusProgress(state, now), focusStartedAtMilliseconds = now,
  lidTarget = 0.0, lidFromProgress = 0.0, lidStartedAtMilliseconds = now, openStartedAtMilliseconds = 0.0,
  tuckTarget = 0.0, tuckFromProgress = 0.0, tuckStartedAtMilliseconds = now,
)

fun startClose(state: OpeningSceneState, now: Double) = state.copy(
  focusTarget = 0.0, focusFromProgress = getFocusProgress(state, now), focusStartedAtMilliseconds = now,
  lidTarget = 0.0, lidFromProgress = getLidProgress(state, now), lidStartedAtMilliseconds = now, openStartedAtMilliseconds = 0.0,
  tuckTarget = 0.0, tuckFromProgress = getTuckProgress(state, now), tuckStartedAtMilliseconds = now,
)

fun startLidOpen(state: OpeningSceneState, now: Double) = state.copy(
  lidTarget = 1.0, lidFromProgress = getLidProgress(state, now),
  lidStartedAtMilliseconds = now + SceneConfig.ANTICIPATION_DURATION_MILLISECONDS, openStartedAtMilliseconds = now,
)

fun withGlowColor(state: OpeningSceneState, glowColorLinear: List<Double>, rarityLevel: Double) =
  state.copy(glowColorLinear = glowColorLinear, rarityLevel = rarityLevel)

fun startTuck(state: OpeningSceneState, now: Double) = state.copy(
  tuckTarget = 1.0, tuckFromProgress = getTuckProgress(state, now), tuckStartedAtMilliseconds = now,
)
