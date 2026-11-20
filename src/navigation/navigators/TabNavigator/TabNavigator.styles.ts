import { ScaledSheet, ms } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette) =>
  ScaledSheet.create({
    tabBar: {
      backgroundColor: theme.Colors.background,
      borderTopColor: theme.Colors.card,
    },
    tabBarHidden: {
      opacity: 0,
      pointerEvents: 'none',
    },
    tabLabel: {
      fontSize: ms(14),
      fontWeight: '600',
    },
    tabIcon: {
      display: 'none',
    },
  })
