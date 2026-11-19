import { RenderOnDemand } from '@components/RenderOnDemand'
import type { ICatalogueCard, ICatalogueSceneSync, ICatalogueViewport } from '@flows/catalogueFlow/_types'
import { useFacadeCatalogueBoxes } from '@flows/catalogueFlow/screens/CatalogueScreen/_components/CatalogueScene/_components/CatalogueBoxes/_facades/useFacadeCatalogueBoxes'
import type { IOpeningPhaseKey } from '@flows/openingFlow/_types'

interface ICatalogueBoxesProps {
  cards: ICatalogueCard[]
  viewport: ICatalogueViewport
  sceneSync: ICatalogueSceneSync
  phaseKey: IOpeningPhaseKey
  isRenderContinuous: boolean
}

// Renders nothing itself: it loads the box model and keeps the instances in sync with the list and
// with the opening experience.
export const CatalogueBoxes = ({
  cards,
  viewport,
  sceneSync,
  phaseKey,
  isRenderContinuous,
}: ICatalogueBoxesProps) => {
  const { modelState } = useFacadeCatalogueBoxes({ cards, viewport, sceneSync })

  // Keeps the renderer running while something moves; a still screen stops rendering (battery).
  return (
    <RenderOnDemand
      activityKey={`${cards.length}|${viewport.width}x${viewport.height}|${modelState}|${phaseKey}`}
      warmupKey={modelState}
      isContinuous={isRenderContinuous}
    />
  )
}
