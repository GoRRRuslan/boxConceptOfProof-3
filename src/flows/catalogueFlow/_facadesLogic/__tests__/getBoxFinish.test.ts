import { getBoxFinish } from '@flows/catalogueFlow/_facadesLogic/getBoxFinish'
import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'

describe('getBoxFinish', () => {
  it('makes cheap boxes matte and expensive boxes glossy metal', () => {
    const cheap = getBoxFinish(5_000)
    const expensive = getBoxFinish(250_000)

    expect(cheap).toEqual({ roughness: 0.85, metallic: 0, clearCoat: 0 })

    expect(expensive.roughness).toBeLessThan(cheap.roughness)

    expect(expensive.metallic).toBeGreaterThan(cheap.metallic)

    expect(expensive.clearCoat).toBe(1)
  })

  it('never gets rougher as the price goes up', () => {
    const prices = BOX_CATALOGUE.map(box => box.priceInCents).sort((first, second) => first - second)
    const roughness = prices.map(price => getBoxFinish(price).roughness)

    roughness.slice(1).forEach((value, index) => {
      expect(value).toBeLessThanOrEqual(roughness[index])
    })
  })
})
