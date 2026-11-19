import { useEffect, useMemo } from 'react'
import {
  RenderCallbackContext,
  useConfigureAssetShadow,
  useFilamentContext,
  useModel,
  useWorkletEffect,
} from 'react-native-filament'
import { createSynchronizable } from 'react-native-worklets'

import boxModelSource from '@assets/models/box.glb'
import { BOX_CENTER_HEIGHT_UNITS, ENTRANCE_STAGGER_MILLISECONDS } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { computeBoxPose } from '@flows/catalogueFlow/_facadesLogic/computeBoxPose'
import { computeEntranceScale, computePressScale } from '@flows/catalogueFlow/_facadesLogic/computeCardAnimation'
import type { ICatalogueCard, ICatalogueSceneSync, ICatalogueViewport } from '@flows/catalogueFlow/_types'
import { TILT_PITCH_RADIANS, TILT_YAW_RADIANS } from '@flows/openingFlow/_config/openingConfig'
import { computeOpeningPose } from '@flows/openingFlow/_facadesLogic/computeOpeningPose'
import { easeInOutCubic, easeOutBack } from '@flows/openingFlow/_facadesLogic/openingEasing'
import {
  computeAnticipationEffect,
  computeGlowStrength,
  getAnticipationProgress,
  getFocusProgress,
  getLidProgress,
  getTuckProgress,
} from '@flows/openingFlow/_facadesLogic/openingSceneState'
import { isDragStateAnimating, stepDragInertia } from '@flows/openingFlow/_facadesLogic/stepDragInertia'
import { LID_FULLY_OPEN_ANGLE_DEGREES, LID_HINGE_PIVOT } from '@services/filament/computeLidHingeTransform'

interface IUseFacadeCatalogueBoxesParams {
  cards: ICatalogueCard[]
  viewport: ICatalogueViewport
  sceneSync: ICatalogueSceneSync
}

// Parts of the model (docs/MODEL.md). The first primitive of base and lid is the outer body surface;
// the cushion and the inside of the lid (second primitive) are what the light inside the box falls on.
enum EBoxPartName {
  Base = 'Shell_Base',
  Lid = 'Shell_Lid',
  Wordmark = 'Shell_Wordmark',
  Cushion = 'Shell_Fitted_Cushion',
}

const BODY_PRIMITIVE_BY_PART: Record<string, number> = { [EBoxPartName.Base]: 0, [EBoxPartName.Lid]: 0 }
const GLOW_PRIMITIVE_BY_PART: Record<string, number> = { [EBoxPartName.Cushion]: 0, [EBoxPartName.Lid]: 1 }
const LID_PART_NAMES: string[] = [EBoxPartName.Lid, EBoxPartName.Wordmark]
const MAXIMUM_FRAME_SECONDS = 0.05
const PARKED_HEIGHT = -1000
// Before the model is loaded the entrance has not started: the boxes are invisible until it does.
const ENTRANCE_NOT_STARTED = Number.MAX_SAFE_INTEGER

