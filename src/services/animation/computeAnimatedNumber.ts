// Value of a number that counts from `from` to `to` over `durationMilliseconds` (fast first, then settling).
export const computeAnimatedNumber = (from: number, to: number, elapsedMilliseconds: number, durationMilliseconds: number): number => {
  const progress = Math.min(1, Math.max(0, elapsedMilliseconds / durationMilliseconds))
  const eased = 1 - (1 - progress) ** 3

  return Math.round(from + (to - from) * eased)
}
