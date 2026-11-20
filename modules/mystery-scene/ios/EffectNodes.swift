import SceneKit
import UIKit

// The show around the box, drawn: pools of flat soft shapes (a disc, a ring, a curtain of light) that face the camera. The
// SceneCore computes where each one is (EffectsLayout); this file only places and tints them. Nothing is created per frame.
final class EffectNodes {
  let root = SCNNode()
  private var auras: [SCNNode] = []
  private var sparks: [SCNNode] = []
  private var dust: [SCNNode] = []
  private var rings: [SCNNode] = []
  private var shaft = SCNNode()
  private var lastSparkTintLevel = -2.0
  private var lastAuraColor: [Int: [Double]] = [:]
  private var auraColors: [[Double]] = []

  private static let renderingOrder = 10
  private static let hiddenScale = 0.0001
  // For this long after the first frame every hidden effect object is drawn once, tiny, in the middle of the view: its pipeline is
  // compiled during the entrance and not as a hitch when the lid is let go.
  private static let warmUpMilliseconds = 3500.0
  private var warmUpStartedAt = -1.0
  private var isWarmingUp = false

  init() {
    root.name = "Effects"
    let discGeometry = Self.quad(bottomHalfWidth: 0.5, bottom: -0.5, topHalfWidth: 0.5, top: 0.5)
    let ringGeometry = Self.quad(bottomHalfWidth: 0.5, bottom: -0.5, topHalfWidth: 0.5, top: 0.5)
    let shaftGeometry = Self.quad(bottomHalfWidth: 0.5, bottom: 0, topHalfWidth: 0.85, top: 1)
    let discTexture = EffectTextures.disc()
    let ringTexture = EffectTextures.ring()
    let shaftTexture = EffectTextures.shaft()

    sparks = (0..<EffectsConfig.burstParticlePoolSize).map { _ in Self.makeNode(discGeometry, discTexture, root) }
    dust = (0..<EffectsConfig.dustPoolSize).map { _ in Self.makeNode(discGeometry, discTexture, root) }
    rings = (0..<EffectsConfig.ringPoolSize).map { _ in Self.makeNode(ringGeometry, ringTexture, root) }
    shaft = Self.makeNode(shaftGeometry, shaftTexture, root)
    self.discGeometry = discGeometry
    self.discTexture = discTexture
  }

  private var discGeometry = SCNGeometry()
  private var discTexture = UIImage()

  // One aura per card (the box colour of every card, linear RGB).
  func setCardColors(_ colors: [[Double]]) {
    if colors.count != auras.count {
      auras.forEach { $0.removeFromParentNode() }
      auras = colors.map { _ in Self.makeNode(discGeometry, discTexture, root) }
      lastAuraColor = [:]
    }
    auraColors = colors
  }

  private static func makeNode(_ geometry: SCNGeometry, _ texture: UIImage, _ parent: SCNNode) -> SCNNode {
    let copy = geometry.copy() as! SCNGeometry
    let material = SCNMaterial()
    material.lightingModel = .constant
    material.diffuse.contents = texture
    material.isDoubleSided = true
    material.writesToDepthBuffer = false
    material.readsFromDepthBuffer = true
    material.blendMode = .alpha
    material.transparency = 0
    copy.materials = [material]
    let node = SCNNode(geometry: copy)
    node.renderingOrder = renderingOrder
    node.castsShadow = false
    node.isHidden = true
    parent.addChildNode(node)
    return node
  }

  // A flat quad (or trapezoid) facing +Z; UV (0, 1) is the bottom left of the texture.
  private static func quad(bottomHalfWidth: Double, bottom: Double, topHalfWidth: Double, top: Double) -> SCNGeometry {
    let vertices = [
      SCNVector3(Float(-bottomHalfWidth), Float(bottom), 0), SCNVector3(Float(bottomHalfWidth), Float(bottom), 0),
      SCNVector3(Float(topHalfWidth), Float(top), 0), SCNVector3(Float(-topHalfWidth), Float(top), 0),
    ]
    let normals = Array(repeating: SCNVector3(0, 0, 1), count: 4)
    let uvs = [CGPoint(x: 0, y: 1), CGPoint(x: 1, y: 1), CGPoint(x: 1, y: 0), CGPoint(x: 0, y: 0)]
    let indices: [UInt16] = [0, 1, 2, 0, 2, 3]
    return SCNGeometry(
      sources: [
        SCNGeometrySource(vertices: vertices), SCNGeometrySource(normals: normals), SCNGeometrySource(textureCoordinates: uvs),
      ],
      elements: [SCNGeometryElement(indices: indices, primitiveType: .triangles)])
  }

  private func place(_ node: SCNNode, _ item: EffectItem, alpha: Double) {
    let isHidden = item.scaleX <= Self.hiddenScale || alpha <= 0.001
    if isHidden && isWarmingUp {
      node.isHidden = false
      node.simdPosition = SIMD3<Float>(0, 0, 0)
      node.simdScale = SIMD3<Float>(Float(Self.hiddenScale), Float(Self.hiddenScale), 1)
      node.geometry?.firstMaterial?.transparency = 0.01
      return
    }
    node.isHidden = isHidden
    guard !isHidden else { return }
    node.simdPosition = SIMD3<Float>(Float(item.x), Float(item.y), Float(item.z))
    node.simdScale = SIMD3<Float>(Float(item.scaleX), Float(item.scaleY), 1)
    node.geometry?.firstMaterial?.transparency = CGFloat(min(1, alpha))
  }

