import { ScaledSheet, ms } from 'react-native-size-matters'

export const makeStyles = () =>
  ScaledSheet.create({
    container: {
      width: ms(135),
      height: ms(200),
    },
    image: {
      width: ms(135),
      height: ms(200),
    },
    glint: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
  })
