// swift-tools-version:5.9
import PackageDescription

// The pure maths and state machine of the scene (no UIKit, no SceneKit): tested on the Mac with `swift test`,
// compiled into the MysteryScene pod for the app.
let package = Package(
  name: "SceneCore",
  platforms: [.macOS(.v13), .iOS(.v16)],
  products: [.library(name: "SceneCore", targets: ["SceneCore"])],
  targets: [
    .target(name: "SceneCore"),
    .testTarget(name: "SceneCoreTests", dependencies: ["SceneCore"]),
  ]
)
