import { ScaledSheet, ms } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette) =>
  ScaledSheet.create({
    text: {
      color: theme.Colors.textPrimary,
      fontSize: ms(15),
    },
  })
