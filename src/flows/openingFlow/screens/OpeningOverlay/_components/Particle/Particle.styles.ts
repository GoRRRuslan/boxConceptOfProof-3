import { ScaledSheet } from 'react-native-size-matters'

export const makeStyles = (size: number, colorHex: string) =>
  ScaledSheet.create({
    particle: {
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colorHex,
    },
  })
