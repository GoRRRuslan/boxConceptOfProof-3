import { ScaledSheet, ms, mvs } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette, rarityColorHex: string) =>
  ScaledSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'space-between',
    },
    dragArea: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    header: {
      paddingHorizontal: ms(16),
      paddingTop: mvs(8),
    },
    // Back sits in the top left corner; the box name is centred on the screen below it, in line with the button at the bottom.
    backSlot: {
      position: 'absolute',
      top: mvs(8),
      left: ms(16),
    },
    titles: {
      alignItems: 'center',
      marginTop: mvs(56),
    },
    boxName: {
      fontSize: ms(18),
      fontWeight: '700',
    },
    price: {
      fontSize: ms(14),
      color: theme.Colors.accent,
    },
    reveal: {
      position: 'absolute',
      // High up: the watch sits in the upper third, the prize texts and the box below it.
      top: mvs(24),
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    // The rarity as a solid pill in the rarity colour (dark text on it): readable on any glow.
    rarityPill: {
      paddingVertical: mvs(3),
      paddingHorizontal: ms(16),
      marginBottom: ms(10),
      borderRadius: ms(14),
      backgroundColor: rarityColorHex,
    },
    rarity: {
      fontSize: ms(13),
      fontWeight: '800',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: theme.Colors.background,
    },
    // Below the glow, the price is the hero: big and in the rarity colour; name and brand are quiet.
    revealTexts: {
      alignItems: 'center',
      marginTop: ms(46),
    },
    watchValue: {
      fontSize: ms(30),
      fontWeight: '800',
      color: rarityColorHex,
    },
    watchName: {
      fontSize: ms(17),
      fontWeight: '600',
    },
    watchBrand: {
      fontSize: ms(14),
      color: theme.Colors.textSecondary,
    },
    footer: {
      alignItems: 'center',
      gap: ms(8),
      paddingHorizontal: ms(24),
      paddingBottom: mvs(20),
    },
    hint: {
      fontSize: ms(14),
      color: theme.Colors.textSecondary,
    },
    error: {
      fontSize: ms(14),
      textAlign: 'center',
      color: theme.Colors.danger,
    },
  })
