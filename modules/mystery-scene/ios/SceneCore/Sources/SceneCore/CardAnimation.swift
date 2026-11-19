import Foundation

public func computeEntranceScale(_ elapsedMilliseconds: Double) -> Double {
  if elapsedMilliseconds <= 0 { return 0 }
  return max(0, easeOutBack(clampToUnitInterval(elapsedMilliseconds / SceneConfig.entranceDurationMilliseconds)))
}

public struct PressState: Equatable {
  public var cardIndex: Int = -1
  public var isPressed: Bool = false
  public var fromScale: Double = 1
  public var changedAtMilliseconds: Double = 0

  public init() {}
}

public func computePressScale(_ state: PressState, _ now: Double) -> Double {
  let progress = easeOutCubic(
    clampToUnitInterval((now - state.changedAtMilliseconds) / SceneConfig.pressDurationMilliseconds))
  return interpolate(state.fromScale, state.isPressed ? SceneConfig.pressScale : 1, progress)
}

public func startPress(_ state: PressState, cardIndex: Int, now: Double) -> PressState {
  var next = PressState()
  next.cardIndex = cardIndex
  next.isPressed = true
  next.fromScale = state.cardIndex == cardIndex ? computePressScale(state, now) : 1
  next.changedAtMilliseconds = now
  return next
}

public func endPress(_ state: PressState, _ now: Double) -> PressState {
  var next = state
  next.isPressed = false
  next.fromScale = computePressScale(state, now)
  next.changedAtMilliseconds = now
  return next
}
