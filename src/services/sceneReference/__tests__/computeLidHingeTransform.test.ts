import {
  LID_FULLY_OPEN_ANGLE_DEGREES,
  LID_HINGE_PIVOT,
  computeLidHingeTransform,
} from '@services/sceneReference/computeLidHingeTransform'

const applyTransform = (point: number[], angleDegrees: number) => {
  const { rotate, translate } = computeLidHingeTransform(angleDegrees)
  const [pointX, pointY, pointZ] = point
  const cosine = Math.cos(rotate[0])
  const sine = Math.sin(rotate[0])

  return [
    pointX + translate[0],
    pointY * cosine - pointZ * sine + translate[1],
    pointY * sine + pointZ * cosine + translate[2],
  ]
}

describe('computeLidHingeTransform', () => {
  it('is the identity at the closed angle', () => {
    const { rotate, translate } = computeLidHingeTransform(0)

    expect(rotate).toEqual([0, 0, 0])

    expect(translate[0]).toBeCloseTo(0)

    expect(translate[1]).toBeCloseTo(0)

    expect(translate[2]).toBeCloseTo(0)
  })

  it('keeps the hinge pivot fixed at every angle', () => {
    for (const angle of [10, 45, 90, LID_FULLY_OPEN_ANGLE_DEGREES]) {
      const moved = applyTransform(LID_HINGE_PIVOT, angle)

      expect(moved[0]).toBeCloseTo(LID_HINGE_PIVOT[0])

      expect(moved[1]).toBeCloseTo(LID_HINGE_PIVOT[1])

      expect(moved[2]).toBeCloseTo(LID_HINGE_PIVOT[2])
    }
  })

  it('lifts the front edge of the lid up and behind the hinge when fully open', () => {
    const frontEdgeOfLid = [0, LID_HINGE_PIVOT[1], -0.3799]
    const moved = applyTransform(frontEdgeOfLid, LID_FULLY_OPEN_ANGLE_DEGREES)

    expect(moved[1]).toBeGreaterThan(LID_HINGE_PIVOT[1])

    expect(moved[2]).toBeGreaterThan(LID_HINGE_PIVOT[2] - 0.7)
  })
})
