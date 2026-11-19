Pod::Spec.new do |s|
  s.name           = 'MysteryScene'
  s.version        = '0.1.0'
  s.summary        = 'Native (SceneKit) 3D scene of the Mystery Watch catalogue and box opening'
  s.description    = 'A pure native 3D view: loads the GLB, owns the per-frame loop, places the boxes from the scroll offset.'
  s.license        = { :type => 'MIT' }
  s.author         = 'Mystery Watch'
  s.homepage       = 'https://github.com/GoRRRuslan/boxConceptOfProof-3'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/GoRRRuslan/boxConceptOfProof-3.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # SceneCore/Sources holds the pure maths and state machine (also built and tested as a Swift package).
  s.source_files = '*.swift', 'SceneCore/Sources/SceneCore/*.swift'
  s.resource_bundles = { 'MysteryScene' => ['../assets/box.glb'] }
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
