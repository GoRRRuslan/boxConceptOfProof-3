// A tiny mutable cell shared between React (list scroll, fingers, sensors) and the 3D frame loop.
// Unlike a worklets `Synchronizable` (needed when the frame loop runs on another thread), with
// three.js + React Three Fiber the frame loop (`useFrame`) runs on the JS thread too, so a plain
// object is enough: writes are visible to the next frame and no React render is triggered.
export interface ITiltCell<TValue> {
  getBlocking: () => TValue
  setBlocking: (nextValue: TValue) => void
}

export const createTiltCell = <TValue>(initialValue: TValue): ITiltCell<TValue> => {
  let currentValue = initialValue

  return {
    getBlocking: () => currentValue,
    setBlocking: nextValue => {
      currentValue = nextValue
    },
  }
}
