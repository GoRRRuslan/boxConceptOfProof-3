import { BOX_CENTER_HEIGHT_UNITS, ENTRANCE_STAGGER_MILLISECONDS } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { computeBoxPose } from '@flows/catalogueFlow/_facadesLogic/computeBoxPose'
import {
  INITIAL_PRESS_STATE,
  type IPressState,
  computeEntranceScale,
  computePressScale,
  endPress,
  startPress,
} from '@flows/catalogueFlow/_facadesLogic/computeCardAnimation'
import { DRAG_RADIANS_PER_PIXEL, TILT_PITCH_RADIANS, TILT_YAW_RADIANS } from '@flows/openingFlow/_config/openingConfig'
import { computeOpeningPose } from '@flows/openingFlow/_facadesLogic/computeOpeningPose'
import { easeInOutCubic, easeOutBack } from '@flows/openingFlow/_facadesLogic/openingEasing'
import {
  INITIAL_OPENING_SCENE_STATE,
  computeAnticipationEffect,
  computeGlowStrength,
  getAnticipationProgress,
  getFocusProgress,
  getLidProgress,
  getTuckProgress,
  setGlowColor,
  startClose,
  startFocus,
  startLidOpen,
  startTuck,
} from '@flows/openingFlow/_facadesLogic/openingSceneState'
import {
  INITIAL_DRAG_STATE,
  applyDragMovement,
  applyZoom,
  isDragStateAnimating,
  releaseDrag,
  requestReset,
  stepDragInertia,
} from '@flows/openingFlow/_facadesLogic/stepDragInertia'
import type { IDragState, IOpeningSceneState } from '@flows/openingFlow/_types'
import { LID_FULLY_OPEN_ANGLE_DEGREES, computeLidHingeTransform } from '@services/sceneReference/computeLidHingeTransform'

// REFERENCE IMPLEMENTATION. The app does not run this: the 3D scene is a native module (Swift / Kotlin) that owns
// this logic. This file is the original TypeScript version of the per-frame scene maths (it is what the render callback
// of the previous, JavaScript-driven version ran on every frame). It generates the shared test vectors
// (`modules/mystery-scene/test-vectors/sceneVectors.json`) that the XCTest and JUnit suites replay against the
// native ports, which proves that both platforms compute the same poses.

export enum ESceneCommandKind {
  ModelReady = 'modelReady',
  CardCount = 'cardCount',
  Scroll = 'scroll',
  PressIn = 'pressIn',
  PressOut = 'pressOut',
  Focus = 'focus',
  Close = 'close',
  OpenLid = 'openLid',
  GlowColor = 'glowColor',
  Tuck = 'tuck',
  DragBy = 'dragBy',
  DragEnd = 'dragEnd',
  Pinch = 'pinch',
  ResetView = 'resetView',
  Tilt = 'tilt',
}

export interface ISceneCommand {
  kind: ESceneCommandKind
  // Meaning depends on the kind: index / offset / count / dx / velocityX / factor / tiltX / red.
  a?: number
  // dy / velocityY / tiltY / green.
  b?: number
  // blue.
  c?: number
}

export interface ISceneFrameCard {
  isVisible: boolean
  scale: number
  pitchRadians: number
  yawRadians: number
  translateY: number
  translateZ: number
}

export interface ISceneFrame {
  cards: ISceneFrameCard[]
  focusedCardIndex: number
  lidAngleRadians: number
  lidTranslateY: number
  lidTranslateZ: number
  glowStrength: number
  glowColorLinear: [number, number, number]
}

const MAXIMUM_FRAME_SECONDS = 0.05

export class SceneReference {
  private cardCount = 0
  private scrollOffset = 0
  private scene: IOpeningSceneState = INITIAL_OPENING_SCENE_STATE
  private drag: IDragState = INITIAL_DRAG_STATE
  private press: IPressState = INITIAL_PRESS_STATE
  private tilt: [number, number] = [0, 0]
  private entranceStartedAt: number | null = null

  public constructor(
    private readonly viewportWidth: number,
    private readonly viewportHeight: number,
  ) {}

