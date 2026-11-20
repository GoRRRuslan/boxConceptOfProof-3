import { ScaledSheet, ms } from 'react-native-size-matters'

import { BOX_SLOT_HEIGHT, CARD_HEIGHT } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import type { IThemePalette } from '@utils/designSystem/Theme'

// Heights come unscaled from the layout config: the 3D placement uses the very same numbers.
export const makeStyles = (theme: IThemePalette) =>
  ScaledSheet.create({
    card: {
      height: CARD_HEIGHT,
      alignItems: 'center',
    },
    boxSlot: {
      height: BOX_SLOT_HEIGHT,
      alignSelf: 'stretch',
      backgroundColor: 'transparent',
    },
    info: {
      alignItems: 'center',
      gap: ms(2),
    },
    name: {
      fontSize: ms(18),
      fontWeight: '700',
    },
    price: {
      fontSize: ms(20),
      fontWeight: '700',
      color: theme.Colors.accent,
    },
    priceUnaffordable: {
      fontSize: ms(20),
      fontWeight: '700',
      color: theme.Colors.textSecondary,
    },
    prize: {
      fontSize: ms(13),
      color: theme.Colors.textSecondary,
    },
    affordability: {
      fontSize: ms(12),
      color: theme.Colors.textSecondary,
    },
  })
