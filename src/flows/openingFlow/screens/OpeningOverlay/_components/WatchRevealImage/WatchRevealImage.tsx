import { useMemo } from 'react'
import type { ImageSourcePropType } from 'react-native'
import Animated from 'react-native-reanimated'

import { useFacadeWatchReveal } from '@flows/openingFlow/screens/OpeningOverlay/_components/WatchRevealImage/_facades/useFacadeWatchReveal'
import { makeStyles } from '@flows/openingFlow/screens/OpeningOverlay/_components/WatchRevealImage/WatchRevealImage.styles'

interface IWatchRevealImageProps {
  source: ImageSourcePropType
}

export const WatchRevealImage = ({ source }: IWatchRevealImageProps) => {
  const styles = useMemo(() => makeStyles(), [])
  const { animatedStyle } = useFacadeWatchReveal()

  return <Animated.Image source={source} style={[styles.image, animatedStyle]} resizeMode="contain" testID="revealedWatchImage" />
}
