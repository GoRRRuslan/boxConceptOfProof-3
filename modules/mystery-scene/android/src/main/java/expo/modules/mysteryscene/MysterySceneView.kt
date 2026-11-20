package expo.modules.mysteryscene

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import android.view.Surface
import android.view.TextureView
import android.view.View.MeasureSpec
import com.google.android.filament.Filament
import com.google.android.filament.SwapChain
import com.google.android.filament.android.DisplayHelper
import com.google.android.filament.android.UiHelper
import com.google.android.filament.gltfio.Gltfio
import com.google.android.filament.utils.Utils
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * The native 3D view. It sits behind the (transparent) cards of the list, owns the render loop and renders only while the
 * scene controller says something moves.
 */
/** Startup timing in the log (`adb logcat -s MysteryScene`): milliseconds since the process started. */
internal object StartupTrace {
  private val seen = HashSet<String>()

  fun mark(event: String) {
    if (!seen.add(event)) return
    android.util.Log.i("MysteryScene", "startup $event at ${android.os.SystemClock.uptimeMillis() - android.os.Process.getStartUptimeMillis()} ms since process start")
  }
}

class MysterySceneView(context: Context, appContext: AppContext) : ExpoView(context, appContext), SceneWaker {
  private val onModelLoaded by EventDispatcher<Map<String, Any>>()
  private val onFrameStats by EventDispatcher<Map<String, Any>>()
  private val onSceneError by EventDispatcher<Map<String, Any>>()
  private val onScrollSourceChange by EventDispatcher<Map<String, Any>>()

  var isFrameStatsEnabled = false

  private val mainHandler = Handler(Looper.getMainLooper())
  private val textureView = TextureView(context)
  private val choreographer = Choreographer.getInstance()
  private val uiHelper = UiHelper(UiHelper.ContextErrorPolicy.DONT_CHECK)
  private val displayHelper = DisplayHelper(context)
  private var boxScene: FilamentBoxScene? = null
  private var swapChain: SwapChain? = null
  private var pendingLooks: List<BoxLook> = emptyList()
  private var isModelReady = false

  private var isLoopRunning = false
  private var idleFrames = 0
  private var lastFrameTimeNanos = 0L
  private var windowStartMilliseconds = 0.0
  private val windowDeltas = ArrayList<Double>()

  private val frameCallback = object : Choreographer.FrameCallback {
    override fun doFrame(frameTimeNanos: Long) {
      if (!isLoopRunning) return
      renderFrame(frameTimeNanos)
      if (isLoopRunning) choreographer.postFrameCallback(this)
    }
  }

  init {
    StartupTrace.mark("viewCreated")
    Filament.init()
    Gltfio.init()
    Utils.init()
    textureView.isOpaque = false
    addView(textureView)
    SceneHost.waker = this

    val scene = FilamentBoxScene(context)
    boxScene = scene
    uiHelper.renderCallback = object : UiHelper.RendererCallback {
      override fun onNativeWindowChanged(surface: Surface) {
        swapChain?.let { scene.engine.destroySwapChain(it) }
        swapChain = scene.engine.createSwapChain(surface, uiHelper.swapChainFlags)
        StartupTrace.mark("surfaceReady")
        displayHelper.attach(scene.renderer, textureView.display)
        wakeRenderLoop()
      }

      override fun onDetachedFromSurface() {
        displayHelper.detach()
        swapChain?.let {
          scene.engine.destroySwapChain(it)
          scene.engine.flushAndWait()
        }
        swapChain = null
      }

      override fun onResized(width: Int, height: Int) {
        scene.setViewportSize(width, height)
        wakeRenderLoop()
      }
    }
    uiHelper.isOpaque = false
    uiHelper.attachTo(textureView)
    loadModel(scene)
  }

  // The scene reads the scroll position of the list itself (a scroll listener on the native ScrollView): the offset reaches the
  // scene on the same main-thread turn in which the list moves, with no JavaScript round trip.
  private var attachedScrollView: android.widget.ScrollView? = null
  private var attachedScrollViewTag: Int? = null

