package expo.modules.mysteryscene.math

data class CardFrame(
  val isVisible: Boolean,
  val scale: Double,
  val pitchRadians: Double,
  val yawRadians: Double,
  val translateX: Double,
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
  val rarityLevel: Double,
  val seamIntensity: Double,
  val emissiveBoost: Double,
  val effects: EffectsLayout,
  /** The time of this frame (milliseconds): the engines need it for the shimmer of the glossy boxes. */
  val nowMilliseconds: Double,
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

  /** [last offset, time it changed, smoothed scroll speed], the filtered sway of the boxes, and the smoothed offset of their parallax turn. */
  private var scrollVelocity = ScrollVelocityState(0.0, 0.0, 0.0)
  private var swayValue = 0.0
  private var parallaxOffset: Double? = null
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

  fun setGlowColor(color: List<Double>, rarityLevel: Double, now: Double) {
    openingScene = withGlowColor(openingScene, color, rarityLevel)
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
    val popElapsed = getPopElapsedMilliseconds(scene, now)
    val jitterScale = computeJitterScale(popElapsed)
    val rawAnticipation = computeAnticipationEffect(getAnticipationProgress(scene, now), now)
    val anticipation = rawAnticipation.copy(
      jitterYawRadians = rawAnticipation.jitterYawRadians * jitterScale,
      jitterPitchRadians = rawAnticipation.jitterPitchRadians * jitterScale,
    )
    val punch = computeCameraPunch(popElapsed, scene.rarityLevel)
    val seamIntensity = computeSeamIntensity(scene, now, focusLinearProgress, tuckProgress)
    val lidAngleRadians = computeLidAngleRadians(lidProgress, scene.lidTarget == 1.0) +
      (if (scene.lidTarget == 1.0) computeLidSettleDegrees(popElapsed) * Math.PI / 180 else 0.0)

    val scrollVelocityNow = stepScrollVelocity(scrollVelocity, scrollOffset, now, deltaSeconds)
    val sway = stepScrollSway(swayValue, scrollVelocityNow.velocity, deltaSeconds)
    val listScrollOffset = extrapolateScrollOffset(scrollOffset, scrollVelocityNow.velocity, scrollVelocityNow.changedAtMilliseconds, now)
    val parallaxOffsetNow = parallaxOffset?.let { stepParallaxOffset(it, listScrollOffset, deltaSeconds) } ?: listScrollOffset
    scrollVelocity = scrollVelocityNow
    swayValue = sway
    parallaxOffset = parallaxOffsetNow

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
    val poses = ArrayList<OpeningPose>(cardCount)
    var shakeX = 0.0
    for (cardIndex in 0 until cardCount) {
      val listPose = computeBoxPose(cardIndex, listScrollOffset, viewportHeight)
      val parallaxYawRadians = computeBoxPose(cardIndex, parallaxOffsetNow, viewportHeight).yawRadians
      val entranceScale = computeEntranceScale(now - entranceStart - cardIndex * SceneConfig.ENTRANCE_STAGGER_MILLISECONDS)
      val squeeze = if (pressState.cardIndex == cardIndex) pressScale else 1.0
      val openingPose = computeOpeningPose(
        OpeningPoseInput(
          listPose = listPose.copy(
            scale = listPose.scale * entranceScale * squeeze, yawRadians = parallaxYawRadians + sway, pitchRadians = listPose.pitchRadians + sway * 0.5,
          ),
          isFocusedCard = cardIndex == scene.focusedCardIndex,
          lidProgress = lidProgress, focusProgress = focusProgress, dollyProgress = dollyProgress,
          viewportWidth = viewportWidth, viewportHeight = viewportHeight,
          dragYawRadians = drag.yawRadians, dragPitchRadians = drag.pitchRadians, zoom = drag.zoom, autoYawRadians = drag.autoYawRadians,
          tiltYawRadians = effectiveTiltX * SceneConfig.TILT_YAW_RADIANS, tiltPitchRadians = effectiveTiltY * SceneConfig.TILT_PITCH_RADIANS,
          anticipation = anticipation, tuckProgress = tuckProgress,
        ),
      )
      val isFocusedCard = cardIndex == scene.focusedCardIndex
      val pose = if (isFocusedCard) {
        shakeX = punch.shakeX * openingPose.scale
        openingPose.copy(scale = openingPose.scale * (1 + punch.scaleBoost), translateY = openingPose.translateY + punch.shakeY * openingPose.scale)
      } else {
        openingPose
      }
      poses.add(pose)
      cards.add(
        CardFrame(
          pose.isVisible, pose.scale, pose.pitchRadians, pose.yawRadians, if (isFocusedCard) punch.shakeX * openingPose.scale else 0.0,
          pose.translateY, pose.translateZ,
        ),
      )
    }

    val hinge = computeLidHingeTransform(lidAngleRadians * 180 / Math.PI)
    val hasFocusedCard = scene.focusedCardIndex in 0 until cardCount
    return SceneFrame(
      cards, if (hasFocusedCard) scene.focusedCardIndex else -1, lidAngleRadians, hinge.translateY, hinge.translateZ,
      computeGlowStrength(lidProgress, now), scene.glowColorLinear, scene.rarityLevel, seamIntensity,
      getRarityProfile(scene.rarityLevel).emissiveBoost,
      computeEffectsLayout(scene, now, focusProgress, tuckProgress, seamIntensity, poses, shakeX), now,
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
    // A bought box breathes light from its seams; the burst, shock waves and light play out after the lid is let go.
    if (scene.focusTarget == 1.0 && scene.rarityLevel >= 0 && scene.lidTarget == 0.0 && getFocusProgress(scene, now) >= 1) return true
    if (scene.lidTarget == 1.0 && scene.lidStartedAtMilliseconds > 0 && now < scene.lidStartedAtMilliseconds + EffectsConfig.BURST_LIFETIME_MILLISECONDS) return true
    // The opened box pulses with light until it is put away.
    if (scene.focusedCardIndex >= 0 && getLidProgress(scene, now) > 0 && getTuckProgress(scene, now) < 1) return true

    return isDragStateAnimating(dragState, false)
  }

  private companion object {
    const val SCROLL_HOLD_MILLISECONDS = 300.0
    const val COMMAND_HOLD_MILLISECONDS = 120.0
  }
}
