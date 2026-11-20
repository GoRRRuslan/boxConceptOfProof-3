import Foundation
import SceneKit
import UIKit

struct BoxLook {
  var colorLinear: [Double]
  var roughness: Double
  var metallic: Double
  var clearCoat: Double
}

// The SceneKit scene: camera, lights, environment and one instance of the box model per card.
// Everything here is applied from `SceneFrame`s computed by the platform independent SceneCore.
final class BoxScene {
  let scene = SCNScene()
  private let cameraNode = SCNNode()
  private var boxRoots: [SCNNode] = []
  private var lidNodes: [[SCNNode]] = []
  private var glowMaterials: [[SCNMaterial]] = []
  private var bodyMaterials: [[SCNMaterial]] = []
  private var parts: [GlbPart] = []
  private var appliedGlowStrength: [Int: Double] = [:]
  private var lastFocusedCardIndex = -1

  static let backgroundColor = UIColor(red: 0x0B / 255.0, green: 0x0D / 255.0, blue: 0x12 / 255.0, alpha: 1)

  private enum PartName {
    static let base = "Shell_Base"
    static let lid = "Shell_Lid"
    static let wordmark = "Shell_Wordmark"
    static let cushion = "Shell_Fitted_Cushion"
  }

  init() {
    scene.background.contents = Self.backgroundColor
    configureCamera()
    configureLights()
    scene.lightingEnvironment.contents = EnvironmentImage.make()
    scene.lightingEnvironment.intensity = 0.8
  }

  // ------------------------------------------------------------------ Setup
  private func configureCamera() {
    let camera = SCNCamera()
    // Same lens as the JavaScript version: 50 mm on a 24 mm tall sensor -> vertical field of view.
    camera.projectionDirection = .vertical
    camera.fieldOfView = 2 * atan(SceneConfig.sensorHeightMillimeters / 2 / SceneConfig.cameraFocalLengthMillimeters) * 180 / .pi
    camera.zNear = 1
    camera.zFar = 30
    camera.wantsHDR = true
    camera.wantsExposureAdaptation = false
    camera.exposureOffset = 0
    camera.bloomIntensity = 0.5
    camera.bloomThreshold = 0.8
    camera.bloomBlurRadius = 14
    camera.screenSpaceAmbientOcclusionIntensity = 0.6
    camera.screenSpaceAmbientOcclusionRadius = 0.35
    camera.screenSpaceAmbientOcclusionBias = 0.03
    camera.screenSpaceAmbientOcclusionDepthThreshold = 0.2
    cameraNode.camera = camera
    cameraNode.position = SCNVector3(0, 0, Float(SceneConfig.cameraDistance))
    scene.rootNode.addChildNode(cameraNode)
  }

  // Warm key light from the upper left in front (casts shadows), cool rim from behind, soft fill from below.
  private func configureLights() {
    struct LightSpec { let intensity: CGFloat; let kelvin: CGFloat; let direction: SIMD3<Float>; let castsShadow: Bool }
    let specs = [
      LightSpec(intensity: 1000, kelvin: 5600, direction: [0.45, -0.75, -0.55], castsShadow: true),
      LightSpec(intensity: 550, kelvin: 9000, direction: [-0.65, -0.25, 0.7], castsShadow: false),
      LightSpec(intensity: 250, kelvin: 6500, direction: [-0.2, 0.9, -0.4], castsShadow: false),
    ]
    for spec in specs {
      let light = SCNLight()
      light.type = .directional
      light.intensity = spec.intensity
      light.temperature = spec.kelvin
      if spec.castsShadow {
        light.castsShadow = true
        light.shadowMode = .deferred
        light.shadowRadius = 4
        light.shadowSampleCount = 8
        light.shadowColor = UIColor(white: 0, alpha: 0.55)
        light.shadowMapSize = CGSize(width: 1024, height: 1024)
        light.orthographicScale = 8
        light.zNear = 1
        light.zFar = 20
      }
      let node = SCNNode()
      node.light = light
      // A directional light shines along its node's -Z axis.
      let direction = simd_normalize(spec.direction)
      node.simdPosition = -direction * 8 + SIMD3<Float>(0, 0, 0)
      node.simdLook(at: SIMD3<Float>(0, 0, 0))
      scene.rootNode.addChildNode(node)
    }
  }

  // --------------------------------------------------------------- The model
  func loadModel(glbData: Data) throws {
    parts = try GlbLoader(data: glbData).loadParts()
  }

  var isModelLoaded: Bool { !parts.isEmpty }

  private func makeBoxInstance() -> (root: SCNNode, lids: [SCNNode], glow: [SCNMaterial], body: [SCNMaterial]) {
    let root = SCNNode()
    var lids: [SCNNode] = []
    var glow: [SCNMaterial] = []
    var body: [SCNMaterial] = []

    for part in parts {
      let partNode = SCNNode()
      partNode.name = part.name
      for (primitiveIndex, primitive) in part.primitives.enumerated() {
        // Every instance owns its geometry and material (the vertex data stays shared).
        let geometry = primitive.geometry.copy() as! SCNGeometry
        let material = (primitive.geometry.firstMaterial ?? SCNMaterial()).copy() as! SCNMaterial
        applyClearCoat(material, factor: primitive.clearCoat, roughness: primitive.clearCoatRoughness)
        geometry.materials = [material]
        let node = SCNNode(geometry: geometry)
        node.castsShadow = part.name != PartName.wordmark
        partNode.addChildNode(node)

        if (part.name == PartName.base || part.name == PartName.lid) && primitiveIndex == 0 { body.append(material) }
        if (part.name == PartName.cushion && primitiveIndex == 0) || (part.name == PartName.lid && primitiveIndex == 1) {
          glow.append(material)
        }
      }
      if part.name == PartName.lid || part.name == PartName.wordmark { lids.append(partNode) }
      root.addChildNode(partNode)
    }
    return (root, lids, glow, body)
  }

