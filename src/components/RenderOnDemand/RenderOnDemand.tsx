import { useFacadeRenderOnDemand } from '@components/RenderOnDemand/_facades/useFacadeRenderOnDemand'

interface IRenderOnDemandProps {
  activityKey: string
  warmupKey: string
  warmupMilliseconds?: number
  minimumMilliseconds?: number
  minimumFrames?: number
  maximumMilliseconds?: number
  isContinuous?: boolean
}

// Renders nothing; place it inside a <FilamentScene>. Keeps the renderer running only while the
// scene is changing (see useFacadeRenderOnDemand).
export const RenderOnDemand = ({
  activityKey,
  warmupKey,
  warmupMilliseconds = 5000,
  minimumMilliseconds = 600,
  minimumFrames = 12,
  maximumMilliseconds = 10_000,
  isContinuous = false,
}: IRenderOnDemandProps) => {
  useFacadeRenderOnDemand({
    activityKey,
    warmupKey,
    warmupMilliseconds,
    minimumMilliseconds,
    minimumFrames,
    maximumMilliseconds,
    isContinuous,
  })

  return null
}
