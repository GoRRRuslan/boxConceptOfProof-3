import { renderHook } from '@testing-library/react-native'

import '@i18next/i18init'
import { useAdapterCatalogueCards } from '@flows/catalogueFlow/_adapters/useAdapterCatalogueCards'
import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'
import { WATCH_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/watchCatalogue'
import { EBoxIdentifier, EWatchIdentifier, type IGetBoxesResponse } from '@networking/api/MysteryBoxApi/_types'

const boxesData: IGetBoxesResponse = { boxes: BOX_CATALOGUE, watches: WATCH_CATALOGUE }

describe('useAdapterCatalogueCards', () => {
  it('returns no cards before the boxes are loaded', async () => {
    const { result } = await renderHook(() => useAdapterCatalogueCards({ boxesData: undefined, balanceInCents: 100_000 }))

    expect(result.current).toEqual([])
  })

  it('creates one card per box in catalogue order', async () => {
    const { result } = await renderHook(() => useAdapterCatalogueCards({ boxesData, balanceInCents: 100_000 }))

    expect(result.current.map(card => card.identifier)).toEqual(BOX_CATALOGUE.map(box => box.identifier))
  })

  it('formats the price and the best possible prize of a box', async () => {
    const { result } = await renderHook(() => useAdapterCatalogueCards({ boxesData, balanceInCents: 100_000 }))
    const starterCard = result.current.find(card => card.identifier === EBoxIdentifier.Starter)
    const legendCard = result.current.find(card => card.identifier === EBoxIdentifier.Legend)

    expect(starterCard?.priceText).toBe('$50')

    // The Starter box can drop up to the GMT watch ($1,200); the Legend box up to the Sky-Dweller ($2,500).
    expect(starterCard?.prizeText).toContain('$1,200')

    expect(legendCard?.prizeText).toContain('$2,500')
  })

  it('marks boxes the balance cannot pay for', async () => {
    const { result } = await renderHook(() => useAdapterCatalogueCards({ boxesData, balanceInCents: 100_000 }))
    const classicCard = result.current.find(card => card.identifier === EBoxIdentifier.Classic)
    const legendCard = result.current.find(card => card.identifier === EBoxIdentifier.Legend)

    expect(classicCard?.isAffordable).toBe(true)

    expect(classicCard?.affordabilityText).toBeNull()

    expect(legendCard?.isAffordable).toBe(false)

    expect(legendCard?.affordabilityText).toBe('Not enough balance')
  })

  it('treats a balance equal to the price as affordable', async () => {
    const { result } = await renderHook(() => useAdapterCatalogueCards({ boxesData, balanceInCents: 5_000 }))

    expect(result.current.find(card => card.identifier === EBoxIdentifier.Starter)?.isAffordable).toBe(true)
  })

  it('re-evaluates affordability when the balance changes', async () => {
    const { result, rerender } = await renderHook(
      (balanceInCents: number) => useAdapterCatalogueCards({ boxesData, balanceInCents }),
      { initialProps: 100_000 },
    )

    await rerender(0)

    expect(result.current.every(card => !card.isAffordable)).toBe(true)
  })

  it('gives every card a linear colour', async () => {
    const { result } = await renderHook(() => useAdapterCatalogueCards({ boxesData, balanceInCents: 0 }))

    result.current.forEach(card => {
      expect(card.colorLinearRgba).toHaveLength(4)

      expect(card.colorLinearRgba[3]).toBe(1)
    })
  })

  it('fails loudly when a box drops a watch that does not exist', async () => {
    const brokenData: IGetBoxesResponse = {
      boxes: [{ ...BOX_CATALOGUE[0], dropTable: [{ watchIdentifier: 'ghost' as unknown as EWatchIdentifier, weight: 1 }] }],
      watches: WATCH_CATALOGUE,
    }

    await expect(renderHook(() => useAdapterCatalogueCards({ boxesData: brokenData, balanceInCents: 0 }))).rejects.toThrow(
      'unknown watch',
    )
  })
})
