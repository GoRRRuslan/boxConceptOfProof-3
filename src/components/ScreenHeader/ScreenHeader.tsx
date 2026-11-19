import { useMemo } from 'react'
import { View } from 'react-native'

import { AnimatedCurrencyText } from '@components/AnimatedCurrencyText'
import { AppText } from '@components/AppText'
import { makeStyles } from '@components/ScreenHeader/ScreenHeader.styles'
import { theme } from '@utils/designSystem/Theme'

interface IScreenHeaderProps {
  titleText: string
  // The figure on the right, e.g. "Balance $950" or "Watches 3".
  trailingLabelText: string
  trailingValueInCents: number
  testID?: string
}

// Title on the left, one labelled figure on the right: the same header on every tab.
export const ScreenHeader = ({ titleText, trailingLabelText, trailingValueInCents, testID = 'screenHeader' }: IScreenHeaderProps) => {
  const styles = useMemo(() => makeStyles(theme), [])

  return (
    <View style={styles.container} testID={testID}>
      <AppText style={styles.title}>{titleText}</AppText>
      <View style={styles.trailing}>
        <AppText style={styles.trailingLabel}>{trailingLabelText}</AppText>
        <AnimatedCurrencyText valueInCents={trailingValueInCents} style={styles.trailingValue} testID={`${testID}Value`} />
      </View>
    </View>
  )
}
