import * as Haptics from 'expo-haptics'

const IMPACT_SPACING_MILLISECONDS = 140

// Thin wrapper so screens and facades never talk to expo-haptics directly (and tests can mock it).
export const hapticFeedback = {
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  lidOpening: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  selection: () => Haptics.selectionAsync(),
  // The box starts to tremble.
  anticipation: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  // The box trembles faster and harder while it charges: a pulse whose strength is 0 (light) ... 1 (heavy).
  anticipationPulse: (strength: number) =>
    Haptics.impactAsync(
      strength > 0.75 ? Haptics.ImpactFeedbackStyle.Heavy : strength > 0.4 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ),
  // The better the prize the more heavy taps follow the success tap.
  rarityReveal: (impactCount: number) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    for (let index = 1; index <= impactCount; index += 1) {
      setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }, index * IMPACT_SPACING_MILLISECONDS)
    }
  },
}
