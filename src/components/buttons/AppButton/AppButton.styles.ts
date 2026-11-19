import { ScaledSheet, ms, mvs } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette) =>
  ScaledSheet.create({
    button: {
      minWidth: ms(64),
      paddingVertical: mvs(10),
      paddingHorizontal: ms(14),
      borderRadius: ms(10),
      backgroundColor: theme.Colors.surface,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    label: {
      color: theme.Colors.textOnAccent,
      fontSize: ms(15),
      fontWeight: '600',
    },
  })
