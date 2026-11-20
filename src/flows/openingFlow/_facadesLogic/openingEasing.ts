export const clampToUnitInterval = (value: number): number => {
  'worklet'

  return Math.min(1, Math.max(0, value))
}

export const interpolate = (from: number, to: number, progress: number): number => {
  'worklet'

  return from + (to - from) * progress
}

export const easeInOutCubic = (progress: number): number => {
  'worklet'

  const t = clampToUnitInterval(progress)

  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

export const easeOutCubic = (progress: number): number => {
  'worklet'

  const t = clampToUnitInterval(progress)

  return 1 - (1 - t) ** 3
}

// Overshoots a little before settling: the lid "pops" open.
export const easeOutBack = (progress: number): number => {
  'worklet'

  const t = clampToUnitInterval(progress)
  const overshoot = 1.4

  return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2
}

interface IAnimatedProgressParams {
  fromProgress: number
  target: number
  startedAtMilliseconds: number
  nowMilliseconds: number
  durationMilliseconds: number
}

// Linear progress of an animation that moves from `fromProgress` to `target` in a fixed time,
// starting at `startedAtMilliseconds`. Reversing mid-way starts from the progress reached so far.
export const computeAnimatedProgress = ({
  fromProgress,
  target,
  startedAtMilliseconds,
  nowMilliseconds,
  durationMilliseconds,
}: IAnimatedProgressParams): number => {
  'worklet'

  const elapsedFraction = clampToUnitInterval((nowMilliseconds - startedAtMilliseconds) / durationMilliseconds)

  return interpolate(fromProgress, target, elapsedFraction)
}
