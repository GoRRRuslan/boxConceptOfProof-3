import { gradeLinearColor } from '@flows/catalogueFlow/_facadesLogic/gradeLinearColor'

describe('gradeLinearColor', () => {
  it('leaves black close to black and never goes negative', () => {
    const [red, green, blue, alpha] = gradeLinearColor([0, 0, 0, 1])

    expect(red).toBe(0)

    expect(green).toBe(0)

    expect(blue).toBe(0)

    expect(alpha).toBe(1)
  })

  it('keeps middle grey where it is (contrast turns around it, grey has no saturation to add)', () => {
    const [red, green, blue] = gradeLinearColor([0.18, 0.18, 0.18, 1])

    expect(red).toBeCloseTo(0.18, 6)

    expect(green).toBeCloseTo(0.18, 6)

    expect(blue).toBeCloseTo(0.18, 6)
  })

  it('makes a colour more saturated: the strongest channel grows and the weakest shrinks', () => {
    const [red, , blue] = gradeLinearColor([0.8, 0.4, 0.1, 1])

    expect(red).toBeGreaterThan(0.8)

    expect(blue).toBeLessThan(0.1)
  })
})
