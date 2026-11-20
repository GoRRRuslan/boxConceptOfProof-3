package expo.modules.mysteryscene

import android.content.Context
import com.google.android.filament.Camera
import com.google.android.filament.Colors
import com.google.android.filament.Engine
import com.google.android.filament.EntityManager
import com.google.android.filament.IndirectLight
import com.google.android.filament.LightManager
import com.google.android.filament.MaterialInstance
import com.google.android.filament.Renderer
import com.google.android.filament.Scene
import com.google.android.filament.Skybox
import com.google.android.filament.View
import com.google.android.filament.gltfio.AssetLoader
import com.google.android.filament.gltfio.FilamentAsset
import com.google.android.filament.gltfio.FilamentInstance
import com.google.android.filament.gltfio.ResourceLoader
import com.google.android.filament.gltfio.UbershaderProvider
import com.google.android.filament.utils.KTX1Loader
import expo.modules.mysteryscene.math.SceneConfig
import expo.modules.mysteryscene.math.SceneFrame
import java.nio.ByteBuffer
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class BoxLook(val colorLinear: List<Double>, val roughness: Double, val metallic: Double, val clearCoat: Double)

/**
 * The Filament scene: camera, lights, image based light and one instance of the box model per card.
 * Everything here is applied from [SceneFrame]s computed by the platform independent scene controller.
 * All calls must come from the thread that owns the engine (the main thread).
 */
class FilamentBoxScene(private val context: Context) {
  val engine: Engine = Engine.create()
  val renderer: Renderer = engine.createRenderer()
  val scene: Scene = engine.createScene()
  val view: View = engine.createView()
  private val cameraEntity = EntityManager.get().create()
  val camera: Camera = engine.createCamera(cameraEntity)

  private val lightEntities = ArrayList<Int>()
  private var indirectLight: IndirectLight? = null
  private var skybox: Skybox? = null

  private val materialProvider = UbershaderProvider(engine)
  private val assetLoader = AssetLoader(engine, materialProvider, EntityManager.get())
  private val resourceLoader = ResourceLoader(engine)
  private var modelBytes: ByteBuffer? = null
  private var asset: FilamentAsset? = null

  private class BoxInstance(
    val instance: FilamentInstance,
    val allEntities: IntArray,
    val rootEntity: Int,
    val lidEntities: List<Int>,
    val glowTargets: List<Pair<Int, Int>>,
    val bodyTargets: List<Pair<Int, Int>>,
  ) {
    var isInScene = false
  }

  private var instances: List<BoxInstance> = emptyList()
  private var lastFocusedCardIndex = -1
  private val appliedGlowStrength = HashMap<Int, Double>()
  private val matrix = FloatArray(16)

  private enum class PartName(val value: String) {
    BASE("Shell_Base"), LID("Shell_Lid"), WORDMARK("Shell_Wordmark"), CUSHION("Shell_Fitted_Cushion")
  }

  init {
    configureView()
    configureCamera()
    configureLights()
    configureEnvironment()
  }

  // ------------------------------------------------------------------ Setup
  private fun configureView() {
    view.scene = scene
    view.camera = camera
    // Same post processing as the previous (JavaScript driven) version: FXAA, dithering, shadows, ambient occlusion, bloom.
    view.antiAliasing = View.AntiAliasing.NONE
    view.dithering = View.Dithering.NONE
    view.isPostProcessingEnabled = true
    view.ambientOcclusionOptions = View.AmbientOcclusionOptions().apply {
      enabled = false
      radius = 0.35f
      power = 1.2f
      intensity = 1f
      quality = View.QualityLevel.LOW
    }
    view.bloomOptions = View.BloomOptions().apply {
      enabled = false
      strength = 0.22f
      resolution = 360
      levels = 5
      quality = View.QualityLevel.LOW
      threshold = true
      highlight = 1000f
    }
    // Transparent: the app's own background (#0B0D12) shows through, exactly as behind the other screens.
    view.blendMode = View.BlendMode.TRANSLUCENT
    renderer.clearOptions = Renderer.ClearOptions().apply {
      clear = true
      clearColor = floatArrayOf(0f, 0f, 0f, 0f)
    }
  }

