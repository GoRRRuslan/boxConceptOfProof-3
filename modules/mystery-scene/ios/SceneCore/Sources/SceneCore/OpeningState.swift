import Foundation

// What the scene knows about the opening, as timestamps and targets (so every frame is a pure function of "now").
public struct OpeningSceneState: Equatable {
  public var focusedCardIndex: Int = -1
  public var focusTarget: Double = 0
  public var focusFromProgress: Double = 0
  public var focusStartedAtMilliseconds: Double = 0
  public var lidTarget: Double = 0
  public var lidFromProgress: Double = 0
  public var lidStartedAtMilliseconds: Double = 0
  public var openStartedAtMilliseconds: Double = 0
  public var tuckTarget: Double = 0
  public var tuckFromProgress: Double = 0
  public var tuckStartedAtMilliseconds: Double = 0
  public var glowColorLinear: [Double] = [1, 1, 1]

  public init() {}
}

public func getFocusProgress(_ state: OpeningSceneState, _ now: Double) -> Double {
  computeAnimatedProgress(
    fromProgress: state.focusFromProgress, target: state.focusTarget,
    startedAtMilliseconds: state.focusStartedAtMilliseconds, nowMilliseconds: now,
    durationMilliseconds: SceneConfig.focusDurationMilliseconds)
}

public func getLidProgress(_ state: OpeningSceneState, _ now: Double) -> Double {
  computeAnimatedProgress(
    fromProgress: state.lidFromProgress, target: state.lidTarget,
    startedAtMilliseconds: state.lidStartedAtMilliseconds, nowMilliseconds: now,
    durationMilliseconds: state.lidTarget == 1
      ? SceneConfig.lidOpenDurationMilliseconds : SceneConfig.lidCloseDurationMilliseconds)
}

public func getTuckProgress(_ state: OpeningSceneState, _ now: Double) -> Double {
  computeAnimatedProgress(
    fromProgress: state.tuckFromProgress, target: state.tuckTarget,
    startedAtMilliseconds: state.tuckStartedAtMilliseconds, nowMilliseconds: now,
    durationMilliseconds: state.tuckTarget == 1
      ? SceneConfig.tuckDurationMilliseconds : SceneConfig.lidCloseDurationMilliseconds)
}

public func getAnticipationProgress(_ state: OpeningSceneState, _ now: Double) -> Double {
  if state.openStartedAtMilliseconds == 0 || state.lidTarget != 1 { return 0 }
  let progress = (now - state.openStartedAtMilliseconds) / SceneConfig.anticipationDurationMilliseconds
  return progress >= 1 ? 0 : clampToUnitInterval(progress)
}

public struct AnticipationEffect: Equatable {
  public var swell: Double
  public var jitterYawRadians: Double
  public var jitterPitchRadians: Double

  public static let none = AnticipationEffect(swell: 1, jitterYawRadians: 0, jitterPitchRadians: 0)
}

public func computeAnticipationEffect(_ progress: Double, _ now: Double) -> AnticipationEffect {
  let buildUp = progress * progress
  return AnticipationEffect(
    swell: 1 + SceneConfig.anticipationSwell * sin(progress * Double.pi / 2),
    jitterYawRadians: sin(now * 0.05) * SceneConfig.anticipationShakeYawRadians * buildUp,
    jitterPitchRadians: cos(now * 0.07) * SceneConfig.anticipationShakePitchRadians * buildUp)
}

public func computeGlowStrength(_ lidProgress: Double, _ now: Double) -> Double {
  if lidProgress <= 0 { return 0 }
  let pulse = 0.85 + 0.15 * sin((now / SceneConfig.glowPulsePeriodMilliseconds) * 2 * Double.pi)
  return easeOutCubic(lidProgress) * SceneConfig.glowMaximum * pulse
}

public func startFocus(_ state: OpeningSceneState, _ cardIndex: Int, _ now: Double) -> OpeningSceneState {
  var next = state
  next.focusedCardIndex = cardIndex
  next.focusTarget = 1
  next.focusFromProgress = getFocusProgress(state, now)
  next.focusStartedAtMilliseconds = now
  next.lidTarget = 0
  next.lidFromProgress = 0
  next.lidStartedAtMilliseconds = now
  next.openStartedAtMilliseconds = 0
  next.tuckTarget = 0
  next.tuckFromProgress = 0
  next.tuckStartedAtMilliseconds = now
  return next
}

public func startClose(_ state: OpeningSceneState, _ now: Double) -> OpeningSceneState {
  var next = state
  next.focusTarget = 0
  next.focusFromProgress = getFocusProgress(state, now)
  next.focusStartedAtMilliseconds = now
  next.lidTarget = 0
  next.lidFromProgress = getLidProgress(state, now)
  next.lidStartedAtMilliseconds = now
  next.openStartedAtMilliseconds = 0
  next.tuckTarget = 0
  next.tuckFromProgress = getTuckProgress(state, now)
  next.tuckStartedAtMilliseconds = now
  return next
}

public func startLidOpen(_ state: OpeningSceneState, _ now: Double) -> OpeningSceneState {
  var next = state
  next.lidTarget = 1
  next.lidFromProgress = getLidProgress(state, now)
  next.lidStartedAtMilliseconds = now + SceneConfig.anticipationDurationMilliseconds
  next.openStartedAtMilliseconds = now
  return next
}

public func withGlowColor(_ state: OpeningSceneState, _ glowColorLinear: [Double]) -> OpeningSceneState {
  var next = state
  next.glowColorLinear = glowColorLinear
  return next
}

public func startTuck(_ state: OpeningSceneState, _ now: Double) -> OpeningSceneState {
  var next = state
  next.tuckTarget = 1
  next.tuckFromProgress = getTuckProgress(state, now)
  next.tuckStartedAtMilliseconds = now
  return next
}
