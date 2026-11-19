import Foundation
import QuartzCore

// The one scene controller of the app and the lock that guards it. Commands arrive on the JavaScript thread
// (synchronous native calls, no Fabric commit, no main-thread hop); frames are computed on SceneKit's render thread.
final class SceneHost {
  static let shared = SceneHost()

  private let lock = NSLock()
  private let controller = SceneController()
  private var viewportWidth = 0.0
  private var viewportHeight = 0.0
  // Called (from any thread) when a command needs frames again.
  weak var waker: SceneWaker?

  static var nowMilliseconds: Double { CACurrentMediaTime() * 1000 }

  func withController<T>(_ body: (SceneController, Double) -> T) -> T {
    lock.lock()
    defer { lock.unlock() }
    return body(controller, Self.nowMilliseconds)
  }

  // Commands wake the render loop.
  func command(_ body: (SceneController, Double) -> Void) {
    withController(body)
    waker?.wakeRenderLoop()
  }

  func setViewport(width: Double, height: Double) {
    lock.lock()
    viewportWidth = width
    viewportHeight = height
    lock.unlock()
    waker?.wakeRenderLoop()
  }

  struct FrameResult {
    let frame: SceneFrame
    let needsMoreFrames: Bool
  }

  func computeFrame(now: Double, deltaSeconds: Double) -> FrameResult? {
    lock.lock()
    defer { lock.unlock() }
    guard viewportWidth > 0, viewportHeight > 0 else { return nil }
    let frame = controller.computeFrame(
      now: now, deltaSeconds: deltaSeconds, viewportWidth: viewportWidth, viewportHeight: viewportHeight)
    return FrameResult(frame: frame, needsMoreFrames: controller.needsFrames(now: now))
  }
}

protocol SceneWaker: AnyObject {
  func wakeRenderLoop()
}
