import * as Haptics from 'expo-haptics'

import { logDiagnostic, logDiagnosticFailure } from '@services/performance/diagnosticLog'

const IMPACT_SPACING_MILLISECONDS = 140

// Every haptic goes through here, so that a device that cannot (or will not) vibrate says why instead of staying silent.
const fire = (name: string, request: () => Promise<void>): Promise<void> => {
  logDiagnostic('haptic', { name })

  return request().catch((error: unknown) => {
    logDiagnosticFailure(`haptic.failed.${name}`, error)
  })
}

// Thin wrapper so screens and facades never talk to expo-haptics directly (and tests can mock it).
export const hapticFeedback = {
  success: () => fire('success', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => fire('error', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  lidOpening: () => fire('lidOpening', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: () => fire('selection', () => Haptics.selectionAsync()),
  // The box starts to tremble.
  anticipation: () => fire('anticipation', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  // The box trembles faster and harder while it charges: a pulse whose strength is 0 (light) ... 1 (heavy).
  anticipationPulse: (strength: number) =>
    fire('anticipationPulse', () =>
      Haptics.impactAsync(
        strength > 0.75 ? Haptics.ImpactFeedbackStyle.Heavy : strength > 0.4 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      )),
  // The better the prize the more heavy taps follow the success tap.
  rarityReveal: (impactCount: number) => {
    void fire('rarityReveal.success', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))

    for (let index = 1; index <= impactCount; index += 1) {
      setTimeout(() => {
        void fire('rarityReveal.impact', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
      }, index * IMPACT_SPACING_MILLISECONDS)
    }
  },
}
