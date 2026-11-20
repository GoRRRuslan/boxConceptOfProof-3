import { DarkTheme, type Theme } from '@react-navigation/native'

import { theme } from '@utils/designSystem/Theme'

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.Colors.accent,
    background: theme.Colors.background,
    card: theme.Colors.background,
    text: theme.Colors.textPrimary,
    border: theme.Colors.card,
  },
}
