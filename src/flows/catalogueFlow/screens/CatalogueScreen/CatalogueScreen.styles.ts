import { ScaledSheet, ms } from 'react-native-size-matters'

import { LIST_TOP_PADDING } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'

export const makeStyles = () =>
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
