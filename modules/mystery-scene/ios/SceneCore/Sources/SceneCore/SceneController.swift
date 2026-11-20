import Foundation

public struct CardFrame: Equatable {
  public var isVisible: Bool
  public var scale: Double
  public var pitchRadians: Double
  public var yawRadians: Double
  public var translateX: Double
  public var translateY: Double
  public var translateZ: Double
}

public struct SceneFrame: Equatable {
  public var cards: [CardFrame]
  // The card whose lid swings and whose inside glows (-1 = none).
  public var focusedCardIndex: Int
  public var lidAngleRadians: Double
  public var lidTranslateY: Double
  public var lidTranslateZ: Double
  public var glowStrength: Double
  public var glowColorLinear: [Double]
  public var rarityLevel: Double
  public var seamIntensity: Double
  public var emissiveBoost: Double
  public var effects: EffectsLayout
}

// The whole state machine of the scene: owns the scroll offset, the opening state, the drag physics and the
// press / entrance animations, and turns "now" into one `SceneFrame` (a pose per box). It knows nothing about
// the 3D engine, so it is unit tested on both platforms against the TypeScript reference.
// Not thread safe: the platform wrapper guards it with a lock (commands arrive on the JS thread, frames on the render loop).
public final class SceneController {
  public private(set) var cardCount = 0
  private var scrollOffset = 0.0
  private var openingScene = OpeningSceneState()
  private var dragState = DragState()
  private var pressState = PressState()
  private var tilt: (Double, Double) = (0, 0)
  private var entranceStartedAt: Double?
  // Last scroll offset and time a frame saw, and the filtered sway of the boxes.
  private var sway: (Double, Double, Double) = (0, 0, 0)
  private var wakeUntilMilliseconds = 0.0

  // How long the scene keeps drawing after a command whose effect has no explicit animation.
  static let scrollHoldMilliseconds = 300.0
  static let commandHoldMilliseconds = 120.0

  public init() {}

  // ------------------------------ Commands ------------------------------ //
  public func setCardCount(_ count: Int, now: Double) {
    if count == cardCount { return }
    cardCount = count
    if entranceStartedAt != nil { entranceStartedAt = now }
    hold(now, Self.commandHoldMilliseconds)
  }

  // The box model is ready: the boxes pop in one after another from now on.
  public func markModelReady(now: Double) {
    if entranceStartedAt == nil { entranceStartedAt = now }
    hold(now, Self.commandHoldMilliseconds)
  }

  public func setScrollOffset(_ offset: Double, now: Double) {
    if offset == scrollOffset { return }
    scrollOffset = offset
    hold(now, Self.scrollHoldMilliseconds)
  }

  public func pressIn(cardIndex: Int, now: Double) {
    pressState = startPress(pressState, cardIndex: cardIndex, now: now)
    hold(now, SceneConfig.pressDurationMilliseconds + 50)
  }

  public func pressOut(now: Double) {
    pressState = endPress(pressState, now)
    hold(now, SceneConfig.pressDurationMilliseconds + 50)
  }

  public func focus(cardIndex: Int, now: Double) {
    var drag = DragState()
    drag.lastInteractionAtMilliseconds = now
    dragState = drag
    openingScene = startFocus(openingScene, cardIndex, now)
    hold(now, Self.commandHoldMilliseconds)
  }

  public func close(now: Double) {
    openingScene = startClose(openingScene, now)
    hold(now, Self.commandHoldMilliseconds)
  }

  // Anticipation, then the lid; the box glides back to its base pose meanwhile.
  public func openLid(now: Double) {
    openingScene = startLidOpen(openingScene, now)
    dragState = requestReset(dragState, now)
    hold(now, Self.commandHoldMilliseconds)
  }

  public func setGlowColor(_ color: [Double], rarityLevel: Double, now: Double) {
    openingScene = withGlowColor(openingScene, color, rarityLevel)
    hold(now, Self.commandHoldMilliseconds)
  }

  public func tuck(now: Double) {
    openingScene = startTuck(openingScene, now)
    hold(now, Self.commandHoldMilliseconds)
  }

  public func dragBy(deltaX: Double, deltaY: Double, now: Double) {
    dragState = applyDragMovement(
      dragState, deltaX: deltaX, deltaY: deltaY, radiansPerPixel: SceneConfig.dragRadiansPerPixel, now: now)
    hold(now, Self.commandHoldMilliseconds)
  }

