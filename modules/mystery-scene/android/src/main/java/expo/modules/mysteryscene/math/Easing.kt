package expo.modules.mysteryscene.math

import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

fun clampToUnitInterval(value: Double): Double = min(1.0, max(0.0, value))

fun interpolate(from: Double, to: Double, progress: Double): Double = from + (to - from) * progress

fun easeInOutCubic(progress: Double): Double {
  val t = clampToUnitInterval(progress)
  return if (t < 0.5) 4 * t * t * t else 1 - (-2 * t + 2).pow(3) / 2
}

fun easeOutCubic(progress: Double): Double {
  val t = clampToUnitInterval(progress)
  return 1 - (1 - t).pow(3)
}

/** Overshoots a little before settling: the lid "pops" open. */
fun easeOutBack(progress: Double): Double {
  val t = clampToUnitInterval(progress)
  val overshoot = 1.4
  return 1 + (overshoot + 1) * (t - 1).pow(3) + overshoot * (t - 1).pow(2)
}

fun computeAnimatedProgress(
  fromProgress: Double,
  target: Double,
  startedAtMilliseconds: Double,
  nowMilliseconds: Double,
  durationMilliseconds: Double,
): Double {
  val elapsedFraction = clampToUnitInterval((nowMilliseconds - startedAtMilliseconds) / durationMilliseconds)
  return interpolate(fromProgress, target, elapsedFraction)
}
