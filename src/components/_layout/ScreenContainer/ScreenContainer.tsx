import { type PropsWithChildren, useMemo } from 'react'
import { View } from 'react-native'

import { useFacadeScreenContainer } from '@components/_layout/ScreenContainer/_facades/useFacadeScreenContainer'
import { makeStyles } from '@components/_layout/ScreenContainer/ScreenContainer.styles'
import { theme } from '@utils/designSystem/Theme'

interface IScreenContainerProps {
  withTopInset?: boolean
  withBottomInset?: boolean
  testID?: string
}

export const ScreenContainer = ({
  withTopInset = true,
  withBottomInset = true,
  testID,
  children,
}: PropsWithChildren<IScreenContainerProps>) => {
  // -------------------- Service hooks -------------------- //
  const { topPadding, bottomPadding } = useFacadeScreenContainer({ withTopInset, withBottomInset })
  const styles = useMemo(() => makeStyles(theme, topPadding, bottomPadding), [topPadding, bottomPadding])

  return (
    <View style={styles.container} testID={testID}>
      {children}
    </View>
  )
}
