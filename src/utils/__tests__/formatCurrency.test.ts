import { formatCurrency } from '@utils/formatCurrency'

describe('formatCurrency', () => {
  it.each([
    [0, '$0'],
    [5_000, '$50'],
    [100_000, '$1,000'],
    [250_000, '$2,500'],
    [123_456_700, '$1,234,567'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatCurrency(cents)).toBe(expected)
  })
})
