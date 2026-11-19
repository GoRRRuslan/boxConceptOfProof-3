package expo.modules.mysteryscene.math

data class CardFrame(
  val isVisible: Boolean,
  val scale: Double,
  val pitchRadians: Double,
  val yawRadians: Double,
  val translateY: Double,
  val translateZ: Double,
)

data class SceneFrame(
  val cards: List<CardFrame>,
  /** The card whose lid swings and whose inside glows (-1 = none). */
  val focusedCardIndex: Int,
  val lidAngleRadians: Double,
  val lidTranslateY: Double,
  val lidTranslateZ: Double,
  val glowStrength: Double,
  val glowColorLinear: List<Double>,
)

/**
 * The whole state machine of the scene: owns the scroll offset, the opening state, the drag physics and the press / entrance
 * animations, and turns "now" into one [SceneFrame] (a pose per box). It knows nothing about the 3D engine, so it is unit tested
 * against the TypeScript reference. Not thread safe: the platform wrapper guards it with a lock.
 */
class SceneController {
  var cardCount = 0
    private set
  private var scrollOffset = 0.0
  private var openingScene = OpeningSceneState()
  private var dragState = DragState()
  private var pressState = PressState()
  private var tiltX = 0.0
  private var tiltY = 0.0
  private var entranceStartedAt: Double? = null
  private var wakeUntilMilliseconds = 0.0

