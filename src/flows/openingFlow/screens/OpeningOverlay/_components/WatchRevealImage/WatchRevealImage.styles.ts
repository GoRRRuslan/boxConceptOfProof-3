import { ScaledSheet, ms } from 'react-native-size-matters'

export const makeStyles = () =>
  ScaledSheet.create({
    image: {
      width: ms(135),
      height: ms(200),
    },
  })
