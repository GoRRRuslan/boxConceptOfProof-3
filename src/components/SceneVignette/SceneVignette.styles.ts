import { ScaledSheet } from 'react-native-size-matters'

export const makeStyles = () =>
  ScaledSheet.create({
    vignette: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
  })
