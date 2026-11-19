import { useMemo } from 'react'
import { Camera, EnvironmentalLight, FilamentView, type FrameInfo, Light } from 'react-native-filament'

import { CAMERA_DISTANCE, CAMERA_FOCAL_LENGTH_MILLIMETERS } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { ENVIRONMENT_LIGHT_INTENSITY, SCENE_LIGHTS } from '@flows/catalogueFlow/_config/sceneRenderConfig'
import type { ICatalogueCard, ICatalogueSceneSync, ICatalogueViewport } from '@flows/catalogueFlow/_types'
import { CatalogueBoxes } from '@flows/catalogueFlow/screens/CatalogueScreen/_components/CatalogueScene/_components/CatalogueBoxes/CatalogueBoxes'
import { makeStyles } from '@flows/catalogueFlow/screens/CatalogueScreen/_components/CatalogueScene/CatalogueScene.styles'
import type { IOpeningPhaseKey } from '@flows/openingFlow/_types'

interface ICatalogueSceneProps {
  cards: ICatalogueCard[]
  viewport: ICatalogueViewport | null
  sceneSync: ICatalogueSceneSync
  phaseKey: IOpeningPhaseKey
  isRenderContinuous: boolean
  renderCallback: (frameInfo: FrameInfo) => void
}

// The ONE 3D canvas of the app; it fills the list area and sits behind the transparent cards.
export const CatalogueScene = ({
  cards,
  viewport,
  sceneSync,
  phaseKey,
  isRenderContinuous,
  renderCallback,
}: ICatalogueSceneProps) => {
  const styles = useMemo(() => makeStyles(), [])

  return (
    <FilamentView style={styles.filamentView} renderCallback={renderCallback} testID="catalogueFilamentView">
      <Camera
        cameraPosition={[0, 0, CAMERA_DISTANCE]}
        cameraTarget={[0, 0, 0]}
        focalLengthInMillimeters={CAMERA_FOCAL_LENGTH_MILLIMETERS}
      />
      <EnvironmentalLight source={{ uri: 'RNF_default_env_ibl.ktx' }} intensity={ENVIRONMENT_LIGHT_INTENSITY} />
      {SCENE_LIGHTS.map(light => (
        <Light
          key={light.direction.join()}
          type="directional"
          intensity={light.intensity}
          colorKelvin={light.colorKelvin}
          direction={light.direction}
          castShadows={light.castShadows}
        />
      ))}
      {cards.length > 0 && viewport ? (
        <CatalogueBoxes
          key={cards.length}
          cards={cards}
          viewport={viewport}
          sceneSync={sceneSync}
          phaseKey={phaseKey}
          isRenderContinuous={isRenderContinuous}
        />
      ) : null}
    </FilamentView>
  )
}
