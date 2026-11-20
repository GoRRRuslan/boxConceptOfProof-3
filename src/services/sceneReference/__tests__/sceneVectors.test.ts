import fs from 'fs'
import path from 'path'

import { computeIridescenceTint, getIridescenceStrength } from '@flows/openingFlow/_facadesLogic/computeSceneEffects'
import {
  ESceneCommandKind as K,
  type ISceneCommand,
  type ISceneFrame,
  SceneReference,
} from '@services/sceneReference/computeSceneFrame'

// Scenario = a list of frames. Every frame advances the clock by FRAME_MILLISECONDS, applies its commands, computes
// the scene (the physics needs every frame) and, every SAMPLE_EVERY frames, records the result as an expected value.
// The Swift (XCTest) and Kotlin (JUnit) suites replay the very same commands and compare with these numbers.
const FRAME_MILLISECONDS = 1000 / 60
const START_MILLISECONDS = 5000
const SAMPLE_EVERY = 4
const VIEWPORT = { width: 393, height: 640 }
const VECTORS_PATH = path.resolve(__dirname, '../../../../modules/mystery-scene/test-vectors/sceneVectors.json')

interface IScenarioFrame {
  commands: ISceneCommand[]
}

interface IScenario {
  name: string
  frames: IScenarioFrame[]
}

const idle = (count: number): IScenarioFrame[] => Array.from({ length: count }, () => ({ commands: [] }))
const at = (...commands: ISceneCommand[]): IScenarioFrame => ({ commands })
const setup: ISceneCommand[] = [{ kind: K.CardCount, a: 8 }, { kind: K.ModelReady }]

const scenarios: IScenario[] = [
  {
    // Boxes pop in one after another while the list is scrolled to many offsets.
    name: 'entranceAndScroll',
    frames: [
      at(...setup),
      ...idle(40),
      ...[0, 37.5, 120, 301, 640, 977.25, 1500, 1760, 900, 10].flatMap(offset => [at({ kind: K.Scroll, a: offset }), ...idle(7)]),
    ],
  },
  {
    // A card is pressed, a finger slides off, another is pressed and released.
    name: 'pressSqueeze',
    frames: [
      at(...setup, { kind: K.Scroll, a: 150 }),
      ...idle(80),
      at({ kind: K.PressIn, a: 2 }),
      ...idle(6),
      at({ kind: K.PressOut }),
      ...idle(20),
      at({ kind: K.PressIn, a: 2 }),
      ...idle(2),
      at({ kind: K.PressOut }),
      at({ kind: K.PressIn, a: 4 }),
      ...idle(15),
      at({ kind: K.PressOut }),
      ...idle(20),
    ],
  },
  {
    // Select, auto-turn, drag, flick, pinch, double tap, tilt, then open, reveal, tuck and leave.
    name: 'inspectOpenRevealClose',
    frames: [
      at(...setup, { kind: K.Scroll, a: 300 }),
      ...idle(80),
      at({ kind: K.Focus, a: 3 }),
      ...idle(30),
      at({ kind: K.Tilt, a: 0.5, b: -0.25 }),
      ...idle(150),
      at({ kind: K.DragBy, a: 40, b: -15 }),
      at({ kind: K.DragBy, a: 25, b: 400 }),
      at({ kind: K.DragEnd, a: 900, b: -300 }),
      ...idle(150),
      at({ kind: K.Pinch, a: 1.5 }),
      at({ kind: K.Pinch, a: 1.9 }),
      at({ kind: K.Pinch, a: 0.2 }),
      ...idle(10),
      at({ kind: K.ResetView }),
      ...idle(100),
      at({ kind: K.GlowColor, a: 1, b: 0.55, c: 0.08, d: 3 }),
      ...idle(90),
      at({ kind: K.OpenLid }),
      ...idle(200),
      at({ kind: K.Tuck }),
      ...idle(60),
      at({ kind: K.Close }),
      ...idle(45),
      at({ kind: K.Focus, a: 5 }),
      ...idle(20),
      at({ kind: K.Close }),
      ...idle(40),
    ],
  },
  {
    // A common prize: smaller show; the list is scrolled hard before and the box is put away only after a long look.
    name: 'commonPrizeAndFastScroll',
    frames: [
      at(...setup, { kind: K.Scroll, a: 0 }),
      ...idle(60),
      ...[400, 20, 700, 5].flatMap(offset => [at({ kind: K.Scroll, a: offset }), ...idle(3)]),
      at({ kind: K.Focus, a: 1 }),
      ...idle(40),
      at({ kind: K.GlowColor, a: 0.35, b: 0.5, c: 0.58, d: 0 }),
      ...idle(40),
      at({ kind: K.OpenLid }),
      ...idle(260),
      at({ kind: K.Tuck }),
      ...idle(60),
    ],
  },
]