  private fun configureCamera() {
    // Same lens as the iOS scene: 50 mm on a 24 mm tall sensor -> vertical field of view.
    val fieldOfViewDegrees = Math.toDegrees(2 * atan(SceneConfig.SENSOR_HEIGHT_MILLIMETERS / 2 / SceneConfig.CAMERA_FOCAL_LENGTH_MILLIMETERS))
    camera.setProjection(fieldOfViewDegrees, 1.0, 1.0, 30.0, Camera.Fov.VERTICAL)
    camera.lookAt(0.0, 0.0, SceneConfig.CAMERA_DISTANCE, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0)
  }

  fun setViewportSize(widthPixels: Int, heightPixels: Int) {
    view.viewport = com.google.android.filament.Viewport(0, 0, widthPixels, heightPixels)
    val fieldOfViewDegrees = Math.toDegrees(2 * atan(SceneConfig.SENSOR_HEIGHT_MILLIMETERS / 2 / SceneConfig.CAMERA_FOCAL_LENGTH_MILLIMETERS))
    camera.setProjection(fieldOfViewDegrees, widthPixels.toDouble() / heightPixels, 1.0, 30.0, Camera.Fov.VERTICAL)
  }

  // Warm key light from the upper left in front (casts shadows), cool rim from behind, soft fill from below.
  private fun configureLights() {
    data class LightSpec(val intensity: Float, val kelvin: Float, val direction: DoubleArray, val castsShadows: Boolean)

    val specs = listOf(
      LightSpec(11_000f, 5_600f, doubleArrayOf(0.45, -0.75, -0.55), false),
      LightSpec(5_500f, 9_000f, doubleArrayOf(-0.65, -0.25, 0.7), false),
      LightSpec(1_800f, 6_500f, doubleArrayOf(-0.2, 0.9, -0.4), false),
    )
    for (spec in specs) {
      val entity = EntityManager.get().create()
      val color = Colors.cct(spec.kelvin)
      val length = sqrt(spec.direction.sumOf { it * it })
      LightManager.Builder(LightManager.Type.DIRECTIONAL)
        .color(color[0], color[1], color[2])
        .intensity(spec.intensity)
        .direction((spec.direction[0] / length).toFloat(), (spec.direction[1] / length).toFloat(), (spec.direction[2] / length).toFloat())
        .castShadows(spec.castsShadows)
        .build(engine, entity)
      scene.addEntity(entity)
      lightEntities.add(entity)
    }
  }

  // Reflections of a neutral environment: what makes glossy and metallic boxes look glossy and metallic.
  private fun configureEnvironment() {
    val bytes = context.assets.open("env_ibl.ktx").use { ByteBuffer.wrap(it.readBytes()) }
    indirectLight = KTX1Loader.createIndirectLight(engine, bytes, KTX1Loader.Options()).indirectLight?.also {
      it.intensity = ENVIRONMENT_LIGHT_INTENSITY
      scene.indirectLight = it
    }
  }

  // --------------------------------------------------------------- The model
  fun loadModel() {
    modelBytes = context.assets.open("box.glb").use { ByteBuffer.wrap(it.readBytes()) }
  }

  val isModelLoaded: Boolean get() = modelBytes != null