  // The finger lifted: velocities are in pixels per second, the box keeps turning with them.
  public func dragEnd(velocityX: Double, velocityY: Double, now: Double) {
    dragState = releaseDrag(
      dragState, yawVelocity: velocityX * SceneConfig.dragRadiansPerPixel,
      pitchVelocity: velocityY * SceneConfig.dragRadiansPerPixel, now: now)
    dragState.isDragging = false
    hold(now, Self.commandHoldMilliseconds)
  }

  public func pinch(factor: Double, now: Double) {
    dragState = applyZoom(dragState, zoomFactor: factor, now: now)
    hold(now, Self.commandHoldMilliseconds)
  }

  public func resetView(now: Double) {
    dragState = requestReset(dragState, now)
    hold(now, Self.commandHoldMilliseconds)
  }

  public func setTilt(x: Double, y: Double, now: Double) {
    tilt = (x, y)
    hold(now, Self.commandHoldMilliseconds)
  }

  private func hold(_ now: Double, _ milliseconds: Double) {
    wakeUntilMilliseconds = max(wakeUntilMilliseconds, now + milliseconds)
  }

  // ------------------------------- Frame -------------------------------- //
  public func computeFrame(now: Double, deltaSeconds rawDeltaSeconds: Double, viewportWidth: Double, viewportHeight: Double)
    -> SceneFrame
  {
    let deltaSeconds = min(rawDeltaSeconds, SceneConfig.maximumFrameSeconds)
    let scene = openingScene
    let focusLinearProgress = getFocusProgress(scene, now)
    let focusProgress = easeInOutCubic(focusLinearProgress)
    let dollyProgress = easeOutBack(focusLinearProgress)
    let lidProgress = getLidProgress(scene, now)
    let tuckProgress = easeInOutCubic(getTuckProgress(scene, now))
    let popElapsed = getPopElapsedMilliseconds(scene, now)
    let jitterScale = computeJitterScale(popElapsed)
    var anticipation = computeAnticipationEffect(getAnticipationProgress(scene, now), now)
    anticipation.jitterYawRadians *= jitterScale
    anticipation.jitterPitchRadians *= jitterScale
    let punch = computeCameraPunch(popElapsed, scene.rarityLevel)
    let seamIntensity = computeSeamIntensity(scene, now, focusLinearProgress, tuckProgress)
    let lidAngleRadians =
      computeLidAngleRadians(lidProgress: lidProgress, isOpening: scene.lidTarget == 1)
      + (scene.lidTarget == 1 ? computeLidSettleDegrees(popElapsed) * Double.pi / 180 : 0)

    let scrollDeltaSeconds = (now - sway.1) / 1000
    let scrollVelocity = scrollDeltaSeconds > 0 && scrollDeltaSeconds < 0.2 ? (scrollOffset - sway.0) / scrollDeltaSeconds : 0
    let swayNow = stepScrollSway(sway.2, scrollVelocity, deltaSeconds)
    sway = (scrollOffset, now, swayNow)

    let isAutoRotateAllowed = scene.focusTarget == 1 && scene.lidTarget == 0 && focusLinearProgress >= 1

    if isDragStateAnimating(dragState, isAutoRotateAllowed: isAutoRotateAllowed) {
      dragState = stepDragInertia(dragState, deltaSeconds: deltaSeconds, now: now, isAutoRotateAllowed: isAutoRotateAllowed)
    }
    let drag = dragState

    let tiltX = scene.focusTarget == 1 ? tilt.0 : 0
    let tiltY = scene.focusTarget == 1 ? tilt.1 : 0
    let pressScale = computePressScale(pressState, now)
    let entranceStart = entranceStartedAt ?? Double.greatestFiniteMagnitude

    var cards: [CardFrame] = []
    var poses: [OpeningPose] = []
    var shakeX = 0.0
    cards.reserveCapacity(cardCount)

    for cardIndex in 0..<cardCount {
      var listPose = computeBoxPose(cardIndex: cardIndex, scrollOffset: scrollOffset, viewportHeight: viewportHeight)
      let entranceScale = computeEntranceScale(
        now - entranceStart - Double(cardIndex) * SceneConfig.entranceStaggerMilliseconds)
      let squeeze = pressState.cardIndex == cardIndex ? pressScale : 1
      listPose.scale = listPose.scale * entranceScale * squeeze
      listPose.yawRadians += swayNow
      listPose.pitchRadians += swayNow * 0.5
      let openingPose = computeOpeningPose(
        OpeningPoseInput(
          listPose: listPose, isFocusedCard: cardIndex == scene.focusedCardIndex, lidProgress: lidProgress,
          focusProgress: focusProgress, dollyProgress: dollyProgress, viewportWidth: viewportWidth,
          viewportHeight: viewportHeight, dragYawRadians: drag.yawRadians, dragPitchRadians: drag.pitchRadians,
          zoom: drag.zoom, autoYawRadians: drag.autoYawRadians, tiltYawRadians: tiltX * SceneConfig.tiltYawRadians,
          tiltPitchRadians: tiltY * SceneConfig.tiltPitchRadians, anticipation: anticipation, tuckProgress: tuckProgress))
      let isFocusedCard = cardIndex == scene.focusedCardIndex
      var pose = openingPose
      if isFocusedCard {
        pose.scale = openingPose.scale * (1 + punch.scaleBoost)
        pose.translateY = openingPose.translateY + punch.shakeY * openingPose.scale
        shakeX = punch.shakeX * openingPose.scale
      }
      poses.append(pose)
      cards.append(
        CardFrame(
          isVisible: pose.isVisible, scale: pose.scale, pitchRadians: pose.pitchRadians, yawRadians: pose.yawRadians,
          translateX: isFocusedCard ? punch.shakeX * openingPose.scale : 0, translateY: pose.translateY,
          translateZ: pose.translateZ))
    }

    let hinge = computeLidHingeTransform(angleDegrees: lidAngleRadians * 180 / Double.pi)
    let glowStrength = computeGlowStrength(lidProgress, now)
    let hasFocusedCard = scene.focusedCardIndex >= 0 && scene.focusedCardIndex < cardCount

    return SceneFrame(
      cards: cards, focusedCardIndex: hasFocusedCard ? scene.focusedCardIndex : -1,
      lidAngleRadians: lidAngleRadians, lidTranslateY: hinge.translateY, lidTranslateZ: hinge.translateZ,
      glowStrength: glowStrength, glowColorLinear: scene.glowColorLinear, rarityLevel: scene.rarityLevel,
      seamIntensity: seamIntensity, emissiveBoost: getRarityProfile(scene.rarityLevel).emissiveBoost,
      effects: computeEffectsLayout(
        scene: scene, now: now, focusProgress: focusProgress, tuckProgress: tuckProgress, seamIntensity: seamIntensity,
        poses: poses, shakeX: shakeX))
  }

