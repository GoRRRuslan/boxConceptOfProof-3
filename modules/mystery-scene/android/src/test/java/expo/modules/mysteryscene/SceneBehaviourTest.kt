package expo.modules.mysteryscene

import expo.modules.mysteryscene.math.SceneConfig
import expo.modules.mysteryscene.math.SceneController
import expo.modules.mysteryscene.math.computeLidHingeTransform
import kotlin.math.cos
import kotlin.math.sin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Behaviour of the controller that the vectors do not state directly: the GPU may rest when nothing moves. */
class SceneBehaviourTest {
  @Test
  fun restsWhenNothingMovesAndWakesOnScroll() {
    val controller = SceneController()
    controller.setCardCount(8, 1000.0)
    controller.markModelReady(1000.0)
    assertTrue("entrance is running", controller.needsFrames(1100.0))
    assertFalse("entrance finished, nothing moves", controller.needsFrames(1000.0 + 7 * 90 + 520 + 500))
    controller.setScrollOffset(120.0, 5000.0)
    assertTrue(controller.needsFrames(5100.0))
    assertFalse(controller.needsFrames(5400.0))
  }

  @Test
  fun inspectedBoxNeverRestsButAPutAwayBoxDoes() {
    val controller = SceneController()
    controller.setCardCount(4, 0.0)
    controller.markModelReady(0.0)
    controller.focus(1, 10_000.0)
    assertTrue("auto-turn", controller.needsFrames(20_000.0))
    controller.openLid(20_000.0)
    assertTrue("glow pulses while the opened box is shown", controller.needsFrames(22_500.0))
    // Frames really run meanwhile: they finish the glide back to the base pose after "open".
    var time = 20_000.0
    while (time < 23_000) {
      time += 16.7
      controller.computeFrame(time, 0.0167, 390.0, 600.0)
    }
    controller.tuck(23_000.0)
    assertTrue(controller.needsFrames(23_500.0))
    assertFalse("box put away: the GPU rests", controller.needsFrames(23_000.0 + 700 + 500))
  }

  @Test
  fun anUnknownFocusedCardIsIgnored() {
    val controller = SceneController()
    controller.setCardCount(2, 0.0)
    controller.focus(9, 1000.0)
    assertEquals(-1, controller.computeFrame(2000.0, 0.016, 390.0, 600.0).focusedCardIndex)
  }

  @Test
  fun lidHingeKeepsThePivotFixed() {
    val hinge = computeLidHingeTransform(115.0)
    val angle = hinge.angleRadians
    val pivotY = SceneConfig.LID_HINGE_PIVOT_Y
    val pivotZ = SceneConfig.LID_HINGE_PIVOT_Z
    assertEquals(pivotY, pivotY * cos(angle) - pivotZ * sin(angle) + hinge.translateY, 1e-9)
    assertEquals(pivotZ, pivotY * sin(angle) + pivotZ * cos(angle) + hinge.translateZ, 1e-9)
  }
}
