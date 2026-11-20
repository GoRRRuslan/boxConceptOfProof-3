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
import expo.modules.mysteryscene.math.EffectItem
import expo.modules.mysteryscene.math.EffectsConfig
import expo.modules.mysteryscene.math.SceneConfig
import expo.modules.mysteryscene.math.computeIridescenceTint
import expo.modules.mysteryscene.math.getIridescenceStrength
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
  // Vulkan: on the Android emulator (and many GPUs) Filament's OpenGL ES backend needed 10-14 s to compile the glTF shaders before the
  // first box showed; Vulkan shows the boxes within ~2-5 s with every effect on. Falls back to the default backend where Vulkan is missing.
  val engine: Engine = try {
    Engine.create(Engine.Backend.VULKAN)
  } catch (error: Exception) {
    android.util.Log.w("MysteryScene", "Vulkan unavailable, using the default backend: $error")
    Engine.create()
  }
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
    val seamTargets: List<Pair<Int, Int>>,
  ) {
    var isInScene = false
  }

  private var instances: List<BoxInstance> = emptyList()
  private var lastFocusedCardIndex = -1
  private val appliedGlowStrength = HashMap<Int, Double>()
  private val matrix = FloatArray(16)
  private val appliedSeamIntensity = HashMap<Int, Double>()

  // The look of every box and the last iridescence tint written to its body (the glossy boxes shimmer).
  private var cardLooks: List<BoxLook> = emptyList()
  private val appliedIridescence = HashMap<Int, List<Double>>()

  // The show around the boxes: pools of flat soft shapes (a disc, a ring, a curtain of light) that face the camera. The scene
  // controller computes where each one is (EffectsLayout); this class only places and tints them. Nothing is created per frame.
  private class EffectPool(val asset: FilamentAsset, val roots: List<Int>, val renderables: List<Int>)

  private var discPool: EffectPool? = null
  private var ringPool: EffectPool? = null
  private var shaftPool: EffectPool? = null
  private var auraColors: List<List<Double>> = emptyList()
  private val appliedAuraKey = HashMap<Int, List<Double>>()
  private var appliedSparkTintLevel = -2.0
  private var appliedShaftTintLevel = -2.0
  private var appliedRingTintLevel = -2.0

  // For this long after the first frame every hidden effect object is drawn once, tiny, in the middle of the view: its material is
  // compiled during the entrance and not as a hitch of about 50 ms when the lid is let go.
  private var warmUpStartedAt = -1.0
  private var isWarmingUp = false

  private enum class PartName(val value: String) {
    BASE("Shell_Base"), LID("Shell_Lid"), WORDMARK("Shell_Wordmark"), CUSHION("Shell_Fitted_Cushion"), SEAM("Shell_Seam")
  }

  init {
    configureView()
    configureCamera()
    configureLights()
    configureEnvironment()
    enableFullQuality()
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
      LightSpec(11_000f, 5_600f, doubleArrayOf(0.45, -0.75, -0.55), true),
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
    val light = KTX1Loader.createIndirectLight(engine, bytes, KTX1Loader.Options())
    light.intensity = ENVIRONMENT_LIGHT_INTENSITY
    scene.indirectLight = light
    indirectLight = light
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
              renderables.setCastShadows(renderable, true)
              renderables.setReceiveShadows(renderable, true)
            }
          }
        }
      }
    }
    auraColors = looks.map { it.colorLinear }
    cardLooks = looks
    appliedIridescence.clear()
    ensureEffectPools(looks.size)
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

  // Loads an effect model once and makes `count` instances of it (they neither cast nor receive shadows).
  private fun createEffectPool(fileName: String, count: Int): EffectPool? {
    val bytes = context.assets.open(fileName).use { ByteBuffer.wrap(it.readBytes()) }
    val created = arrayOfNulls<FilamentInstance>(count)
    val newAsset = assetLoader.createInstancedAsset(bytes, created) ?: return null
    resourceLoader.loadResources(newAsset)
    newAsset.releaseSourceData()
    scene.addEntities(newAsset.entities)
    val renderableManager = engine.renderableManager
    newAsset.entities.forEach { entity ->
      val renderable = renderableManager.getInstance(entity)
      if (renderable != 0) {
        renderableManager.setCastShadows(renderable, false)
        renderableManager.setReceiveShadows(renderable, false)
        // Drawn after every opaque surface.
        renderableManager.setPriority(renderable, 7)
      }
    }
    val instancesOfPool = created.filterNotNull()
    return EffectPool(
      newAsset,
      instancesOfPool.map { it.root },
      instancesOfPool.map { instance -> instance.entities.first { newAsset.getName(it)?.startsWith("Fx_") == true } },
    )
  }

  private fun destroyEffectPool(pool: EffectPool?) {
    pool ?: return
    scene.removeEntities(pool.asset.entities)
    assetLoader.destroyAsset(pool.asset)
  }

  // The disc pool holds the burst, the dust and one aura per card; it is rebuilt when the card count changes.
  private fun ensureEffectPools(cardCount: Int) {
    val discCount = EffectsConfig.BURST_PARTICLE_POOL_SIZE + EffectsConfig.DUST_POOL_SIZE + cardCount
    if (discPool?.roots?.size != discCount) {
      destroyEffectPool(discPool)
      discPool = if (cardCount > 0) createEffectPool("fx_disc.glb", discCount) else null
      appliedAuraKey.clear()
      appliedSparkTintLevel = -2.0
    }
    if (ringPool == null) ringPool = createEffectPool("fx_ring.glb", EffectsConfig.RING_POOL_SIZE)
    if (shaftPool == null) shaftPool = createEffectPool("fx_shaft.glb", 1)
  }

  private fun describe(owner: FilamentAsset, instance: FilamentInstance): BoxInstance {
    val lids = ArrayList<Int>()
    val glow = ArrayList<Pair<Int, Int>>()
    val body = ArrayList<Pair<Int, Int>>()
    val seam = ArrayList<Pair<Int, Int>>()
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
        PartName.SEAM.value -> seam.add(entity to 0)
      }
    }
    return BoxInstance(instance, instance.entities, instance.root, lids, glow, body, seam)
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
      matrix[12] = (matrix[4] * centre + card.translateX).toFloat()
      matrix[13] = (matrix[5] * centre + card.translateY).toFloat()
      matrix[14] = (matrix[6] * centre + card.translateZ).toFloat()
      matrix[15] = 1f
      transforms.setTransform(transforms.getInstance(box.rootEntity), matrix)
    }

    // Iridescence: the glossy boxes shimmer with the turn of the box (a colour added to the base colour).
    frame.cards.forEachIndexed { index, card ->
      val look = cardLooks.getOrNull(index) ?: return@forEachIndexed
      val box = instances.getOrNull(index) ?: return@forEachIndexed
      val strength = getIridescenceStrength(look.metallic)
      if (strength <= 0 || !card.isVisible) return@forEachIndexed
      val tint = computeIridescenceTint(strength, card.yawRadians, card.pitchRadians, frame.nowMilliseconds)
      val previous = appliedIridescence[index]
      if (previous != null && kotlin.math.abs(previous[0] - tint[0]) + kotlin.math.abs(previous[1] - tint[1]) + kotlin.math.abs(previous[2] - tint[2]) <= 0.006) {
        return@forEachIndexed
      }
      appliedIridescence[index] = tint
      box.bodyTargets.forEach { (entity, primitive) ->
        materialInstance(entity, primitive)?.setParameter(
          "baseColorFactor",
          maxOf(0.0, look.colorLinear[0] + tint[0]).toFloat(), maxOf(0.0, look.colorLinear[1] + tint[1]).toFloat(),
          maxOf(0.0, look.colorLinear[2] + tint[2]).toFloat(), 1f,
        )
      }
    }

    // The lid (and its wordmark) of the focused box swings about the hinge pivot; a box that lost the focus is closed.
    if (lastFocusedCardIndex != frame.focusedCardIndex) {
      setLid(lastFocusedCardIndex, 0.0, 0.0, 0.0)
      setGlow(lastFocusedCardIndex, 0.0, listOf(0.0, 0.0, 0.0))
      setSeam(lastFocusedCardIndex, 0.0, listOf(0.0, 0.0, 0.0), 1.0)
      lastFocusedCardIndex = frame.focusedCardIndex
    }
    if (frame.focusedCardIndex >= 0) {
      setLid(frame.focusedCardIndex, frame.lidAngleRadians, frame.lidTranslateY, frame.lidTranslateZ)
      setGlow(frame.focusedCardIndex, frame.glowStrength, frame.glowColorLinear)
      setSeam(frame.focusedCardIndex, frame.seamIntensity, frame.glowColorLinear, frame.emissiveBoost)
    }
    applyEffects(frame)
  }

  // The coloured trim of the seam lights up in the colour of the prize (breathing, charging, flashing).
  private fun setSeam(cardIndex: Int, intensity: Double, color: List<Double>, boost: Double) {
    val box = instances.getOrNull(cardIndex) ?: return
    val previous = appliedSeamIntensity[cardIndex]
    if (previous != null && kotlin.math.abs(previous - intensity) <= 0.004) return
    appliedSeamIntensity[cardIndex] = intensity
    val strength = intensity * boost
    box.seamTargets.forEach { (entity, primitive) ->
      materialInstance(entity, primitive)?.setParameter(
        "emissiveFactor", (color[0] * strength).toFloat(), (color[1] * strength).toFloat(), (color[2] * strength).toFloat(), 1f,
      )
    }
  }

  private fun placeEffect(pool: EffectPool, index: Int, item: EffectItem, alpha: Double) {
    val root = pool.roots.getOrNull(index) ?: return
    val transforms = engine.transformManager
    val isHidden = item.scaleX <= HIDDEN_EFFECT_SCALE || alpha <= 0.001
    val scaleX = if (isHidden) HIDDEN_EFFECT_SCALE else item.scaleX
    val scaleY = if (isHidden) HIDDEN_EFFECT_SCALE else item.scaleY
    val effectMatrix = floatArrayOf(
      scaleX.toFloat(), 0f, 0f, 0f, 0f, scaleY.toFloat(), 0f, 0f, 0f, 0f, 1f, 0f,
      item.x.toFloat(), if (isHidden) (if (isWarmingUp) 0f else PARKED_EFFECT_HEIGHT) else item.y.toFloat(), item.z.toFloat(), 1f,
    )
    transforms.setTransform(transforms.getInstance(root), effectMatrix)
  }

  private fun tintEffect(pool: EffectPool, index: Int, red: Double, green: Double, blue: Double, alpha: Double) {
    val entity = pool.renderables.getOrNull(index) ?: return
    materialInstance(entity, 0)?.setParameter("baseColorFactor", red.toFloat(), green.toFloat(), blue.toFloat(), alpha.toFloat())
  }

  private fun applyEffects(frame: SceneFrame) {
    if (warmUpStartedAt < 0) warmUpStartedAt = frame.nowMilliseconds
    isWarmingUp = frame.nowMilliseconds - warmUpStartedAt < WARM_UP_MILLISECONDS
    val layout = frame.effects
    val glow = frame.glowColorLinear
    val boost = frame.emissiveBoost
    val isArmed = frame.rarityLevel >= 0
    val discs = discPool
    val rings = ringPool
    val shaft = shaftPool
    val burst = EffectsConfig.BURST_PARTICLE_POOL_SIZE
    val dust = EffectsConfig.DUST_POOL_SIZE

    if (discs != null) {
      // The prize tints everything that sparkles; dust is a cool, dim shimmer. Only when the prize changes.
      if (appliedSparkTintLevel != frame.rarityLevel) {
        for (index in 0 until burst) tintEffect(discs, index, minOf(1.0, glow[0] * boost + 0.15), minOf(1.0, glow[1] * boost + 0.15), minOf(1.0, glow[2] * boost + 0.15), 0.9)
        for (index in 0 until dust) tintEffect(discs, burst + index, 0.55, 0.7, 1.0, 0.22)
        appliedSparkTintLevel = frame.rarityLevel
      }
      layout.sparks.forEachIndexed { index, item -> placeEffect(discs, index, item, 0.9) }
      layout.dust.forEachIndexed { index, item -> placeEffect(discs, burst + index, item, 0.22) }
      layout.auras.forEachIndexed { index, item ->
        val poolIndex = burst + dust + index
        placeEffect(discs, poolIndex, item, item.alpha)
        val color = if (index == frame.focusedCardIndex && isArmed) glow else auraColors.getOrNull(index) ?: listOf(1.0, 1.0, 1.0)
        val key = listOf(color[0], color[1], color[2], item.alpha)
        if (appliedAuraKey[index] != key) {
          tintEffect(discs, poolIndex, color[0], color[1], color[2], item.alpha)
          appliedAuraKey[index] = key
        }
      }
    }
    if (shaft != null) {
      placeEffect(shaft, 0, layout.shaft, layout.shaft.alpha)
      tintEffect(shaft, 0, minOf(1.0, glow[0] * boost), minOf(1.0, glow[1] * boost), minOf(1.0, glow[2] * boost), layout.shaft.alpha)
    }
    if (rings != null) {
      layout.rings.forEachIndexed { index, item ->
        placeEffect(rings, index, item, item.alpha)
        if (item.alpha > 0.001) {
          tintEffect(rings, index, minOf(1.0, glow[0] * boost + 0.3), minOf(1.0, glow[1] * boost + 0.3), minOf(1.0, glow[2] * boost + 0.3), item.alpha)
        }
      }
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

  // The full look: FXAA, dithering, ambient occlusion, bloom (shadows are set on the light and the renderables).
  private fun enableFullQuality() {
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
    destroyEffectPool(discPool)
    destroyEffectPool(ringPool)
    destroyEffectPool(shaftPool)
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
    private const val HIDDEN_EFFECT_SCALE = 0.0001
    private const val WARM_UP_MILLISECONDS = 3500.0
    private const val PARKED_EFFECT_HEIGHT = -1000f

    // The app background #0B0D12 as linear RGB.
    private val BACKGROUND = floatArrayOf(0.0033f, 0.004f, 0.0060f)
  }
}