// One GLB loaded once, one instance per card. Every frame each instance is placed for the current
// scroll offset and opening state: in its card (popping in on first appearance, squeezed while pressed),
// or (for the opened box) centred and pushed towards the camera, turned by the finger / device tilt /
// auto-rotation, zoomed, shaking before the lid swings open, with light glowing from inside.
export const useFacadeCatalogueBoxes = ({ cards, viewport, sceneSync }: IUseFacadeCatalogueBoxesParams) => {
  const { transformManager, renderableManager, nameComponentManager } = useFilamentContext()
  const model = useModel(boxModelSource, { instanceCount: cards.length })
  const { width: viewportWidth, height: viewportHeight } = viewport
  const { scrollOffset, openingScene, dragState, tilt, pressState } = sceneSync

  // -------------------------- Values ------------------------- //
  const entranceStartedAt = useMemo(() => createSynchronizable<number>(ENTRANCE_NOT_STARTED), [])
  // Last glow strength written to a box (so a material is only touched when the strength really changes).
  const lastGlowStrength = useMemo(() => createSynchronizable<number>(0), [])
  const instances = useMemo(() => (model.state === 'loaded' ? model.asset.getAssetInstances() : []), [model])
  const rootEntities = useMemo(() => instances.map(instance => instance.getRoot()), [instances])
  const lidEntitiesByCard = useMemo(
    () =>
      instances.map(instance =>
        instance.getEntities().filter(entity => LID_PART_NAMES.includes(nameComponentManager.getEntityName(entity) ?? ''))),
    [instances, nameComponentManager],
  )
  const glowTargetsByCard = useMemo(
    () =>
      instances.map(instance =>
        instance.getEntities().flatMap(entity => {
          const partName = nameComponentManager.getEntityName(entity)
          const primitiveIndex = partName === undefined ? undefined : GLOW_PRIMITIVE_BY_PART[partName]

          return primitiveIndex === undefined ? [] : [{ entity, primitiveIndex }]
        })),
    [instances, nameComponentManager],
  )
  const looks = useMemo(() => cards.map(card => ({ color: card.colorLinearRgba, finish: card.finish })), [cards])

  // ------------------- Side effects ----------------------- //
  // The boxes cast and receive shadows (the lid shades the inside, the base shades itself).
  useConfigureAssetShadow({
    renderableManager,
    ...(model.state === 'loaded' ? { asset: model.asset } : {}),
    castShadow: true,
    receiveShadow: true,
  })

  // The entrance (boxes popping in one after the other) starts the moment the model is ready.
  useEffect(() => {
    if (model.state === 'loaded') {
      entranceStartedAt.setBlocking(Date.now())
    }
  }, [model.state, entranceStartedAt])

  // Look of every box: the outer body (base and lid) gets the colour and the finish (matte ... glossy metal) of its card.
  useWorkletEffect(() => {
    'worklet'

    instances.forEach((instance, instanceIndex) => {
      instance.getEntities().forEach(entity => {
        const partName = nameComponentManager.getEntityName(entity)
        const bodyPrimitiveIndex = partName === undefined ? undefined : BODY_PRIMITIVE_BY_PART[partName]

        if (bodyPrimitiveIndex !== undefined) {
          const { color, finish } = looks[instanceIndex]
          const materialInstance = renderableManager.getMaterialInstanceAt(entity, bodyPrimitiveIndex)

          materialInstance.setFloat4Parameter('baseColorFactor', color)

          materialInstance.setFloatParameter('roughnessFactor', finish.roughness)

          materialInstance.setFloatParameter('metallicFactor', finish.metallic)

          materialInstance.setFloatParameter('clearCoatFactor', finish.clearCoat)
        }
      })
    })
  })

  // Runs on the Filament runtime right before every frame, no React involved.
  RenderCallbackContext.useRenderCallback(
    frameInfo => {
      'worklet'

      if (viewportHeight === 0) {
        return
      }

      const nowMilliseconds = Date.now()
      const deltaSeconds = Math.min(frameInfo.timeSinceLastFrame, MAXIMUM_FRAME_SECONDS)
      const scene = openingScene.getBlocking()
      const currentScrollOffset = scrollOffset.getBlocking()
      const focusLinearProgress = getFocusProgress(scene, nowMilliseconds)
      const focusProgress = easeInOutCubic(focusLinearProgress)
      const dollyProgress = easeOutBack(focusLinearProgress)
      const lidProgress = getLidProgress(scene, nowMilliseconds)
      const tuckProgress = easeInOutCubic(getTuckProgress(scene, nowMilliseconds))
      const anticipation = computeAnticipationEffect(getAnticipationProgress(scene, nowMilliseconds), nowMilliseconds)
      const lidAngleRadians =
        (LID_FULLY_OPEN_ANGLE_DEGREES * (scene.lidTarget === 1 ? easeOutBack(lidProgress) : easeInOutCubic(lidProgress)) * Math.PI) / 180

      // Inspection physics: inertia after a flick, gliding back after a double tap, slow auto-rotation when left alone.
      const isAutoRotateAllowed = scene.focusTarget === 1 && scene.lidTarget === 0 && focusLinearProgress >= 1
      let drag = dragState.getBlocking()

      if (isDragStateAnimating(drag, isAutoRotateAllowed)) {
        drag = stepDragInertia(drag, deltaSeconds, nowMilliseconds, isAutoRotateAllowed)

        dragState.setBlocking(drag)
      }

      const [tiltX, tiltY] = scene.focusTarget === 1 ? tilt.getBlocking() : [0, 0]
      const press = pressState.getBlocking()
      const pressScale = computePressScale(press, nowMilliseconds)
      const entranceStart = entranceStartedAt.getBlocking()

      rootEntities.forEach((rootEntity, cardIndex) => {
        const listPose = computeBoxPose({ cardIndex, scrollOffset: currentScrollOffset, viewportHeight })
        const entranceScale = computeEntranceScale(nowMilliseconds - entranceStart - cardIndex * ENTRANCE_STAGGER_MILLISECONDS)
        const squeeze = press.cardIndex === cardIndex ? pressScale : 1
        const pose = computeOpeningPose({
          listPose: { ...listPose, scale: listPose.scale * entranceScale * squeeze },
          isFocusedCard: cardIndex === scene.focusedCardIndex,
          lidProgress,
          focusProgress,
          dollyProgress,
          viewportWidth,
          viewportHeight,
          dragYawRadians: drag.yawRadians,
          dragPitchRadians: drag.pitchRadians,
          zoom: drag.zoom,
          autoYawRadians: drag.autoYawRadians,
          tiltYawRadians: tiltX * TILT_YAW_RADIANS,
          tiltPitchRadians: tiltY * TILT_PITCH_RADIANS,
          anticipation,
          tuckProgress,
        })
        const matrix = transformManager
          .createIdentityMatrix()
          .translate([0, -BOX_CENTER_HEIGHT_UNITS, 0])
          .scaling([pose.scale, pose.scale, pose.scale])
          .rotate(pose.pitchRadians, [1, 0, 0])
          .rotate(pose.yawRadians, [0, 1, 0])
          .translate([0, pose.isVisible ? pose.translateY : PARKED_HEIGHT, pose.translateZ])

        transformManager.setTransform(rootEntity, matrix)
      })

      // The lid (and its wordmark) of the opened box swings about the hinge pivot.
      const lidEntities = lidEntitiesByCard[scene.focusedCardIndex]

      if (lidEntities) {
        const [, pivotY, pivotZ] = LID_HINGE_PIVOT
        const hingeMatrix = transformManager
          .createIdentityMatrix()
          .translate([0, -pivotY, -pivotZ])
          .rotate(lidAngleRadians, [1, 0, 0])
          .translate([0, pivotY, pivotZ])

        lidEntities.forEach(lidEntity => {
          transformManager.setTransform(lidEntity, hingeMatrix)
        })
      }

      // Light from inside the opened box: the cushion and the inner side of the lid glow in the colour of the prize.
      const glowTargets = glowTargetsByCard[scene.focusedCardIndex]
      const glowStrength = computeGlowStrength(lidProgress, nowMilliseconds)

      if (glowTargets && Math.abs(glowStrength - lastGlowStrength.getBlocking()) > 0.002) {
        const [red, green, blue] = scene.glowColorLinear

        glowTargets.forEach(({ entity, primitiveIndex }) => {
          renderableManager
            .getMaterialInstanceAt(entity, primitiveIndex)
            .setFloat4Parameter('emissiveFactor', [red * glowStrength, green * glowStrength, blue * glowStrength, 1])
        })

        lastGlowStrength.setBlocking(glowStrength)
      }
    },
    [
      transformManager,
      renderableManager,
      rootEntities,
      lidEntitiesByCard,
      glowTargetsByCard,
      scrollOffset,
      openingScene,
      dragState,
      tilt,
      pressState,
      entranceStartedAt,
      lastGlowStrength,
      viewportWidth,
      viewportHeight,
    ],
  )

  return { modelState: model.state }
}