// Direct samples of the iridescence functions (the engines apply them per box, so they are not part of a scene frame).
const iridescenceSamples = [
  [0, 0, 0, 5000],
  [0.1, 1, 0.5, 5000],
  [0.3, 0.7, 0.3, 1234],
  [0.45, -1.2, 0.4, 98765],
  [0.65, 2.4, -0.2, 4242.5],
  [1, 3.1, 0.9, 777777],
].map(([metallic, yawRadians, pitchRadians, nowMilliseconds]) => {
  const strength = getIridescenceStrength(metallic)

  return { metallic, yawRadians, pitchRadians, nowMilliseconds, strength, tint: computeIridescenceTint(strength, yawRadians, pitchRadians, nowMilliseconds) }
})

const runScenario = (scenario: IScenario) => {
  const reference = new SceneReference(VIEWPORT.width, VIEWPORT.height)
  const frames = scenario.frames.map((frame, frameIndex) => {
    const nowMilliseconds = START_MILLISECONDS + frameIndex * FRAME_MILLISECONDS

    frame.commands.forEach(command => {
      reference.apply(command, nowMilliseconds)
    })

    const expected: ISceneFrame = reference.computeFrame(nowMilliseconds, FRAME_MILLISECONDS / 1000)

    return { commands: frame.commands, expected: frameIndex % SAMPLE_EVERY === 0 ? expected : null }
  })

  return { name: scenario.name, viewportWidth: VIEWPORT.width, viewportHeight: VIEWPORT.height, startMilliseconds: START_MILLISECONDS, frameMilliseconds: FRAME_MILLISECONDS, frames }
}

describe('scene test vectors (shared with the Swift and Kotlin tests)', () => {
  const generated = { tolerance: 1e-9, scenarios: scenarios.map(runScenario), iridescenceSamples }

  it('match the committed vectors (UPDATE_SCENE_VECTORS=1 rewrites them)', () => {
    if (process.env.UPDATE_SCENE_VECTORS === '1') {
      fs.writeFileSync(VECTORS_PATH, `${JSON.stringify(generated)}\n`)
    }

    const committed = JSON.parse(fs.readFileSync(VECTORS_PATH, 'utf8')) as typeof generated

    expect(committed.iridescenceSamples).toEqual(JSON.parse(JSON.stringify(generated.iridescenceSamples)))

    expect(committed.scenarios.map(scenario => scenario.name)).toEqual(generated.scenarios.map(scenario => scenario.name))

    committed.scenarios.forEach((scenario, scenarioIndex) => {
      scenario.frames.forEach((frame, frameIndex) => {
        expect(frame.expected).toEqual(JSON.parse(JSON.stringify(generated.scenarios[scenarioIndex].frames[frameIndex].expected)))
      })
    })
  })

  it('exercises every part of the scene: focus, lid, glow, tuck, inertia, press', () => {
    const frames = generated.scenarios.flatMap(scenario => scenario.frames).flatMap(frame => (frame.expected ? [frame.expected] : []))

    expect(frames.some(frame => frame.lidAngleRadians > 1.5)).toBe(true)

    expect(frames.some(frame => frame.glowStrength > 0.5)).toBe(true)

    expect(frames.some(frame => frame.cards.some(card => card.scale === 0 || !card.isVisible))).toBe(true)

    expect(frames.some(frame => frame.focusedCardIndex === 5)).toBe(true)

    expect(frames.some(frame => frame.effects.shaft.alpha > 0.3)).toBe(true)

    expect(frames.some(frame => frame.effects.sparks.some(spark => spark.scaleX > 0))).toBe(true)

    expect(frames.some(frame => frame.effects.rings.some(ring => ring.alpha > 0.1))).toBe(true)

    expect(frames.some(frame => frame.seamIntensity > 1)).toBe(true)

    expect(frames.some(frame => frame.cards.some(card => card.translateX !== 0))).toBe(true)
  })
})
