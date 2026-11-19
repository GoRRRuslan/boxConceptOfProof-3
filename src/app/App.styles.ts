import { ScaledSheet } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette) =>
  ScaledSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.Colors.background,
    },
  })
