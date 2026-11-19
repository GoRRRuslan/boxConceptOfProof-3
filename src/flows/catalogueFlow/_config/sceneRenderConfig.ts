import type { FilamentProviderProps } from 'react-native-filament'

// How the shared 3D view is rendered (the same on iOS and Android).
export const CATALOGUE_SCENE_RENDER_PROPS: Pick<
  FilamentProviderProps,
  'antiAliasing' | 'dithering' | 'postProcessing' | 'shadowing' | 'ambientOcclusionOptions' | 'bloomOptions'
> = {
  antiAliasing: 'FXAA',
  dithering: 'temporal',
  postProcessing: true,
  // Real shadows: the lid shades the inside of the box, the box shades its own lower edge.
  shadowing: true,
  // Soft darkening in corners and creases (between lid and base, around the cushion).
  ambientOcclusionOptions: { enabled: true, radius: 0.35, power: 1.2, intensity: 1, quality: 'LOW' },
  // The light inside an opened box (and bright highlights) bleeds softly into the picture.
  bloomOptions: { enabled: true, strength: 0.22, resolution: 360, levels: 5, quality: 'LOW', threshold: true, highlight: 1000 },
}

// Reflections of the environment (what makes glossy and metallic boxes look glossy and metallic).
export const ENVIRONMENT_LIGHT_INTENSITY = 22_000

export interface ISceneLight {
  intensity: number
  colorKelvin: number
  // The direction the light travels in. The camera looks along -Z at boxes whose fronts face +Z.
  direction: [number, number, number]
  castShadows: boolean
}

// A three-point-ish rig: a warm key light from the upper left in front, a cool rim light from behind on
// the right (bright edges that separate the box from the dark background), and a soft fill from below.
export const SCENE_LIGHTS: ISceneLight[] = [
  { intensity: 11_000, colorKelvin: 5_600, direction: [0.45, -0.75, -0.55], castShadows: true },
  { intensity: 5_500, colorKelvin: 9_000, direction: [-0.65, -0.25, 0.7], castShadows: false },
  { intensity: 1_800, colorKelvin: 6_500, direction: [-0.2, 0.9, -0.4], castShadows: false },
]
