import {
  BOX_SLOT_HEIGHT,
  CAMERA_DISTANCE,
  CAMERA_FOCAL_LENGTH_MILLIMETERS,
  CARD_HEIGHT,
  LIST_TOP_PADDING,
  PARKED_BOX_HEIGHT_UNITS,
  SENSOR_HEIGHT_MILLIMETERS,
} from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { computeBoxPose } from '@flows/catalogueFlow/_facadesLogic/computeBoxPose'

const VIEWPORT_HEIGHT = 800
const WORLD_UNITS_PER_PIXEL = ((CAMERA_DISTANCE * SENSOR_HEIGHT_MILLIMETERS) / CAMERA_FOCAL_LENGTH_MILLIMETERS) / VIEWPORT_HEIGHT

describe('computeBoxPose', () => {
  it('puts the box in the middle of the screen when its slot is in the middle', () => {
    const scrollOffset = LIST_TOP_PADDING + BOX_SLOT_HEIGHT / 2 - VIEWPORT_HEIGHT / 2
    const pose = computeBoxPose({ cardIndex: 0, scrollOffset, viewportHeight: VIEWPORT_HEIGHT })

    expect(pose.translateY).toBeCloseTo(0)

    expect(pose.isVisible).toBe(true)
  })

  it('moves the box up by exactly the scrolled distance (in world units)', () => {
    const before = computeBoxPose({ cardIndex: 1, scrollOffset: 0, viewportHeight: VIEWPORT_HEIGHT })
    const after = computeBoxPose({ cardIndex: 1, scrollOffset: 100, viewportHeight: VIEWPORT_HEIGHT })

    expect(after.translateY - before.translateY).toBeCloseTo(100 * WORLD_UNITS_PER_PIXEL)
  })

  it('places consecutive cards one card height apart', () => {
    const first = computeBoxPose({ cardIndex: 0, scrollOffset: 0, viewportHeight: VIEWPORT_HEIGHT })
    const second = computeBoxPose({ cardIndex: 1, scrollOffset: 0, viewportHeight: VIEWPORT_HEIGHT })

    expect(first.translateY - second.translateY).toBeCloseTo(CARD_HEIGHT * WORLD_UNITS_PER_PIXEL)
  })

  it('scales the box with the slot, independent of scroll', () => {
    const near = computeBoxPose({ cardIndex: 0, scrollOffset: 0, viewportHeight: VIEWPORT_HEIGHT })
    const far = computeBoxPose({ cardIndex: 0, scrollOffset: 500, viewportHeight: VIEWPORT_HEIGHT })

    expect(near.scale).toBeGreaterThan(0)

    expect(far.scale).toBe(near.scale)
  })

  it('turns the box a little while it moves across the screen', () => {
    const top = computeBoxPose({ cardIndex: 0, scrollOffset: 300, viewportHeight: VIEWPORT_HEIGHT })
    const bottom = computeBoxPose({ cardIndex: 0, scrollOffset: -300, viewportHeight: VIEWPORT_HEIGHT })

    expect(bottom.yawRadians).toBeGreaterThan(top.yawRadians)
  })

  it('parks the boxes of cards that are far outside the viewport', () => {
    const pose = computeBoxPose({ cardIndex: 20, scrollOffset: 0, viewportHeight: VIEWPORT_HEIGHT })

    expect(pose.isVisible).toBe(false)

    expect(pose.translateY).toBe(PARKED_BOX_HEIGHT_UNITS)
  })

  it('keeps the card just below the viewport active so it is ready when it scrolls in', () => {
    const pose = computeBoxPose({ cardIndex: 3, scrollOffset: 0, viewportHeight: VIEWPORT_HEIGHT })

    expect(pose.isVisible).toBe(true)
  })

  it('turns neighbouring boxes a little differently (signature poses) in a repeating pattern', () => {
    const yaw = (cardIndex: number) => computeBoxPose({ cardIndex, scrollOffset: cardIndex * CARD_HEIGHT, viewportHeight: VIEWPORT_HEIGHT }).yawRadians

    expect(yaw(0)).not.toBeCloseTo(yaw(1))

    expect(yaw(1)).not.toBeCloseTo(yaw(2))

    // Every third box has the same signature.
    expect(yaw(3)).toBeCloseTo(yaw(0))
  })
})
