import Foundation
import SceneKit
import UIKit

// A small glTF 2.0 binary (.glb) reader that builds SceneKit geometry: SceneKit and ModelIO cannot read glTF.
// It supports exactly what the box needs (and what any plain, uncompressed GLB has): triangle meshes with
// POSITION / NORMAL / TANGENT / TEXCOORD_0 / COLOR_0, 16 and 32 bit indices, PBR metallic-roughness materials,
// KHR_materials_clearcoat, embedded PNG / JPEG images, node transforms. No Draco, no animations, no skins.

struct GlbPrimitive {
  let geometry: SCNGeometry
  let materialName: String
  let clearCoat: Double
  let clearCoatRoughness: Double
}

struct GlbPart {
  let name: String
  let primitives: [GlbPrimitive]
}

enum GlbError: Error { case invalid(String) }

final class GlbLoader {
  private let json: [String: Any]
  private let binary: Data

  init(data: Data) throws {
    guard data.count > 20, data.prefix(4) == Data("glTF".utf8) else { throw GlbError.invalid("not a GLB") }
    var offset = 12
    var jsonChunk: Data?
    var binaryChunk = Data()
    while offset + 8 <= data.count {
      let length = Int(data.subdata(in: offset..<offset + 4).withUnsafeBytes { $0.loadUnaligned(as: UInt32.self) })
      let type = data.subdata(in: offset + 4..<offset + 8).withUnsafeBytes { $0.loadUnaligned(as: UInt32.self) }
      let body = data.subdata(in: offset + 8..<offset + 8 + length)
      if type == 0x4E4F_534A { jsonChunk = body } else if type == 0x004E_4942 { binaryChunk = body }
      offset += 8 + length
    }
    guard let jsonChunk, let parsed = try JSONSerialization.jsonObject(with: jsonChunk) as? [String: Any] else {
      throw GlbError.invalid("no JSON chunk")
    }
    if let required = parsed["extensionsRequired"] as? [String], !required.isEmpty {
      throw GlbError.invalid("unsupported required extensions: \(required)")
    }
    json = parsed
    binary = binaryChunk
  }

  func loadParts() throws -> [GlbPart] {
    let nodes = json["nodes"] as? [[String: Any]] ?? []
    let meshes = json["meshes"] as? [[String: Any]] ?? []
    var parts: [GlbPart] = []

    for node in nodes {
      guard let meshIndex = node["mesh"] as? Int, meshIndex < meshes.count else { continue }
      let primitives = meshes[meshIndex]["primitives"] as? [[String: Any]] ?? []
      parts.append(
        GlbPart(
          name: node["name"] as? String ?? "part\(parts.count)",
          primitives: try primitives.map { try loadPrimitive($0) }))
    }
    return parts
  }

