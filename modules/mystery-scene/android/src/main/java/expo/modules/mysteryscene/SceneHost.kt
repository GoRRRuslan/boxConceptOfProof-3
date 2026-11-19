package expo.modules.mysteryscene

import android.os.SystemClock
import expo.modules.mysteryscene.math.SceneController
import expo.modules.mysteryscene.math.SceneFrame

/** Anything that can start the render loop again (the view). */
interface SceneWaker {
  fun wakeRenderLoop()
}

/**
 * The one scene controller of the app and the lock that guards it. Commands arrive on the JavaScript thread (synchronous
 * native calls, no view update, no main thread hop); frames are computed on the main thread by the Choreographer callback.
 */
object SceneHost {
  private val lock = Any()
  private val controller = SceneController()
  private var viewportWidth = 0.0
  private var viewportHeight = 0.0

  @Volatile
  var waker: SceneWaker? = null

  fun nowMilliseconds(): Double = SystemClock.uptimeMillis().toDouble()

  fun <T> withController(body: (SceneController, Double) -> T): T = synchronized(lock) { body(controller, nowMilliseconds()) }

  /** Commands wake the render loop. */
  fun command(body: (SceneController, Double) -> Unit) {
    withController(body)
    waker?.wakeRenderLoop()
  }

  fun setViewport(width: Double, height: Double) {
    synchronized(lock) {
      viewportWidth = width
      viewportHeight = height
    }
    waker?.wakeRenderLoop()
  }

  class FrameResult(val frame: SceneFrame, val needsMoreFrames: Boolean)

  fun computeFrame(now: Double, deltaSeconds: Double): FrameResult? = synchronized(lock) {
    if (viewportWidth <= 0 || viewportHeight <= 0) return null
    val frame = controller.computeFrame(now, deltaSeconds, viewportWidth, viewportHeight)
    FrameResult(frame, controller.needsFrames(now))
  }
}
