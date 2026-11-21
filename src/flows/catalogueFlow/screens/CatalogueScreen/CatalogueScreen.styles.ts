import { ScaledSheet, ms } from 'react-native-size-matters'

import type { IThemePalette } from '@utils/designSystem/Theme'

import { LIST_TOP_PADDING } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'

export const makeStyles = (theme: IThemePalette) =>
  ScaledSheet.create({
    listRegion: {
      flex: 1,
    },
    listContent: {
      paddingTop: LIST_TOP_PADDING,
    },
    listLayer: {
      flex: 1,
    },
    sceneLayer: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    // The loader dims the scene and the list that are already behind it, so nothing is touched before the picture is steady.
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.Colors.scrim,
    },
    status: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: ms(12),
    },
  })
