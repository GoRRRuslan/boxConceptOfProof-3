import type { StyleProp, TextStyle } from 'react-native'

import { AppText } from '@components/AppText'
import { useFacadeAnimatedCurrency } from '@components/AnimatedCurrencyText/_facades/useFacadeAnimatedCurrency'

interface IAnimatedCurrencyTextProps {
  valueInCents: number
  style?: StyleProp<TextStyle>
  testID?: string
}

// An amount of money (balance, total value) that counts to its new value.
export const AnimatedCurrencyText = ({ valueInCents, style, testID }: IAnimatedCurrencyTextProps) => {
  const text = useFacadeAnimatedCurrency(valueInCents)

  return (
    <AppText style={style} testID={testID}>
      {text}
    </AppText>
  )
}
