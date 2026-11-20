import { ScaledSheet, ms } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette) =>
  ScaledSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: ms(12),
      paddingHorizontal: ms(32),
    },
    title: {
      fontSize: ms(20),
      fontWeight: '700',
    },
    description: {
      fontSize: ms(14),
      textAlign: 'center',
      color: theme.Colors.textSecondary,
    },
  })
