import { useMemo } from 'react'
import { Image } from 'react-native'

import vignetteSource from '@assets/images/app/vignette.png'
import { makeStyles } from '@components/SceneVignette/SceneVignette.styles'

// A soft dark vignette over the 3D scene (below the texts of the list): it pulls the eye to the middle, where the box is.
export const SceneVignette = () => {
  const styles = useMemo(() => makeStyles(), [])

  return <Image source={vignetteSource} style={styles.vignette} resizeMode="stretch" pointerEvents="none" testID="sceneVignette" />
}
