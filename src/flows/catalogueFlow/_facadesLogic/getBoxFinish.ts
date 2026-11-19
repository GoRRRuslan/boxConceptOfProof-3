import type { IBoxFinish } from '@flows/catalogueFlow/_types'

// The dearer the box, the more it shines: cheap boxes are matte, expensive ones are glossy metal.
export const getBoxFinish = (priceInCents: number): IBoxFinish => {
  if (priceInCents < 10_000) {
    return { roughness: 0.85, metallic: 0, clearCoat: 0 }
  }

  if (priceInCents < 30_000) {
    return { roughness: 0.55, metallic: 0.1, clearCoat: 0.2 }
  }

  if (priceInCents < 70_000) {
    return { roughness: 0.3, metallic: 0.3, clearCoat: 0.7 }
  }

  return { roughness: 0.18, metallic: 0.65, clearCoat: 1 }
}
