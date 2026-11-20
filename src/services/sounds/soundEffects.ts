import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'

import { logDiagnostic, logDiagnosticFailure } from '@services/performance/diagnosticLog'

import errorSound from '@assets/sounds/error.wav'
import anticipationSound from '@assets/sounds/anticipation.wav'
import lidOpenSound from '@assets/sounds/lidOpen.wav'
import purchaseSound from '@assets/sounds/purchase.wav'
import revealCommonSound from '@assets/sounds/revealCommon.wav'
import revealLegendarySound from '@assets/sounds/revealLegendary.wav'
import revealRareSound from '@assets/sounds/revealRare.wav'
import selectSound from '@assets/sounds/select.wav'

export enum ESoundEffect {
  Select = 'select',
  Purchase = 'purchase',
  Anticipation = 'anticipation',
  LidOpen = 'lidOpen',
  RevealCommon = 'revealCommon',
  RevealRare = 'revealRare',
  RevealLegendary = 'revealLegendary',
  Error = 'error',
}

const SOURCES: Record<ESoundEffect, number> = {
  [ESoundEffect.Select]: selectSound,
  [ESoundEffect.Purchase]: purchaseSound,
  [ESoundEffect.Anticipation]: anticipationSound,
  [ESoundEffect.LidOpen]: lidOpenSound,
  [ESoundEffect.RevealCommon]: revealCommonSound,
  [ESoundEffect.RevealRare]: revealRareSound,
  [ESoundEffect.RevealLegendary]: revealLegendarySound,
  [ESoundEffect.Error]: errorSound,
}

// Two players per effect, used in turn: when the same effect fires again while it is still sounding (boxes opened
// quickly one after another), the second trigger gets a free player and does not cut the first one off.
const POOL_SIZE = 2
const players = new Map<ESoundEffect, AudioPlayer[]>()
const nextPlayerIndex = new Map<ESoundEffect, number>()
let audioModeReady: Promise<void> | null = null
let lastPlayAt = 0

// The audio session is configured once and awaited before the first sound: effects play even with the silent switch on and do not
// stop other audio.
const ensureAudioMode = (): Promise<void> => {
  audioModeReady ??= setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    allowsRecording: false,
    shouldPlayInBackground: false,
  })
    .then(() => {
      logDiagnostic('sound.audioMode.ready')
    })
    .catch((error: unknown) => {
      logDiagnosticFailure('sound.audioMode.failed', error)
    })

  return audioModeReady
}

// The player in the pool at `index`, created (and loading) if it does not exist yet.
const getPoolPlayer = (effect: ESoundEffect, index: number): AudioPlayer => {
  const pool = players.get(effect) ?? []

  players.set(effect, pool)

  if (!pool[index]) {
    const player = createAudioPlayer(SOURCES[effect])

    player.volume = 1

    player.addListener('playbackStatusUpdate', status => {
      // Everything the player reports in the two seconds after a sound was asked for: does it really play, or does it wait?
      if (Date.now() - lastPlayAt < 2000 || status.didJustFinish || !status.isLoaded) {
        logDiagnostic('sound.status', {
          effect,
          isLoaded: status.isLoaded,
          playing: status.playing,
          didJustFinish: status.didJustFinish,
          timeControlStatus: status.timeControlStatus,
          reasonForWaitingToPlay: status.reasonForWaitingToPlay,
          currentTime: status.currentTime,
          duration: status.duration,
          mute: status.mute,
        })
      }
    })

    pool[index] = player

    logDiagnostic('sound.player.created', { effect, index })
  }

  return pool[index]
}

// The next player of the effect, in turn.
const getPlayer = (effect: ESoundEffect): AudioPlayer => {
  const index = (nextPlayerIndex.get(effect) ?? 0) % POOL_SIZE

  nextPlayerIndex.set(effect, index + 1)

  return getPoolPlayer(effect, index)
}

// Creates the audio session and EVERY player of the pool of every effect ahead of time, so that the first sound finds a loaded player
// (a player created at the moment of the sound needs 0.4 to 1 s to load, the sound would come late). Doing it on the first sound
// also blocks the JS thread for about a second, so it is done once, while the app is idle after the start.
const prepare = () => {
  void ensureAudioMode().then(() => {
    Object.values(ESoundEffect).forEach(effect => {
      for (let index = 0; index < POOL_SIZE; index += 1) {
        try {
          getPoolPlayer(effect, index)
        } catch (error) {
          logDiagnosticFailure('sound.prepare.failed', error)
        }
      }
    })
  })
}

// Short sound effects. A device or simulator without audio must never break the app: failures are reported (to the diagnostic log) and swallowed.
export const soundEffects = {
  prepare,

  play: (effect: ESoundEffect) => {
    void ensureAudioMode().then(() => {
      try {
        const player = getPlayer(effect)

        lastPlayAt = Date.now()

        logDiagnostic('sound.play', { effect, volume: player.volume, muted: player.muted, isLoaded: player.isLoaded })

        // Rewind first and only then start, otherwise a clip that has just ended may not restart.
        player
          .seekTo(0)
          .then(() => {
            player.play()

            // 150 ms later: is it really playing, how far has it got?
            setTimeout(() => {
              logDiagnostic('sound.check', { effect, playing: player.playing, currentTime: player.currentTime, volume: player.volume, muted: player.muted })
            }, 150)
          })
          .catch((error: unknown) => {
            logDiagnosticFailure('sound.play.failed', error)
          })
      } catch (error) {
        logDiagnosticFailure('sound.player.failed', error)
      }
    })
  },
}
