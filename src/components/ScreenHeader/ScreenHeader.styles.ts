import { ScaledSheet, ms } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette) =>
  ScaledSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: ms(16),
      paddingVertical: ms(10),
    },
    title: {
      fontSize: ms(22),
      fontWeight: '700',
    },
    trailing: {
      alignItems: 'flex-end',
    },
    trailingLabel: {
      fontSize: ms(12),
      color: theme.Colors.textSecondary,
    },
    trailingValue: {
      fontSize: ms(20),
      fontWeight: '700',
      color: theme.Colors.accent,
    },
  })
