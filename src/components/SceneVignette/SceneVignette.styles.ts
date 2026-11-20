import { ScaledSheet } from 'react-native-size-matters'

export const makeStyles = () =>
  ScaledSheet.create({
    vignette: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  })