  fun setCardCount(count: Int, now: Double) {
    if (count == cardCount) return
    cardCount = count
    if (entranceStartedAt != null) entranceStartedAt = now
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  /** The box model is ready: the boxes pop in one after another from now on. */
  fun markModelReady(now: Double) {
    if (entranceStartedAt == null) entranceStartedAt = now
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  fun setScrollOffset(offset: Double, now: Double) {
    if (offset == scrollOffset) return
    scrollOffset = offset
    hold(now, SCROLL_HOLD_MILLISECONDS)
  }

  fun pressIn(cardIndex: Int, now: Double) {
    pressState = startPress(pressState, cardIndex, now)
    hold(now, SceneConfig.PRESS_DURATION_MILLISECONDS + 50)
  }

  fun pressOut(now: Double) {
    pressState = endPress(pressState, now)
    hold(now, SceneConfig.PRESS_DURATION_MILLISECONDS + 50)
  }

  fun focus(cardIndex: Int, now: Double) {
    dragState = DragState(lastInteractionAtMilliseconds = now)
    openingScene = startFocus(openingScene, cardIndex, now)
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  fun close(now: Double) {
    openingScene = startClose(openingScene, now)
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  /** Anticipation, then the lid; the box glides back to its base pose meanwhile. */
  fun openLid(now: Double) {
    openingScene = startLidOpen(openingScene, now)
    dragState = requestReset(dragState, now)
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  fun setGlowColor(color: List<Double>, now: Double) {
    openingScene = withGlowColor(openingScene, color)
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  fun tuck(now: Double) {
    openingScene = startTuck(openingScene, now)
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  fun dragBy(deltaX: Double, deltaY: Double, now: Double) {
    dragState = applyDragMovement(dragState, deltaX, deltaY, SceneConfig.DRAG_RADIANS_PER_PIXEL, now)
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  /** The finger lifted: velocities are in pixels per second, the box keeps turning with them. */
  fun dragEnd(velocityX: Double, velocityY: Double, now: Double) {
    dragState = releaseDrag(dragState, velocityX * SceneConfig.DRAG_RADIANS_PER_PIXEL, velocityY * SceneConfig.DRAG_RADIANS_PER_PIXEL, now)
      .copy(isDragging = false)
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  fun pinch(factor: Double, now: Double) {
    dragState = applyZoom(dragState, factor, now)
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  fun resetView(now: Double) {
    dragState = requestReset(dragState, now)
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  fun setTilt(x: Double, y: Double, now: Double) {
    tiltX = x
    tiltY = y
    hold(now, COMMAND_HOLD_MILLISECONDS)
  }

  private fun hold(now: Double, milliseconds: Double) {
    wakeUntilMilliseconds = maxOf(wakeUntilMilliseconds, now + milliseconds)
  }

  fun computeFrame(now: Double, rawDeltaSeconds: Double, viewportWidth: Double, viewportHeight: Double): SceneFrame {
    val deltaSeconds = minOf(rawDeltaSeconds, SceneConfig.MAXIMUM_FRAME_SECONDS)
    val scene = openingScene
    val focusLinearProgress = getFocusProgress(scene, now)
    val focusProgress = easeInOutCubic(focusLinearProgress)
    val dollyProgress = easeOutBack(focusLinearProgress)
    val lidProgress = getLidProgress(scene, now)
    val tuckProgress = easeInOutCubic(getTuckProgress(scene, now))
    val anticipation = computeAnticipationEffect(getAnticipationProgress(scene, now), now)
    val lidAngleRadians = computeLidAngleRadians(lidProgress, scene.lidTarget == 1.0)

    val isAutoRotateAllowed = scene.focusTarget == 1.0 && scene.lidTarget == 0.0 && focusLinearProgress >= 1
    if (isDragStateAnimating(dragState, isAutoRotateAllowed)) {
      dragState = stepDragInertia(dragState, deltaSeconds, now, isAutoRotateAllowed)
    }
    val drag = dragState

    val effectiveTiltX = if (scene.focusTarget == 1.0) tiltX else 0.0
    val effectiveTiltY = if (scene.focusTarget == 1.0) tiltY else 0.0
    val pressScale = computePressScale(pressState, now)
    val entranceStart = entranceStartedAt ?: Double.MAX_VALUE

    val cards = ArrayList<CardFrame>(cardCount)
    for (cardIndex in 0 until cardCount) {
      val listPose = computeBoxPose(cardIndex, scrollOffset, viewportHeight)
      val entranceScale = computeEntranceScale(now - entranceStart - cardIndex * SceneConfig.ENTRANCE_STAGGER_MILLISECONDS)
      val squeeze = if (pressState.cardIndex == cardIndex) pressScale else 1.0
      val pose = computeOpeningPose(
        OpeningPoseInput(
          listPose = listPose.copy(scale = listPose.scale * entranceScale * squeeze),
          isFocusedCard = cardIndex == scene.focusedCardIndex,
          lidProgress = lidProgress, focusProgress = focusProgress, dollyProgress = dollyProgress,
          viewportWidth = viewportWidth, viewportHeight = viewportHeight,
          dragYawRadians = drag.yawRadians, dragPitchRadians = drag.pitchRadians, zoom = drag.zoom, autoYawRadians = drag.autoYawRadians,
          tiltYawRadians = effectiveTiltX * SceneConfig.TILT_YAW_RADIANS, tiltPitchRadians = effectiveTiltY * SceneConfig.TILT_PITCH_RADIANS,
          anticipation = anticipation, tuckProgress = tuckProgress,
        ),
      )
      cards.add(CardFrame(pose.isVisible, pose.scale, pose.pitchRadians, pose.yawRadians, pose.translateY, pose.translateZ))
    }

    val hinge = computeLidHingeTransform(lidAngleRadians * 180 / Math.PI)
    val hasFocusedCard = scene.focusedCardIndex in 0 until cardCount
    return SceneFrame(
      cards, if (hasFocusedCard) scene.focusedCardIndex else -1, lidAngleRadians, hinge.translateY, hinge.translateZ,
      computeGlowStrength(lidProgress, now), scene.glowColorLinear,
    )
  }

  /** True while something moves (or is about to): the render loop keeps running; otherwise the GPU rests. */
  fun needsFrames(now: Double): Boolean {
    if (now < wakeUntilMilliseconds) return true
    val scene = openingScene

    val start = entranceStartedAt
    if (start != null && now < start + maxOf(cardCount - 1, 0) * SceneConfig.ENTRANCE_STAGGER_MILLISECONDS + SceneConfig.ENTRANCE_DURATION_MILLISECONDS) return true
    if (now < pressState.changedAtMilliseconds + SceneConfig.PRESS_DURATION_MILLISECONDS) return true
    if (now < scene.focusStartedAtMilliseconds + SceneConfig.FOCUS_DURATION_MILLISECONDS) return true
    if (now < scene.lidStartedAtMilliseconds + SceneConfig.LID_OPEN_DURATION_MILLISECONDS) return true
    if (now < scene.tuckStartedAtMilliseconds + SceneConfig.TUCK_DURATION_MILLISECONDS) return true

    // Inspecting a closed box: it turns slowly by itself, the scene never rests.
    if (scene.focusTarget == 1.0 && scene.lidTarget == 0.0 && getFocusProgress(scene, now) >= 1) return true
    // The opened box pulses with light until it is put away.
    if (scene.focusedCardIndex >= 0 && getLidProgress(scene, now) > 0 && getTuckProgress(scene, now) < 1) return true

    return isDragStateAnimating(dragState, false)
  }

  private companion object {
    const val SCROLL_HOLD_MILLISECONDS = 300.0
    const val COMMAND_HOLD_MILLISECONDS = 120.0
  }
}
