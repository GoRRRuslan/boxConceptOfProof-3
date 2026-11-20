import 'react-native-gesture-handler/jestSetup'
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock'

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext)
import '@shopify/flash-list/jestSetup'

// The native 3D scene does not exist in Jest: a stub with one mock function per native call.
jest.mock('@mysteryScene', () => {
  const { View } = jest.requireActual('react-native')

  return {
    MysteryScene: {
      setScrollOffset: jest.fn(),
      pressIn: jest.fn(),
      pressOut: jest.fn(),
      focus: jest.fn(),
      closeBox: jest.fn(),
      openLid: jest.fn(),
      setGlowColor: jest.fn(),
      tuck: jest.fn(),
      dragBy: jest.fn(),
      dragEnd: jest.fn(),
      pinch: jest.fn(),
      resetView: jest.fn(),
      setTilt: jest.fn(),
    },
    MysterySceneView: View,
  }
})