  fun attachScrollView(tag: Int?) {
    if (tag == attachedScrollViewTag) return
    attachedScrollViewTag = tag
    attachedScrollView?.setOnScrollChangeListener(null)
    attachedScrollView = null
    if (tag == null) return
    mainHandler.post {
      if (attachedScrollViewTag != tag) return@post
      val reactContext = appContext.reactContext as? com.facebook.react.bridge.ReactContext
      val resolved = reactContext?.let {
        com.facebook.react.uimanager.UIManagerHelper.getUIManagerForReactTag(it, tag)?.resolveView(tag)
      }
      val scrollView = resolved as? android.widget.ScrollView ?: (resolved as? android.view.ViewGroup)?.let { findScrollView(it) }
      if (scrollView == null) {
        onScrollSourceChange(mapOf("source" to "bridge", "reason" to "scroll view $tag not found"))
        return@post
      }
      val density = resources.displayMetrics.density.toDouble()
      scrollView.setOnScrollChangeListener { _, _, scrollY, _, _ ->
        val offset = scrollY / density
        SceneHost.command { controller, now -> controller.setScrollOffset(offset, now) }
      }
      attachedScrollView = scrollView
      SceneHost.command { controller, now -> controller.setScrollOffset(scrollView.scrollY / density, now) }
      onScrollSourceChange(mapOf("source" to "native"))
    }
  }

  private fun findScrollView(group: android.view.ViewGroup): android.widget.ScrollView? {
    for (index in 0 until group.childCount) {
      val child = group.getChildAt(index)
      if (child is android.widget.ScrollView) return child
      if (child is android.view.ViewGroup) findScrollView(child)?.let { return it }
    }
    return null
  }

  // ----------------------------------------------------------------- Model
  private fun loadModel(scene: FilamentBoxScene) {
    try {
      scene.loadModel()
      isModelReady = true
      StartupTrace.mark("modelLoaded")
      scene.setCards(pendingLooks)
      SceneHost.command { controller, now -> controller.markModelReady(now) }
      onModelLoaded(emptyMap())
    } catch (error: Exception) {
      onSceneError(mapOf("message" to (error.message ?: error.toString())))
    }
  }

  fun setCards(looks: List<BoxLook>) {
    if (looks.isNotEmpty()) StartupTrace.mark("cardsReceived")
    pendingLooks = looks
    SceneHost.command { controller, now -> controller.setCardCount(looks.size, now) }
    if (isModelReady) boxScene?.setCards(looks)
    wakeRenderLoop()
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    val width = right - left
    val height = bottom - top
    textureView.measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
    textureView.layout(0, 0, width, height)
    StartupTrace.mark("layout ${width}x$height")
    val density = resources.displayMetrics.density.toDouble()
    SceneHost.setViewport(width / density, height / density)
  }

  // ------------------------------------------------------------ Render loop
  override fun wakeRenderLoop() {
    // A scroll callback is already on the main thread: wake up in the same turn instead of one hop later.
    if (Looper.myLooper() == Looper.getMainLooper()) startRenderLoop() else mainHandler.post { startRenderLoop() }
  }

  private fun startRenderLoop() {
    idleFrames = 0
    if (isLoopRunning) return
    isLoopRunning = true
    lastFrameTimeNanos = 0L
    choreographer.postFrameCallback(frameCallback)
  }

  private fun renderFrame(frameTimeNanos: Long) {
    val scene = boxScene ?: return
    val chain = swapChain
    val nowMilliseconds = SceneHost.nowMilliseconds()
    val deltaSeconds = if (lastFrameTimeNanos == 0L) 1.0 / 60 else (frameTimeNanos - lastFrameTimeNanos) / 1e9
    val hadPreviousFrame = lastFrameTimeNanos != 0L
    val deltaMilliseconds = deltaSeconds * 1000
    lastFrameTimeNanos = frameTimeNanos

    StartupTrace.mark("firstRenderFrame")
    val result = SceneHost.computeFrame(nowMilliseconds, deltaSeconds) ?: return
    scene.apply(result.frame)

    if (chain != null && uiHelper.isReadyToRender && scene.renderer.beginFrame(chain, frameTimeNanos)) {
      scene.renderer.render(scene.view)
      scene.renderer.endFrame()
    }

    if (result.frame.cards.any { it.isVisible && it.scale > 0.01 }) StartupTrace.mark("firstFrameWithBoxes")
    if (hadPreviousFrame) record(deltaMilliseconds, nowMilliseconds)

    if (result.needsMoreFrames) {
      idleFrames = 0
    } else {
      idleFrames += 1
      if (idleFrames >= 3) isLoopRunning = false
    }
  }

  private fun record(deltaMilliseconds: Double, now: Double) {
    if (!isFrameStatsEnabled) return
    if (windowStartMilliseconds == 0.0) windowStartMilliseconds = now
    // A gap this long is the loop waking up from a rest, not a frame time.
    if (deltaMilliseconds > 1000) {
      windowStartMilliseconds = now
      windowDeltas.clear()
      return
    }
    windowDeltas.add(deltaMilliseconds)
    if (now - windowStartMilliseconds < 1000) return
    onFrameStats(mapOf("deltasMilliseconds" to ArrayList(windowDeltas)))
    windowDeltas.clear()
    windowStartMilliseconds = now
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    isLoopRunning = false
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    wakeRenderLoop()
  }
}
