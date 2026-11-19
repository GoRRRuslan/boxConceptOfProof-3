import { useMemo } from 'react'
import { Text, type TextProps } from 'react-native'

import { makeStyles } from '@components/AppText/AppText.styles'
import { theme } from '@utils/designSystem/Theme'

export const AppText = ({ style, ...restProps }: TextProps) => {
  const styles = useMemo(() => makeStyles(theme), [])

  return <Text {...restProps} style={[styles.text, style]} />
}
