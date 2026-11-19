import type { StyleProp, ViewStyle } from 'react-native'

// Look of one box: linear RGB colour of the body and its finish (matte ... glossy metal).
export interface IMysterySceneCardLook {
  color: [number, number, number]
  roughness: number
  metallic: number
  clearCoat: number
}

export interface IMysterySceneFrameStatsEvent {
  nativeEvent: {
    // Time between two consecutive rendered frames during the last second, in milliseconds.
    deltasMilliseconds: number[]
  }
}

export interface IMysterySceneErrorEvent {
  nativeEvent: { message: string }
}

export interface IMysterySceneViewProps {
  style?: StyleProp<ViewStyle>
  // One entry per box in the list; the native scene creates that many instances of the model.
  cards: IMysterySceneCardLook[]
  // Native frame timing is reported once per second while the scene renders (measurement builds).
  isFrameStatsEnabled?: boolean
  onModelLoaded?: () => void
  onFrameStats?: (event: IMysterySceneFrameStatsEvent) => void
  onSceneError?: (event: IMysterySceneErrorEvent) => void
  testID?: string
}

// Synchronous native calls: they only write into the native scene state (no view update, no main thread hop).
export interface IMysterySceneModule {
  // The list scrolled (density-independent pixels from the top of the list content).
  setScrollOffset: (offset: number) => void
  pressIn: (cardIndex: number) => void
  pressOut: () => void
  // The box of this card flies to the middle (inspect).
  focus: (cardIndex: number) => void
  closeBox: () => void
  // Anticipation, then the lid swings open.
  openLid: () => void
  // Colour (linear RGB) of the light inside the opened box.
  setGlowColor: (red: number, green: number, blue: number) => void
  // Put the opened box away (shrink and sink).
  tuck: () => void
  // Finger movement in pixels.
  dragBy: (deltaX: number, deltaY: number) => void
  // The finger lifted; velocity in pixels per second.
  dragEnd: (velocityX: number, velocityY: number) => void
  pinch: (factor: number) => void
  resetView: () => void
  // Device tilt, each axis -1..1.
  setTilt: (x: number, y: number) => void
}
