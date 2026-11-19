import ExpoModulesCore
import SceneKit
import UIKit

// The native 3D view. It sits behind the (transparent) cards of the list, owns the render loop and renders only
// while the SceneCore state machine says something moves.
final class MysterySceneView: ExpoView, SCNSceneRendererDelegate, SceneWaker {
  let onModelLoaded = EventDispatcher()
  let onFrameStats = EventDispatcher()
  let onSceneError = EventDispatcher()
  let onScrollSourceChange = EventDispatcher()

  private let sceneView = SCNView()
  private let boxScene = BoxScene()
  private var lastUpdateTime: Double?
  private var idleFrames = 0
  private var isLoopRunning = false
  private var windowStart = 0.0
  private var windowDeltas: [Double] = []
  private var pendingLooks: [BoxLook] = []
  private var isModelReady = false
  private var isReportingFrameStats = false
  private var scrollObservation: NSKeyValueObservation?
  private var attachedScrollViewTag: Int?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = BoxScene.backgroundColor
    sceneView.frame = bounds
    sceneView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    sceneView.scene = boxScene.scene
    sceneView.backgroundColor = BoxScene.backgroundColor
    sceneView.antialiasingMode = .multisampling4X
    sceneView.preferredFramesPerSecond = 60
    sceneView.isJitteringEnabled = false
    sceneView.isUserInteractionEnabled = false
    sceneView.delegate = self
    sceneView.isPlaying = false
    sceneView.rendersContinuously = false
    sceneView.pointOfView = boxScene.scene.rootNode.childNodes.first { $0.camera != nil }
    addSubview(sceneView)
    SceneHost.shared.waker = self
    loadModel()
  }

  // ----------------------------------------------------------------- Model
  private func loadModel() {
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      do {
        guard let bundleURL = Bundle(for: MysterySceneView.self).url(forResource: "MysteryScene", withExtension: "bundle"),
          let bundle = Bundle(url: bundleURL), let url = bundle.url(forResource: "box", withExtension: "glb")
        else { throw GlbError.invalid("box.glb is not in the MysteryScene bundle") }
        try self?.boxScene.loadModel(glbData: Data(contentsOf: url))
        DispatchQueue.main.async {
          guard let self else { return }
          self.isModelReady = true
          self.boxScene.setCards(self.pendingLooks)
          SceneHost.shared.command { controller, now in controller.markModelReady(now: now) }
          self.onModelLoaded([:])
        }
      } catch {
        DispatchQueue.main.async { self?.onSceneError(["message": "\(error)"]) }
      }
    }
  }

  func setCards(_ looks: [BoxLook]) {
    pendingLooks = looks
    SceneHost.shared.command { controller, now in controller.setCardCount(looks.count, now: now) }
    if isModelReady { boxScene.setCards(looks) }
    wakeRenderLoop()
  }

  // The scene reads the scroll position of the list itself (KVO on the UIScrollView's contentOffset): the offset reaches
  // the scene on the same main-thread turn in which the list moves, with no JavaScript round trip.
  func attachScrollView(tag: Int?) {
    guard tag != attachedScrollViewTag else { return }
    attachedScrollViewTag = tag
    scrollObservation = nil
    guard let tag else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self, self.attachedScrollViewTag == tag else { return }
      guard let root = self.appContext?.findView(withTag: tag, ofType: UIView.self), let scrollView = Self.findScrollView(in: root)
      else {
        self.onScrollSourceChange(["source": "bridge", "reason": "scroll view \(tag) not found"])
        return
      }
      self.scrollObservation = scrollView.observe(\.contentOffset, options: [.initial, .new]) { scrollView, _ in
        let offset = Double(scrollView.contentOffset.y)
        SceneHost.shared.command { controller, now in controller.setScrollOffset(offset, now: now) }
      }
      self.onScrollSourceChange(["source": "native"])
    }
  }

  private static func findScrollView(in view: UIView) -> UIScrollView? {
    if let scrollView = view as? UIScrollView { return scrollView }
    for subview in view.subviews { if let found = findScrollView(in: subview) { return found } }
    return nil
  }

  func setFrameStatsEnabled(_ isEnabled: Bool) { isReportingFrameStats = isEnabled }

  override func layoutSubviews() {
    super.layoutSubviews()
    sceneView.frame = bounds
    SceneHost.shared.setViewport(width: Double(bounds.width), height: Double(bounds.height))
  }

  // ------------------------------------------------------------ Render loop
  func wakeRenderLoop() {
    // A scroll callback is already on the main thread: wake up in the same turn instead of one hop later.
    if Thread.isMainThread { startRenderLoop() } else { DispatchQueue.main.async { [weak self] in self?.startRenderLoop() } }
  }

  private func startRenderLoop() {
    idleFrames = 0
    guard !isLoopRunning else { return }
    isLoopRunning = true
    lastUpdateTime = nil
    sceneView.rendersContinuously = true
    sceneView.isPlaying = true
  }

  private func sleepRenderLoop() {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.isLoopRunning, self.idleFrames >= 3 else { return }
      self.isLoopRunning = false
      self.sceneView.isPlaying = false
      self.sceneView.rendersContinuously = false
    }
  }

  // SceneKit's render thread, once per frame, before drawing.
  func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
    let now = SceneHost.nowMilliseconds
    let deltaSeconds = lastUpdateTime.map { (now - $0) / 1000 } ?? 1.0 / 60
    let previousUpdate = lastUpdateTime
    lastUpdateTime = now
    guard let result = SceneHost.shared.computeFrame(now: now, deltaSeconds: deltaSeconds) else { return }

    SCNTransaction.begin()
    SCNTransaction.animationDuration = 0
    boxScene.apply(result.frame)
    SCNTransaction.commit()

    if let previousUpdate { record(deltaMilliseconds: now - previousUpdate, now: now) }

    if result.needsMoreFrames {
      idleFrames = 0
    } else {
      idleFrames += 1
      if idleFrames == 3 { sleepRenderLoop() }
    }
  }

  private func record(deltaMilliseconds: Double, now: Double) {
    guard isReportingFrameStats else { return }
    if windowStart == 0 { windowStart = now }
    // A gap this long is the loop waking up from a rest, not a frame time.
    if deltaMilliseconds > 1000 {
      windowStart = now
      windowDeltas.removeAll(keepingCapacity: true)
      return
    }
    windowDeltas.append(deltaMilliseconds)
    guard now - windowStart >= 1000 else { return }
    let deltas = windowDeltas
    windowDeltas.removeAll(keepingCapacity: true)
    windowStart = now
    DispatchQueue.main.async { [weak self] in self?.onFrameStats(["deltasMilliseconds": deltas]) }
  }
}
