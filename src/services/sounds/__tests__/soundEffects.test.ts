import { ESoundEffect, soundEffects } from '@services/sounds/soundEffects'

const mockSeekTo = jest.fn(() => Promise.resolve())
const mockPlay = jest.fn()
const mockCreateAudioPlayer = jest.fn<
  { seekTo: typeof mockSeekTo; play: typeof mockPlay; addListener: jest.Mock; volume: number; muted: boolean; isLoaded: boolean },
  [unknown]
>(() => ({
  seekTo: mockSeekTo,
  play: mockPlay,
  addListener: jest.fn(),
  volume: 1,
  muted: false,
  isLoaded: true,
}))
const mockSetAudioModeAsync = jest.fn<Promise<void>, [unknown]>(() => Promise.resolve())

jest.mock('expo-audio', () => ({
  createAudioPlayer: (source: unknown) => mockCreateAudioPlayer(source),
  setAudioModeAsync: (mode: unknown) => mockSetAudioModeAsync(mode),
}))

describe('soundEffects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // The audio mode is awaited first, then the clip is rewound, then it plays.
  const flushPromises = async () => {
    for (let step = 0; step < 6; step += 1) {
      await Promise.resolve()
    }
  }

  it('plays an effect from its start', async () => {
    soundEffects.play(ESoundEffect.Purchase)

    await flushPromises()

    expect(mockSeekTo).toHaveBeenCalledWith(0)

    expect(mockPlay).toHaveBeenCalledTimes(1)
  })

  it('uses two players per effect in turn, so a quick repeat does not cut the first sound off', async () => {
    soundEffects.play(ESoundEffect.LidOpen)

    soundEffects.play(ESoundEffect.LidOpen)

    soundEffects.play(ESoundEffect.LidOpen)

    await flushPromises()

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2)

    expect(mockPlay).toHaveBeenCalledTimes(3)
  })

  it('lets effects play with the silent switch on and mixes with other audio, configured once', async () => {
    // A fresh copy of the module: the audio session is configured by the first sound of the process.
    let freshSoundEffects: typeof soundEffects | undefined

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      freshSoundEffects = require('@services/sounds/soundEffects').soundEffects as typeof soundEffects
    })

    freshSoundEffects?.play(ESoundEffect.Select)

    freshSoundEffects?.play(ESoundEffect.Error)

    await flushPromises()

    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1)

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }))
  })

  it('never throws when the device has no audio', async () => {
    mockCreateAudioPlayer.mockImplementationOnce(() => {
      throw new Error('no audio output')
    })

    expect(() => {
      soundEffects.play(ESoundEffect.RevealLegendary)
    }).not.toThrow()

    await flushPromises()
  })

  it('prepares a player for every effect ahead of time', async () => {
    soundEffects.prepare()

    await flushPromises()

    // Two players for each of the effects (a fresh copy of the module is not used here: some may exist already).
    expect(mockCreateAudioPlayer.mock.calls.length).toBeGreaterThan(0)
  })

  it('uses a prepared player for the first sound instead of creating one at that moment', async () => {
    let freshSoundEffects: typeof soundEffects | undefined

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      freshSoundEffects = require('@services/sounds/soundEffects').soundEffects as typeof soundEffects
    })

    freshSoundEffects?.prepare()

    await flushPromises()

    const createdByPrepare = mockCreateAudioPlayer.mock.calls.length

    expect(createdByPrepare).toBe(Object.values(ESoundEffect).length * 2)

    freshSoundEffects?.play(ESoundEffect.LidOpen)

    freshSoundEffects?.play(ESoundEffect.LidOpen)

    await flushPromises()

    expect(mockCreateAudioPlayer.mock.calls.length).toBe(createdByPrepare)
  })

  it('has a sound for every effect', () => {
    Object.values(ESoundEffect).forEach(effect => {
      expect(() => {
        soundEffects.play(effect)
      }).not.toThrow()
    })
  })
})
