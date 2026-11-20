export interface IParticleTrajectory {
  // Direction the particle flies in, from the centre of the watch.
  angleRadians: number
  distance: number
  size: number
  delayMilliseconds: number
  durationMilliseconds: number
}

const GOLDEN_ANGLE_RADIANS = 2.399963

// Scatters `count` particles evenly around the watch (golden angle), each with its own distance, size and
// timing. Deterministic: the same index always gives the same particle, so the show is the same every time.
export const computeParticleTrajectory = (index: number, count: number): IParticleTrajectory => {
  const variation = ((index * 7919) % 100) / 100

  return {
    angleRadians: index * GOLDEN_ANGLE_RADIANS,
    distance: 90 + 130 * variation + (count > 20 ? 40 : 0),
    size: 5 + 7 * ((index * 31) % 10) / 10,
    delayMilliseconds: (index % 6) * 45,
    durationMilliseconds: 700 + 500 * variation,
  }
}
