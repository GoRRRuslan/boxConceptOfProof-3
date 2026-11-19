import { convertHexToLinearColor } from '@flows/catalogueFlow/_facadesLogic/convertHexToLinearColor'

describe('convertHexToLinearColor', () => {
  it('maps black and white to 0 and 1 with full alpha', () => {
    expect(convertHexToLinearColor('#000000')).toEqual([0, 0, 0, 1])

    expect(convertHexToLinearColor('#FFFFFF')).toEqual([1, 1, 1, 1])
  })

  it('converts sRGB to linear (mid grey is much darker in linear light)', () => {
    const [red, green, blue] = convertHexToLinearColor('#808080')

    expect(red).toBeCloseTo(0.2158, 3)

    expect(green).toBeCloseTo(red)

    expect(blue).toBeCloseTo(red)
  })

  it('rejects anything that is not a 6 digit hex colour', () => {
    expect(() => convertHexToLinearColor('red')).toThrow('Invalid hex colour')
  })
})
