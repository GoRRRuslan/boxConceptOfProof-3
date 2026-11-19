import XCTest

@testable import SceneCore

// Behaviour of the controller that the vectors do not state directly: the GPU may rest when nothing moves.
final class SceneBehaviourTests: XCTestCase {
  func testRestsWhenNothingMovesAndWakesOnScroll() {
    let controller = SceneController()
    controller.setCardCount(8, now: 1000)
    controller.markModelReady(now: 1000)
    XCTAssertTrue(controller.needsFrames(now: 1100), "entrance is running")
    XCTAssertFalse(controller.needsFrames(now: 1000 + 7 * 90 + 520 + 500), "entrance finished, nothing moves")
    controller.setScrollOffset(120, now: 5000)
    XCTAssertTrue(controller.needsFrames(now: 5100))
    XCTAssertFalse(controller.needsFrames(now: 5400))
  }

  func testInspectedBoxNeverRestsButAPutAwayBoxDoes() {
    let controller = SceneController()
    controller.setCardCount(4, now: 0)
    controller.markModelReady(now: 0)
    controller.focus(cardIndex: 1, now: 10_000)
    XCTAssertTrue(controller.needsFrames(now: 20_000), "auto-turn")
    controller.openLid(now: 20_000)
    XCTAssertTrue(controller.needsFrames(now: 22_500), "glow pulses while the opened box is shown")
    // Frames really run meanwhile: they finish the glide back to the base pose after "open".
    var time = 20_000.0
    while time < 23_000 {
      time += 16.7
      _ = controller.computeFrame(now: time, deltaSeconds: 0.0167, viewportWidth: 390, viewportHeight: 600)
    }
    controller.tuck(now: 23_000)
    XCTAssertTrue(controller.needsFrames(now: 23_500))
    XCTAssertFalse(controller.needsFrames(now: 23_000 + 700 + 500), "box put away: the GPU rests")
  }

  func testAnUnknownFocusedCardIsIgnored() {
    let controller = SceneController()
    controller.setCardCount(2, now: 0)
    controller.focus(cardIndex: 9, now: 1000)
    let frame = controller.computeFrame(now: 2000, deltaSeconds: 0.016, viewportWidth: 390, viewportHeight: 600)
    XCTAssertEqual(frame.focusedCardIndex, -1)
  }

  func testLidHingeKeepsThePivotFixed() {
    let hinge = computeLidHingeTransform(angleDegrees: 115)
    let angle = hinge.angleRadians
    let pivotY = SceneConfig.lidHingePivotY
    let pivotZ = SceneConfig.lidHingePivotZ
    let movedY = pivotY * cos(angle) - pivotZ * sin(angle) + hinge.translateY
    let movedZ = pivotY * sin(angle) + pivotZ * cos(angle) + hinge.translateZ
    XCTAssertEqual(movedY, pivotY, accuracy: 1e-9)
    XCTAssertEqual(movedZ, pivotZ, accuracy: 1e-9)
  }
}
