import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { AnimatedCurrencyText } from '@components/AnimatedCurrencyText'
import { AppText } from '@components/AppText'
import { makeStyles } from '@components/ScreenHeader/ScreenHeader.styles'
import { theme } from '@utils/designSystem/Theme'

interface IScreenHeaderProps {
  titleText: string
  // The figure on the right, e.g. "Balance $950" or "Watches 3".
  trailingLabelText: string
  trailingValueInCents: number
  // An optional small action on the label line of the figure, e.g. "Reset balance".
  actionLabelText?: string
  onActionPress?: () => void
  testID?: string
}

// Title on the left, one labelled figure on the right: the same header on every tab.
export const ScreenHeader = ({
  titleText,
  trailingLabelText,
  trailingValueInCents,
  actionLabelText,
  onActionPress,
  testID = 'screenHeader',
}: IScreenHeaderProps) => {
  const styles = useMemo(() => makeStyles(theme), [])

  return (
    <View style={styles.container} testID={testID}>
      <AppText style={styles.title}>{titleText}</AppText>
      <View style={styles.trailing}>
        <View style={styles.trailingLabelRow}>
          {actionLabelText && onActionPress ? (
            <Pressable onPress={onActionPress} hitSlop={10} accessibilityRole="button" testID={`${testID}Action`}>
              <AppText style={styles.action}>{actionLabelText}</AppText>
            </Pressable>
          ) : null}
          <AppText style={styles.trailingLabel}>{trailingLabelText}</AppText>
        </View>
        <AnimatedCurrencyText valueInCents={trailingValueInCents} style={styles.trailingValue} testID={`${testID}Value`} />
      </View>
    </View>
  )
}
