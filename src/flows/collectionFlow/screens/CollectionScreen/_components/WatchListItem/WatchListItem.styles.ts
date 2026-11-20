import { ScaledSheet, ms } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette, rarityColorHex: string) =>
  ScaledSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ms(14),
      marginHorizontal: ms(16),
      marginBottom: ms(12),
      padding: ms(12),
      borderRadius: ms(14),
      backgroundColor: theme.Colors.card,
    },
    thumbnail: {
      width: ms(56),
      height: ms(84),
    },
    texts: {
      flex: 1,
      gap: ms(2),
    },
    name: {
      fontSize: ms(17),
      fontWeight: '700',
    },
    brand: {
      fontSize: ms(13),
      color: theme.Colors.textSecondary,
    },
    box: {
      fontSize: ms(12),
      color: theme.Colors.textSecondary,
    },
    trailing: {
      alignItems: 'flex-end',
      gap: ms(2),
    },
    rarity: {
      fontSize: ms(12),
      fontWeight: '700',
      color: rarityColorHex,
    },
    value: {
      fontSize: ms(16),
      fontWeight: '700',
      color: theme.Colors.accent,
    },
  })