  private func applyClearCoat(_ material: SCNMaterial, factor: Double, roughness: Double) {
    material.clearCoat.contents = factor
    material.clearCoatRoughness.contents = roughness
  }

  func setCards(_ looks: [BoxLook]) {
    guard isModelLoaded else { return }
    if looks.count != boxRoots.count {
      boxRoots.forEach { $0.removeFromParentNode() }
      boxRoots = []
      lidNodes = []
      glowMaterials = []
      bodyMaterials = []
      appliedGlowStrength = [:]
      for _ in looks {
        let instance = makeBoxInstance()
        instance.root.isHidden = true
        scene.rootNode.addChildNode(instance.root)
        boxRoots.append(instance.root)
        lidNodes.append(instance.lids)
        glowMaterials.append(instance.glow)
        bodyMaterials.append(instance.body)
      }
    }
    for (index, look) in looks.enumerated() {
      for material in bodyMaterials[index] {
        material.diffuse.contents = GlbLoader.linearColor(look.colorLinear[0], look.colorLinear[1], look.colorLinear[2])
        material.roughness.contents = look.roughness
        material.metalness.contents = look.metallic
        material.clearCoat.contents = look.clearCoat
      }
    }
  }

  // ------------------------------------------------------------------ Frame
  // Writes one `SceneFrame` into the node tree. Called on SceneKit's render thread, inside `updateAtTime`.
  func apply(_ frame: SceneFrame) {
    for (index, card) in frame.cards.enumerated() where index < boxRoots.count {
      let root = boxRoots[index]
      let isVisible = card.isVisible
      root.isHidden = !isVisible
      guard isVisible else { continue }
      // translate * yaw * pitch * scale * (centre the model on its middle)
      let rotation = simd_quatf(angle: Float(card.yawRadians), axis: [0, 1, 0]) * simd_quatf(angle: Float(card.pitchRadians), axis: [1, 0, 0])
      var matrix = simd_float4x4(rotation)
      let scale = Float(card.scale)
      matrix.columns.0 *= scale
      matrix.columns.1 *= scale
      matrix.columns.2 *= scale
      let centre = SIMD4<Float>(0, Float(-SceneConfig.boxCenterHeightUnits), 0, 1)
      let centred = matrix * centre
      matrix.columns.3 = SIMD4<Float>(centred.x, centred.y + Float(card.translateY), centred.z + Float(card.translateZ), 1)
      root.simdTransform = matrix
    }

    // The lid (and its wordmark) of the focused box swings about the hinge pivot; a box that lost the focus is closed.
    if lastFocusedCardIndex != frame.focusedCardIndex {
      setLid(cardIndex: lastFocusedCardIndex, angle: 0, translateY: 0, translateZ: 0)
      setGlow(cardIndex: lastFocusedCardIndex, strength: 0, color: [0, 0, 0])
      lastFocusedCardIndex = frame.focusedCardIndex
    }
    if frame.focusedCardIndex >= 0 {
      setLid(
        cardIndex: frame.focusedCardIndex, angle: frame.lidAngleRadians, translateY: frame.lidTranslateY,
        translateZ: frame.lidTranslateZ)
      setGlow(cardIndex: frame.focusedCardIndex, strength: frame.glowStrength, color: frame.glowColorLinear)
    }
  }

  private func setLid(cardIndex: Int, angle: Double, translateY: Double, translateZ: Double) {
    guard cardIndex >= 0, cardIndex < lidNodes.count else { return }
    var matrix = simd_float4x4(simd_quatf(angle: Float(angle), axis: [1, 0, 0]))
    matrix.columns.3 = SIMD4<Float>(0, Float(translateY), Float(translateZ), 1)
    lidNodes[cardIndex].forEach { $0.simdTransform = matrix }
  }

  // Light from inside the opened box: the cushion and the inner side of the lid glow in the colour of the prize.
  private func setGlow(cardIndex: Int, strength: Double, color: [Double]) {
    guard cardIndex >= 0, cardIndex < glowMaterials.count else { return }
    if let previous = appliedGlowStrength[cardIndex], abs(previous - strength) <= 0.002 { return }
    appliedGlowStrength[cardIndex] = strength
    let emission = GlbLoader.linearColor(color[0] * strength, color[1] * strength, color[2] * strength)
    // SceneKit's emission is dimmer than Filament's emissive factor: the intensity brings the glow (and its bloom) to the same strength.
    glowMaterials[cardIndex].forEach {
      $0.emission.contents = emission
      $0.emission.intensity = 4
    }
  }
}

// A small studio environment for reflections, drawn once: a dark room with a few soft light panels, so glossy
// and metallic boxes have something to reflect (equirectangular).
enum EnvironmentImage {
  static func make() -> UIImage {
    let size = CGSize(width: 512, height: 256)
    return UIGraphicsImageRenderer(size: size).image { context in
      let cg = context.cgContext
      let colors = [UIColor(white: 0.55, alpha: 1).cgColor, UIColor(white: 0.16, alpha: 1).cgColor, UIColor(white: 0.04, alpha: 1).cgColor]
      let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors as CFArray, locations: [0, 0.5, 1])!
      cg.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: 0, y: size.height), options: [])
      UIColor(white: 1, alpha: 0.9).setFill()
      for panel in [CGRect(x: 60, y: 40, width: 90, height: 40), CGRect(x: 300, y: 30, width: 120, height: 36), CGRect(x: 200, y: 110, width: 50, height: 20)] {
        UIBezierPath(roundedRect: panel, cornerRadius: 10).fill()
      }
    }
  }
}
