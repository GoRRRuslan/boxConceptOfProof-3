import { computeParticleTrajectory } from '@flows/openingFlow/_facadesLogic/computeParticleTrajectory'

describe('computeParticleTrajectory', () => {
  it('is the same every time for the same particle', () => {
    expect(computeParticleTrajectory(5, 18)).toEqual(computeParticleTrajectory(5, 18))
  })

  it('sends neighbouring particles in clearly different directions', () => {
    const angles = Array.from({ length: 8 }, (_, index) => computeParticleTrajectory(index, 8).angleRadians % (2 * Math.PI))
    const sorted = [...angles].sort((first, second) => first - second)
    const smallestGap = Math.min(...sorted.slice(1).map((angle, index) => angle - sorted[index]))

    expect(smallestGap).toBeGreaterThan(0.2)
  })

  it('keeps every particle on screen-friendly, positive values', () => {
    Array.from({ length: 28 }, (_, index) => computeParticleTrajectory(index, 28)).forEach(particle => {
      expect(particle.distance).toBeGreaterThan(50)

      expect(particle.distance).toBeLessThan(320)

      expect(particle.size).toBeGreaterThan(3)

      expect(particle.durationMilliseconds).toBeGreaterThan(600)

      expect(particle.delayMilliseconds).toBeGreaterThanOrEqual(0)
    })
  })

  it('flies further when there are many particles (a bigger show)', () => {
    expect(computeParticleTrajectory(3, 28).distance).toBeGreaterThan(computeParticleTrajectory(3, 10).distance)
  })
})
