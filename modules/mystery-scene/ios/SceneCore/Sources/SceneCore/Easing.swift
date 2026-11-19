import Foundation

public func clampToUnitInterval(_ value: Double) -> Double { min(1, max(0, value)) }

public func interpolate(_ from: Double, _ to: Double, _ progress: Double) -> Double { from + (to - from) * progress }

public func easeInOutCubic(_ progress: Double) -> Double {
  let t = clampToUnitInterval(progress)
  return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2
}

public func easeOutCubic(_ progress: Double) -> Double {
  let t = clampToUnitInterval(progress)
  return 1 - pow(1 - t, 3)
}

// Overshoots a little before settling: the lid "pops" open.
public func easeOutBack(_ progress: Double) -> Double {
  let t = clampToUnitInterval(progress)
  let overshoot = 1.4
  return 1 + (overshoot + 1) * pow(t - 1, 3) + overshoot * pow(t - 1, 2)
}

// Linear progress of an animation from `fromProgress` to `target` in a fixed time.
public func computeAnimatedProgress(
  fromProgress: Double, target: Double, startedAtMilliseconds: Double, nowMilliseconds: Double,
  durationMilliseconds: Double
) -> Double {
  let elapsedFraction = clampToUnitInterval((nowMilliseconds - startedAtMilliseconds) / durationMilliseconds)
  return interpolate(fromProgress, target, elapsedFraction)
}