  private func tint(_ node: SCNNode, _ red: Double, _ green: Double, _ blue: Double) {
    node.geometry?.firstMaterial?.multiply.contents = UIColor(
      red: CGFloat(min(1, red)), green: CGFloat(min(1, green)), blue: CGFloat(min(1, blue)), alpha: 1)
  }

  func apply(_ frame: SceneFrame) {
    if warmUpStartedAt < 0 { warmUpStartedAt = frame.nowMilliseconds }
    isWarmingUp = frame.nowMilliseconds - warmUpStartedAt < Self.warmUpMilliseconds
    let layout = frame.effects
    let glow = frame.glowColorLinear
    let boost = frame.emissiveBoost
    let isArmed = frame.rarityLevel >= 0

    for (index, node) in auras.enumerated() where index < layout.auras.count {
      let item = layout.auras[index]
      place(node, item, alpha: item.alpha)
      let isFocusedAndArmed = index == frame.focusedCardIndex && isArmed
      let color = isFocusedAndArmed ? glow : (index < auraColors.count ? auraColors[index] : [1, 1, 1])
      if lastAuraColor[index] != color {
        tint(node, color[0], color[1], color[2])
        lastAuraColor[index] = color
      }
    }

    // The prize tints everything that sparkles; dust is a cool, dim shimmer. Only when the prize changes.
    if lastSparkTintLevel != frame.rarityLevel {
      sparks.forEach { tint($0, glow[0] * boost + 0.15, glow[1] * boost + 0.15, glow[2] * boost + 0.15) }
      dust.forEach { tint($0, 0.55, 0.7, 1) }
      lastSparkTintLevel = frame.rarityLevel
    }
    for (index, node) in sparks.enumerated() where index < layout.sparks.count { place(node, layout.sparks[index], alpha: 0.9) }
    for (index, node) in dust.enumerated() where index < layout.dust.count { place(node, layout.dust[index], alpha: 0.22) }

    place(shaft, layout.shaft, alpha: layout.shaft.alpha)
    tint(shaft, glow[0] * boost, glow[1] * boost, glow[2] * boost)

    for (index, node) in rings.enumerated() where index < layout.rings.count {
      place(node, layout.rings[index], alpha: layout.rings[index].alpha)
      tint(node, glow[0] * boost + 0.3, glow[1] * boost + 0.3, glow[2] * boost + 0.3)
    }
  }
}

// The alpha textures of the three shapes: white pixels with the soft falloff in the alpha channel (the same formulas as
// scripts/assets/generateEffectModels.mjs in the other repositories).
enum EffectTextures {
  private static func gauss(_ value: Double, _ centre: Double, _ width: Double) -> Double {
    exp(-pow((value - centre) / width, 2))
  }

  private static func smooth(_ edge0: Double, _ edge1: Double, _ value: Double) -> Double {
    let t = min(1, max(0, (value - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  private static func image(width: Int, height: Int, alphaAt: (Int, Int) -> Double) -> UIImage {
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    for row in 0..<height {
      for column in 0..<width {
        // Premultiplied white.
        let alpha = UInt8(max(0, min(255, (alphaAt(column, row) * 255).rounded())))
        let offset = (row * width + column) * 4
        pixels[offset] = alpha
        pixels[offset + 1] = alpha
        pixels[offset + 2] = alpha
        pixels[offset + 3] = alpha
      }
    }
    let provider = CGDataProvider(data: Data(pixels) as CFData)!
    let cgImage = CGImage(
      width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: width * 4,
      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
      provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)!
    return UIImage(cgImage: cgImage)
  }

  private static let radialSize = 128

  private static func radius(_ column: Int, _ row: Int) -> Double {
    hypot((Double(column) + 0.5) / Double(radialSize) - 0.5, (Double(row) + 0.5) / Double(radialSize) - 0.5)
  }

  static func disc() -> UIImage {
    image(width: radialSize, height: radialSize) { column, row in
      let r = radius(column, row)
      return gauss(r, 0, 0.17) * (1 - smooth(0.36, 0.5, r))
    }
  }

  static func ring() -> UIImage {
    image(width: radialSize, height: radialSize) { column, row in
      let r = radius(column, row)
      return gauss(r, 0.42, 0.045) * (1 - smooth(0.47, 0.5, r))
    }
  }

  static func shaft() -> UIImage {
    let width = 96
    let height = 192
    return image(width: width, height: height) { column, row in
      let across = ((Double(column) + 0.5) / Double(width)) * 2 - 1
      let up = 1 - (Double(row) + 0.5) / Double(height)
      let horizontal =
        (0.55 * gauss(across, 0, 0.45) + 0.45 * (gauss(across, -0.7, 0.2) + gauss(across, 0.7, 0.2))) * (1 - pow(abs(across), 4))
      let vertical = pow(1 - up, 1.4) * smooth(0, 0.08, up)
      return 0.9 * horizontal * vertical
    }
  }
}