  public apply(command: ISceneCommand, now: number): void {
    const a = command.a ?? 0
    const b = command.b ?? 0

    switch (command.kind) {
      case ESceneCommandKind.ModelReady:
        this.entranceStartedAt ??= now
        break
      case ESceneCommandKind.CardCount:
        if (a !== this.cardCount) {
          this.cardCount = a

          if (this.entranceStartedAt !== null) {
            this.entranceStartedAt = now
          }
        }

        break
      case ESceneCommandKind.Scroll:
        this.scrollOffset = a
        break
      case ESceneCommandKind.PressIn:
        this.press = startPress(this.press, a, now)
        break
      case ESceneCommandKind.PressOut:
        this.press = endPress(this.press, now)
        break
      case ESceneCommandKind.Focus:
        this.drag = { ...INITIAL_DRAG_STATE, lastInteractionAtMilliseconds: now }

        this.scene = startFocus(this.scene, a, now)
        break
      case ESceneCommandKind.Close:
        this.scene = startClose(this.scene, now)
        break
      case ESceneCommandKind.OpenLid:
        this.scene = startLidOpen(this.scene, now)

        this.drag = requestReset(this.drag, now)
        break
      case ESceneCommandKind.GlowColor:
        this.scene = setGlowColor(this.scene, [a, b, command.c ?? 0])
        break
      case ESceneCommandKind.Tuck:
        this.scene = startTuck(this.scene, now)
        break
      case ESceneCommandKind.DragBy:
        this.drag = applyDragMovement(this.drag, a, b, DRAG_RADIANS_PER_PIXEL, now)
        break
      case ESceneCommandKind.DragEnd:
        this.drag = { ...releaseDrag(this.drag, a * DRAG_RADIANS_PER_PIXEL, b * DRAG_RADIANS_PER_PIXEL, now), isDragging: false }
        break
      case ESceneCommandKind.Pinch:
        this.drag = applyZoom(this.drag, a, now)
        break
      case ESceneCommandKind.ResetView:
        this.drag = requestReset(this.drag, now)
        break
      case ESceneCommandKind.Tilt:
        this.tilt = [a, b]
        break
    }
  }

  // The body of the old render callback, one frame.
  public computeFrame(now: number, rawDeltaSeconds: number): ISceneFrame {
    const deltaSeconds = Math.min(rawDeltaSeconds, MAXIMUM_FRAME_SECONDS)
    const { scene } = this
    const focusLinearProgress = getFocusProgress(scene, now)
    const focusProgress = easeInOutCubic(focusLinearProgress)
    const dollyProgress = easeOutBack(focusLinearProgress)
    const lidProgress = getLidProgress(scene, now)
    const tuckProgress = easeInOutCubic(getTuckProgress(scene, now))
    const anticipation = computeAnticipationEffect(getAnticipationProgress(scene, now), now)
    const lidAngleRadians =
      (LID_FULLY_OPEN_ANGLE_DEGREES * (scene.lidTarget === 1 ? easeOutBack(lidProgress) : easeInOutCubic(lidProgress)) * Math.PI) / 180
    const isAutoRotateAllowed = scene.focusTarget === 1 && scene.lidTarget === 0 && focusLinearProgress >= 1

    if (isDragStateAnimating(this.drag, isAutoRotateAllowed)) {
      this.drag = stepDragInertia(this.drag, deltaSeconds, now, isAutoRotateAllowed)
    }

    const { drag } = this
    const [tiltX, tiltY] = scene.focusTarget === 1 ? this.tilt : [0, 0]
    const pressScale = computePressScale(this.press, now)
    const entranceStart = this.entranceStartedAt ?? Number.MAX_VALUE
    const cards: ISceneFrameCard[] = []

    for (let cardIndex = 0; cardIndex < this.cardCount; cardIndex += 1) {
      const listPose = computeBoxPose({ cardIndex, scrollOffset: this.scrollOffset, viewportHeight: this.viewportHeight })
      const entranceScale = computeEntranceScale(now - entranceStart - cardIndex * ENTRANCE_STAGGER_MILLISECONDS)
      const squeeze = this.press.cardIndex === cardIndex ? pressScale : 1
      const pose = computeOpeningPose({
        listPose: { ...listPose, scale: listPose.scale * entranceScale * squeeze },
        isFocusedCard: cardIndex === scene.focusedCardIndex,
        lidProgress,
        focusProgress,
        dollyProgress,
        viewportWidth: this.viewportWidth,
        viewportHeight: this.viewportHeight,
        dragYawRadians: drag.yawRadians,
        dragPitchRadians: drag.pitchRadians,
        zoom: drag.zoom,
        autoYawRadians: drag.autoYawRadians,
        tiltYawRadians: tiltX * TILT_YAW_RADIANS,
        tiltPitchRadians: tiltY * TILT_PITCH_RADIANS,
        anticipation,
        tuckProgress,
      })

      cards.push({
        isVisible: pose.isVisible,
        scale: pose.scale,
        pitchRadians: pose.pitchRadians,
        yawRadians: pose.yawRadians,
        translateY: pose.translateY,
        translateZ: pose.translateZ,
      })
    }

    const hinge = computeLidHingeTransform((lidAngleRadians * 180) / Math.PI)
    const hasFocusedCard = scene.focusedCardIndex >= 0 && scene.focusedCardIndex < this.cardCount

    return {
      cards,
      focusedCardIndex: hasFocusedCard ? scene.focusedCardIndex : -1,
      lidAngleRadians,
      lidTranslateY: hinge.translate[1],
      lidTranslateZ: hinge.translate[2],
      glowStrength: computeGlowStrength(lidProgress, now),
      glowColorLinear: scene.glowColorLinear,
    }
  }
}

// The model's centre is moved to the origin before the pose is applied (kept here for the native ports to document).
export const MODEL_CENTER_OFFSET_Y = -BOX_CENTER_HEIGHT_UNITS
