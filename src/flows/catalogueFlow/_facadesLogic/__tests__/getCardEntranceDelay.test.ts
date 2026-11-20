import { ENTRANCE_MAXIMUM_STAGGERED_CARDS, ENTRANCE_STAGGER_MILLISECONDS } from '@flows/catalogueFlow/_config/catalogueLayoutConfig'
import { getCardEntranceDelay } from '@flows/catalogueFlow/_facadesLogic/getCardEntranceDelay'

describe('getCardEntranceDelay', () => {
  it('lets the first card start at once and every next card one step later', () => {
    expect(getCardEntranceDelay(0)).toBe(0)

    expect(getCardEntranceDelay(2)).toBe(2 * ENTRANCE_STAGGER_MILLISECONDS)
  })

  it('stops growing for cards far down the list', () => {
    expect(getCardEntranceDelay(ENTRANCE_MAXIMUM_STAGGERED_CARDS + 10)).toBe(ENTRANCE_MAXIMUM_STAGGERED_CARDS * ENTRANCE_STAGGER_MILLISECONDS)
  })

  it('never waits a negative time', () => {
    expect(getCardEntranceDelay(-3)).toBe(0)
  })
})