  fun setCards(looks: List<BoxLook>) {
    val bytes = modelBytes ?: return
    if (looks.size != instances.size) {
      asset?.let {
        scene.removeEntities(it.entities)
        assetLoader.destroyAsset(it)
      }
      asset = null
      instances = emptyList()
      appliedGlowStrength.clear()
      lastFocusedCardIndex = -1
      if (looks.isNotEmpty()) {
        val traceStart = android.os.SystemClock.uptimeMillis()
        val created = arrayOfNulls<FilamentInstance>(looks.size)
        val newAsset = assetLoader.createInstancedAsset(bytes, created) ?: return
        val created1 = android.os.SystemClock.uptimeMillis()
        resourceLoader.loadResources(newAsset)
        android.util.Log.i("MysteryScene", "startup createInstancedAsset ${created1 - traceStart} ms, loadResources ${android.os.SystemClock.uptimeMillis() - created1} ms")
        newAsset.releaseSourceData()
        asset = newAsset
        instances = created.filterNotNull().map { describe(newAsset, it) }
        val renderables = engine.renderableManager
        instances.forEach { box ->
          box.allEntities.forEach { entity ->
            val renderable = renderables.getInstance(entity)
            if (renderable != 0) {
              renderables.setCastShadows(renderable, false)
              renderables.setReceiveShadows(renderable, false)
            }
          }
        }
      }
    }
    looks.forEachIndexed { index, look ->
      val box = instances.getOrNull(index) ?: return@forEachIndexed
      box.bodyTargets.forEach { (entity, primitive) ->
        materialInstance(entity, primitive)?.let { material ->
          material.setParameter("baseColorFactor", look.colorLinear[0].toFloat(), look.colorLinear[1].toFloat(), look.colorLinear[2].toFloat(), 1f)
          material.setParameter("roughnessFactor", look.roughness.toFloat())
          material.setParameter("metallicFactor", look.metallic.toFloat())
          if (material.material.hasParameter("clearCoatFactor")) material.setParameter("clearCoatFactor", look.clearCoat.toFloat())
        }
      }
    }
  }

  private fun describe(owner: FilamentAsset, instance: FilamentInstance): BoxInstance {
    val lids = ArrayList<Int>()
    val glow = ArrayList<Pair<Int, Int>>()
    val body = ArrayList<Pair<Int, Int>>()
    for (entity in instance.entities) {
      when (owner.getName(entity)) {
        PartName.BASE.value -> body.add(entity to 0)
        PartName.LID.value -> {
          lids.add(entity)
          body.add(entity to 0)
          glow.add(entity to 1)
        }
        PartName.WORDMARK.value -> lids.add(entity)
        PartName.CUSHION.value -> glow.add(entity to 0)
      }
    }
    return BoxInstance(instance, instance.entities, instance.root, lids, glow, body)
  }

  private fun materialInstance(entity: Int, primitive: Int): MaterialInstance? {
    val renderables = engine.renderableManager
    val renderable = renderables.getInstance(entity)
    if (renderable == 0 || primitive >= renderables.getPrimitiveCount(renderable)) return null
    return renderables.getMaterialInstanceAt(renderable, primitive)
  }

  // ------------------------------------------------------------------ Frame
  /** Writes one [SceneFrame] into the scene. */
  fun apply(frame: SceneFrame) {
    val transforms = engine.transformManager
    frame.cards.forEachIndexed { index, card ->
      val box = instances.getOrNull(index) ?: return@forEachIndexed
      if (card.isVisible != box.isInScene) {
        if (card.isVisible) scene.addEntities(box.allEntities) else scene.removeEntities(box.allEntities)
        box.isInScene = card.isVisible
      }
      if (!card.isVisible) return@forEachIndexed

      // translate * yaw * pitch * scale * (centre the model on its middle)
      val cosYaw = cos(card.yawRadians)
      val sinYaw = sin(card.yawRadians)
      val cosPitch = cos(card.pitchRadians)
      val sinPitch = sin(card.pitchRadians)
      val scale = card.scale
      // Column-major: the columns of Ry * Rx, scaled.
      matrix[0] = (cosYaw * scale).toFloat(); matrix[1] = 0f; matrix[2] = (-sinYaw * scale).toFloat(); matrix[3] = 0f
      matrix[4] = (sinYaw * sinPitch * scale).toFloat(); matrix[5] = (cosPitch * scale).toFloat(); matrix[6] = (cosYaw * sinPitch * scale).toFloat(); matrix[7] = 0f
      matrix[8] = (sinYaw * cosPitch * scale).toFloat(); matrix[9] = (-sinPitch * scale).toFloat(); matrix[10] = (cosYaw * cosPitch * scale).toFloat(); matrix[11] = 0f
      val centre = -SceneConfig.BOX_CENTER_HEIGHT_UNITS
      matrix[12] = (matrix[4] * centre).toFloat()
      matrix[13] = (matrix[5] * centre + card.translateY).toFloat()
      matrix[14] = (matrix[6] * centre + card.translateZ).toFloat()
      matrix[15] = 1f
      transforms.setTransform(transforms.getInstance(box.rootEntity), matrix)
    }

    // The lid (and its wordmark) of the focused box swings about the hinge pivot; a box that lost the focus is closed.
    if (lastFocusedCardIndex != frame.focusedCardIndex) {
      setLid(lastFocusedCardIndex, 0.0, 0.0, 0.0)
      setGlow(lastFocusedCardIndex, 0.0, listOf(0.0, 0.0, 0.0))
      lastFocusedCardIndex = frame.focusedCardIndex
    }
    if (frame.focusedCardIndex >= 0) {
      setLid(frame.focusedCardIndex, frame.lidAngleRadians, frame.lidTranslateY, frame.lidTranslateZ)
      setGlow(frame.focusedCardIndex, frame.glowStrength, frame.glowColorLinear)
    }
  }

