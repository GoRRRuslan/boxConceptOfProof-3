const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// 3D models are bundled as assets
config.resolver.assetExts = [...config.resolver.assetExts, 'glb', 'gltf']

module.exports = config
