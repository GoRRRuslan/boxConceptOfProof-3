import { useMemo } from 'react'

import { makeStyles } from '@flows/catalogueFlow/screens/CatalogueScreen/_components/CatalogueScene/CatalogueScene.styles'
import {
  type IMysterySceneCardLook,
  type IMysterySceneFrameStatsEvent,
  type IMysterySceneScrollSourceEvent,
  MysterySceneView,
} from '@mysteryScene'

interface ICatalogueSceneProps {
  cardLooks: IMysterySceneCardLook[]
  scrollViewTag: number | null
  isFrameStatsEnabled: boolean
  onFrameStats: (event: IMysterySceneFrameStatsEvent) => void
  onModelLoaded: () => void
  onScrollSourceChange: (event: IMysterySceneScrollSourceEvent) => void
}

// The ONE 3D scene of the app: a native view (SceneKit on iOS, Filament on Android) that fills the list area and
// sits behind the transparent cards. It loads the model, owns the frame loop and places every box itself.
export const CatalogueScene = ({ cardLooks, scrollViewTag, isFrameStatsEnabled, onFrameStats, onModelLoaded, onScrollSourceChange }: ICatalogueSceneProps) => {
  const styles = useMemo(() => makeStyles(), [])

  return (
    <MysterySceneView
      style={styles.scene}
      cards={cardLooks}
      scrollViewTag={scrollViewTag}
      isFrameStatsEnabled={isFrameStatsEnabled}
      onFrameStats={onFrameStats}
      onModelLoaded={onModelLoaded}
      onScrollSourceChange={onScrollSourceChange}
      testID="catalogueScene"
    />
  )
}
