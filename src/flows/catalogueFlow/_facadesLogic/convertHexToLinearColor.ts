import type { TColorRgba } from '@flows/catalogueFlow/_types'

const toLinear = (channel: number): number => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)

// Filament's baseColorFactor is linear RGB; designers think in sRGB hex ("#2AA876").
export const convertHexToLinearColor = (hexColor: string): TColorRgba => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexColor)

  if (!match) {
    throw new Error(`Invalid hex colour: ${hexColor}`)
  }

  const [, red, green, blue] = match

  return [red, green, blue].map(channelHex => toLinear(parseInt(channelHex, 16) / 255)).concat(1) as TColorRgba
}
