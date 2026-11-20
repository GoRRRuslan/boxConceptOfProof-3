import { ScaledSheet } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette, topPadding: number, bottomPadding: number) =>
  ScaledSheet.create({
    container: {
      flex: 1,
      paddingTop: topPadding,
      paddingBottom: bottomPadding,
      backgroundColor: theme.Colors.background,
    },
  })