  private fun setLid(cardIndex: Int, angle: Double, translateY: Double, translateZ: Double) {
    val box = instances.getOrNull(cardIndex) ?: return
    val transforms = engine.transformManager
    val cosine = cos(angle).toFloat()
    val sine = sin(angle).toFloat()
    val hinge = floatArrayOf(1f, 0f, 0f, 0f, 0f, cosine, sine, 0f, 0f, -sine, cosine, 0f, 0f, translateY.toFloat(), translateZ.toFloat(), 1f)
    box.lidEntities.forEach { transforms.setTransform(transforms.getInstance(it), hinge) }
  }

  // Light from inside the opened box: the cushion and the inner side of the lid glow in the colour of the prize.
  private fun setGlow(cardIndex: Int, strength: Double, color: List<Double>) {
    val box = instances.getOrNull(cardIndex) ?: return
    val previous = appliedGlowStrength[cardIndex]
    if (previous != null && kotlin.math.abs(previous - strength) <= 0.002) return
    appliedGlowStrength[cardIndex] = strength
    box.glowTargets.forEach { (entity, primitive) ->
      materialInstance(entity, primitive)?.setParameter(
        "emissiveFactor", (color[0] * strength).toFloat(), (color[1] * strength).toFloat(), (color[2] * strength).toFloat(), 1f,
      )
    }
  }

  // Progressive quality: the first boxes are drawn with the cheap pipeline (Filament compiles the glTF materials and the post
  // processing shaders in the background, which takes seconds on the emulator and would leave the list empty). Once boxes are
  // on screen the full look is switched on: FXAA, dithering, ambient occlusion, bloom (shadows are not re-enabled, see docs).
  fun enableFullQuality() {
    view.antiAliasing = View.AntiAliasing.FXAA
    view.dithering = View.Dithering.TEMPORAL
    view.ambientOcclusionOptions = View.AmbientOcclusionOptions().apply {
      enabled = true
      radius = 0.35f
      power = 1.2f
      intensity = 1f
      quality = View.QualityLevel.LOW
    }
    view.bloomOptions = View.BloomOptions().apply {
      enabled = true
      strength = 0.22f
      resolution = 360
      levels = 5
      quality = View.QualityLevel.LOW
      threshold = true
      highlight = 1000f
    }
  }

  fun destroy() {
    asset?.let { assetLoader.destroyAsset(it) }
    assetLoader.destroy()
    resourceLoader.destroy()
    materialProvider.destroyMaterials()
    materialProvider.destroy()
    lightEntities.forEach {
      engine.lightManager.destroy(it)
      EntityManager.get().destroy(it)
    }
    indirectLight?.let { engine.destroyIndirectLight(it) }
    skybox?.let { engine.destroySkybox(it) }
    engine.destroyView(view)
    engine.destroyScene(scene)
    engine.destroyCameraComponent(cameraEntity)
    EntityManager.get().destroy(cameraEntity)
    engine.destroyRenderer(renderer)
    engine.destroy()
  }

  companion object {
    private const val ENVIRONMENT_LIGHT_INTENSITY = 22_000f

    // The app background #0B0D12 as linear RGB.
    private val BACKGROUND = floatArrayOf(0.0033f, 0.004f, 0.0060f)
  }
}
