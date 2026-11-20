import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'

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
let isAudioModeConfigured = false

const getPlayer = (effect: ESoundEffect): AudioPlayer => {
  if (!isAudioModeConfigured) {
    isAudioModeConfigured = true

    // Effects are short UI sounds: they play even with the silent switch on and do not stop other audio.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined)
  }

  const pool = players.get(effect) ?? []
  const index = (nextPlayerIndex.get(effect) ?? 0) % POOL_SIZE

  players.set(effect, pool)

  nextPlayerIndex.set(effect, index + 1)

  if (!pool[index]) {
    pool[index] = createAudioPlayer(SOURCES[effect])
  }

  return pool[index]
}

// Short sound effects. A device or simulator without audio must never break the app: failures are swallowed.
export const soundEffects = {
  play: (effect: ESoundEffect) => {
    try {
      const player = getPlayer(effect)

      // Rewind first and only then start, otherwise a clip that has just ended may not restart.
      player
        .seekTo(0)
        .then(() => {
          player.play()
        })
        .catch(() => undefined)
    } catch {
      // No audio output available: the app works the same without sound.
    }
  },
}
