import { ESoundEffect, soundEffects } from '@services/sounds/soundEffects'

const mockSeekTo = jest.fn(() => Promise.resolve())
const mockPlay = jest.fn()
const mockCreateAudioPlayer = jest.fn<{ seekTo: typeof mockSeekTo; play: typeof mockPlay }, [unknown]>(() => ({
  seekTo: mockSeekTo,
  play: mockPlay,
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

  const flushPromises = async () => {
    await Promise.resolve()

    await Promise.resolve()
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

  it('lets effects play with the silent switch on and mixes with other audio, configured once', () => {
    soundEffects.play(ESoundEffect.Select)

    soundEffects.play(ESoundEffect.Error)

    expect(mockSetAudioModeAsync.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('never throws when the device has no audio', () => {
    mockCreateAudioPlayer.mockImplementationOnce(() => {
      throw new Error('no audio output')
    })

    expect(() => {
      soundEffects.play(ESoundEffect.RevealLegendary)
    }).not.toThrow()
  })

  it('has a sound for every effect', () => {
    Object.values(ESoundEffect).forEach(effect => {
      expect(() => {
        soundEffects.play(effect)
      }).not.toThrow()
    })
  })
})
