import { ScaledSheet, ms } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette) =>
  ScaledSheet.create({
    count: {
      marginHorizontal: ms(16),
      marginBottom: ms(10),
      fontSize: ms(13),
      color: theme.Colors.textSecondary,
    },
  })
