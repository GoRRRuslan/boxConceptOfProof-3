import { ScaledSheet, ms, mvs } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette, colorHex: string) =>
  ScaledSheet.create({
    glowContainer: {
      position: 'absolute',
      // Big, pulsing circles centred on the watch image (the pill above it is about ms(38) high); the prize texts start below them.
      top: ms(13),
      alignSelf: 'center',
      width: ms(250),
      height: ms(250),
      alignItems: 'center',
      justifyContent: 'center',
    },
    outerGlow: {
      position: 'absolute',
      width: ms(250),
      height: ms(250),
      borderRadius: ms(125),
      backgroundColor: colorHex,
    },
    innerGlow: {
      position: 'absolute',
      width: ms(176),
      height: ms(176),
      borderRadius: ms(88),
      backgroundColor: colorHex,
    },
    flash: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.Colors.flash,
    },
    // Particles fly out from the middle of the watch image.
    particleOrigin: {
      position: 'absolute',
      // Middle of the watch image: the reveal block starts at mvs(24), the rarity pill above the image is about ms(38).
      top: mvs(24) + ms(138),
      alignSelf: 'center',
      width: 1,
      height: 1,
    },
  })
