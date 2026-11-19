import type { PropsWithChildren } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'

import { useFacadeFadingView } from '@components/FadingView/_facades/useFacadeFadingView'

interface IFadingViewProps {
  isVisible: boolean
  style?: StyleProp<ViewStyle>
  durationMilliseconds?: number
  testID?: string
}

// Fades its content in/out without unmounting it (a scrolled list keeps its position). While it is
// hidden it does not receive touches.
export const FadingView = ({
  isVisible,
  style,
  durationMilliseconds = 300,
  testID,
  children,
}: PropsWithChildren<IFadingViewProps>) => {
  const { animatedStyle } = useFacadeFadingView({ isVisible, durationMilliseconds })

  return (
    <Animated.View style={[style, animatedStyle]} pointerEvents={isVisible ? 'auto' : 'none'} testID={testID}>
      {children}
    </Animated.View>
  )
}
