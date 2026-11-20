import { ScaledSheet, ms, mvs } from 'react-native-size-matters'

import { EPerformanceOverlayPlacement } from '@components/PerformanceOverlay/_types'
import type { IThemePalette } from '@utils/designSystem/Theme'

export const makeStyles = (theme: IThemePalette, inset: number, placement: EPerformanceOverlayPlacement) =>
  ScaledSheet.create({
    container: {
      position: 'absolute',
      ...(placement === EPerformanceOverlayPlacement.Top ? { top: inset + mvs(8) } : { bottom: inset + mvs(8) }),
      left: ms(12),
      paddingHorizontal: ms(8),
      paddingVertical: mvs(4),
      borderRadius: ms(8),
      backgroundColor: theme.Colors.background,
      opacity: 0.85,
    },
    text: {
      fontSize: ms(12),
      color: theme.Colors.accent,
    },
  })