  // True while something moves (or is about to): the render loop keeps running; otherwise the GPU rests.
  public func needsFrames(now: Double) -> Bool {
    if now < wakeUntilMilliseconds { return true }
    let scene = openingScene

    if let start = entranceStartedAt,
      now < start + Double(max(cardCount - 1, 0)) * SceneConfig.entranceStaggerMilliseconds
        + SceneConfig.entranceDurationMilliseconds
    {
      return true
    }
    if now < pressState.changedAtMilliseconds + SceneConfig.pressDurationMilliseconds { return true }
    if now < scene.focusStartedAtMilliseconds + SceneConfig.focusDurationMilliseconds { return true }
    if now < scene.lidStartedAtMilliseconds + SceneConfig.lidOpenDurationMilliseconds { return true }
    if now < scene.tuckStartedAtMilliseconds + SceneConfig.tuckDurationMilliseconds { return true }

    // Inspecting a closed box: it turns slowly by itself, the scene never rests.
    if scene.focusTarget == 1 && scene.lidTarget == 0 && getFocusProgress(scene, now) >= 1 { return true }
    // A bought box breathes light from its seams; the burst, shock waves and light play out after the lid is let go.
    if scene.focusTarget == 1 && scene.rarityLevel >= 0 && scene.lidTarget == 0 && getFocusProgress(scene, now) >= 1 { return true }
    if scene.lidTarget == 1 && scene.lidStartedAtMilliseconds > 0
      && now < scene.lidStartedAtMilliseconds + EffectsConfig.burstLifetimeMilliseconds
    {
      return true
    }
    // The opened box pulses with light until it is put away.
    if scene.focusedCardIndex >= 0 && getLidProgress(scene, now) > 0 && getTuckProgress(scene, now) < 1 { return true }

    return isDragStateAnimating(dragState, isAutoRotateAllowed: false)
  }
}
