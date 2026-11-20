import { ScaledSheet, ms } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette, rarityColorHex: string) =>
  ScaledSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.Colors.scrim,
      padding: ms(24),
    },
    sheet: {
      width: '100%',
      alignItems: 'center',
      gap: ms(6),
      paddingVertical: ms(24),
      paddingHorizontal: ms(16),
      borderRadius: ms(20),
      backgroundColor: theme.Colors.card,
      borderWidth: 1,
      borderColor: rarityColorHex,
    },
    rarity: {
      fontSize: ms(15),
      fontWeight: '800',
      letterSpacing: 1,
      color: rarityColorHex,
    },
    image: {
      width: ms(190),
      height: ms(280),
    },
    name: {
      fontSize: ms(22),
      fontWeight: '700',
    },
    brand: {
      fontSize: ms(14),
      color: theme.Colors.textSecondary,
    },
    value: {
      fontSize: ms(18),
      fontWeight: '700',
      color: theme.Colors.accent,
    },
    box: {
      fontSize: ms(13),
      color: theme.Colors.textSecondary,
      marginBottom: ms(8),
    },
  })