  // ---------------------------------------------------------------- Accessors
  private func readAccessor(_ index: Int) throws -> (values: [Float], components: Int, count: Int) {
    let accessors = json["accessors"] as? [[String: Any]] ?? []
    let bufferViews = json["bufferViews"] as? [[String: Any]] ?? []
    guard index < accessors.count else { throw GlbError.invalid("accessor \(index)") }
    let accessor = accessors[index]
    let count = accessor["count"] as? Int ?? 0
    let componentType = accessor["componentType"] as? Int ?? 5126
    let isNormalized = accessor["normalized"] as? Bool ?? false
    let components = ["SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4][accessor["type"] as? String ?? ""] ?? 1
    let view = bufferViews[accessor["bufferView"] as? Int ?? 0]
    let start = (view["byteOffset"] as? Int ?? 0) + (accessor["byteOffset"] as? Int ?? 0)
    let componentSize = [5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4][componentType] ?? 4
    let stride = view["byteStride"] as? Int ?? componentSize * components
    var values = [Float](repeating: 0, count: count * components)

    for element in 0..<count {
      for component in 0..<components {
        let position = start + element * stride + component * componentSize
        let value: Float
        switch componentType {
        case 5126: value = binary.loadFloat(at: position)
        case 5123:
          let raw = binary.loadUInt16(at: position)
          value = isNormalized ? Float(raw) / 65535 : Float(raw)
        case 5125: value = Float(binary.loadUInt32(at: position))
        case 5121:
          let raw = binary[binary.startIndex + position]
          value = isNormalized ? Float(raw) / 255 : Float(raw)
        default: throw GlbError.invalid("component type \(componentType)")
        }
        values[element * components + component] = value
      }
    }
    return (values, components, count)
  }

  private func readIndices(_ index: Int) throws -> [UInt32] {
    let accessors = json["accessors"] as? [[String: Any]] ?? []
    let bufferViews = json["bufferViews"] as? [[String: Any]] ?? []
    let accessor = accessors[index]
    let count = accessor["count"] as? Int ?? 0
    let componentType = accessor["componentType"] as? Int ?? 5123
    let view = bufferViews[accessor["bufferView"] as? Int ?? 0]
    let start = (view["byteOffset"] as? Int ?? 0) + (accessor["byteOffset"] as? Int ?? 0)
    return (0..<count).map { element in
      switch componentType {
      case 5125: return binary.loadUInt32(at: start + element * 4)
      case 5123: return UInt32(binary.loadUInt16(at: start + element * 2))
      default: return UInt32(binary[binary.startIndex + start + element])
      }
    }
  }

  private func source(_ semantic: SCNGeometrySource.Semantic, _ values: [Float], components: Int, count: Int)
    -> SCNGeometrySource
  {
    let data = values.withUnsafeBufferPointer { Data(buffer: $0) }
    return SCNGeometrySource(
      data: data, semantic: semantic, vectorCount: count, usesFloatComponents: true, componentsPerVector: components,
      bytesPerComponent: 4, dataOffset: 0, dataStride: components * 4)
  }

  // ---------------------------------------------------------------- Primitives and materials
  private func loadPrimitive(_ primitive: [String: Any]) throws -> GlbPrimitive {
    let attributes = primitive["attributes"] as? [String: Int] ?? [:]
    var sources: [SCNGeometrySource] = []
    guard let positionIndex = attributes["POSITION"] else { throw GlbError.invalid("no POSITION") }
    let positions = try readAccessor(positionIndex)
    sources.append(source(.vertex, positions.values, components: 3, count: positions.count))
    if let index = attributes["NORMAL"] {
      let normals = try readAccessor(index)
      sources.append(source(.normal, normals.values, components: 3, count: normals.count))
    }
    if let index = attributes["TEXCOORD_0"] {
      let coordinates = try readAccessor(index)
      sources.append(source(.texcoord, coordinates.values, components: 2, count: coordinates.count))
    }
    if let index = attributes["TANGENT"] {
      let tangents = try readAccessor(index)
      sources.append(source(.tangent, tangents.values, components: 4, count: tangents.count))
    }
    if let index = attributes["COLOR_0"] {
      let colors = try readAccessor(index)
      sources.append(source(.color, colors.values, components: colors.components, count: colors.count))
    }
    var indices: [UInt32] = []
    if let index = primitive["indices"] as? Int { indices = try readIndices(index) } else { indices = (0..<UInt32(positions.count)).map { $0 } }
    let element = SCNGeometryElement(indices: indices, primitiveType: .triangles)
    let geometry = SCNGeometry(sources: sources, elements: [element])

    let materials = json["materials"] as? [[String: Any]] ?? []
    let materialIndex = primitive["material"] as? Int ?? 0
    let materialJson = materialIndex < materials.count ? materials[materialIndex] : [:]
    let material = try makeMaterial(materialJson)
    geometry.materials = [material]
    geometry.name = materialJson["name"] as? String

    let coat = (materialJson["extensions"] as? [String: Any])?["KHR_materials_clearcoat"] as? [String: Any]
    return GlbPrimitive(
      geometry: geometry, materialName: materialJson["name"] as? String ?? "",
      clearCoat: coat?["clearcoatFactor"] as? Double ?? 0, clearCoatRoughness: coat?["clearcoatRoughnessFactor"] as? Double ?? 0)
  }

  static func linearColor(_ red: Double, _ green: Double, _ blue: Double, _ alpha: Double = 1) -> UIColor {
    let space = CGColorSpace(name: CGColorSpace.linearSRGB)!
    return UIColor(cgColor: CGColor(colorSpace: space, components: [CGFloat(red), CGFloat(green), CGFloat(blue), CGFloat(alpha)])!)
  }

  private func makeMaterial(_ material: [String: Any]) throws -> SCNMaterial {
    let result = SCNMaterial()
    result.lightingModel = .physicallyBased
    result.isDoubleSided = material["doubleSided"] as? Bool ?? false
    result.name = material["name"] as? String

    let pbr = material["pbrMetallicRoughness"] as? [String: Any] ?? [:]
    let factor = (pbr["baseColorFactor"] as? [Double]) ?? [1, 1, 1, 1]
    let baseColor = Self.linearColor(factor[0], factor[1], factor[2], factor[3])
    result.roughness.contents = pbr["roughnessFactor"] as? Double ?? 1
    result.metalness.contents = pbr["metallicFactor"] as? Double ?? 1

    if let texture = (pbr["baseColorTexture"] as? [String: Any])?["index"] as? Int, let image = try loadImage(textureIndex: texture) {
      // The base colour factor tints the texture.
      result.diffuse.contents = image
      result.multiply.contents = baseColor
    } else {
      result.diffuse.contents = baseColor
    }
    if let texture = (material["normalTexture"] as? [String: Any])?["index"] as? Int, let image = try loadImage(textureIndex: texture) {
      result.normal.contents = image
    }
    if material["alphaMode"] as? String == "BLEND" {
      result.blendMode = .alpha
      result.writesToDepthBuffer = false
      result.transparencyMode = .aOne
    }
    for property in [result.diffuse, result.normal, result.multiply] {
      property.wrapS = .clamp
      property.wrapT = .clamp
      property.minificationFilter = .linear
      property.magnificationFilter = .linear
      property.mipFilter = .linear
    }
    return result
  }

  private func loadImage(textureIndex: Int) throws -> UIImage? {
    let textures = json["textures"] as? [[String: Any]] ?? []
    let images = json["images"] as? [[String: Any]] ?? []
    let bufferViews = json["bufferViews"] as? [[String: Any]] ?? []
    guard textureIndex < textures.count, let source = textures[textureIndex]["source"] as? Int, source < images.count,
      let viewIndex = images[source]["bufferView"] as? Int
    else { return nil }
    let view = bufferViews[viewIndex]
    let start = view["byteOffset"] as? Int ?? 0
    let length = view["byteLength"] as? Int ?? 0
    return UIImage(data: binary.subdata(in: binary.startIndex + start..<binary.startIndex + start + length))
  }
}

extension Data {
  fileprivate func loadFloat(at offset: Int) -> Float { loadUInt32(at: offset).floatBits }
  fileprivate func loadUInt16(at offset: Int) -> UInt16 {
    withUnsafeBytes { $0.loadUnaligned(fromByteOffset: offset, as: UInt16.self) }
  }
  fileprivate func loadUInt32(at offset: Int) -> UInt32 {
    withUnsafeBytes { $0.loadUnaligned(fromByteOffset: offset, as: UInt32.self) }
  }
}

extension UInt32 {
  fileprivate var floatBits: Float { Float(bitPattern: self) }
}
