import { renderHook } from '@testing-library/react-native'

import '@i18next/i18init'
import { useAdapterCollectionItems } from '@flows/collectionFlow/_adapters/useAdapterCollectionItems'
import { BOX_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/boxCatalogue'
import { WATCH_CATALOGUE } from '@networking/api/MysteryBoxApi/_mockData/watchCatalogue'
import { EBoxIdentifier } from '@networking/api/MysteryBoxApi/_types'

jest.mock('@assets/images/watches/full/casio.webp', () => 1, { virtual: true })

jest.mock('@assets/images/watches/full/gmt.webp', () => 2, { virtual: true })

jest.mock('@assets/images/watches/full/perpetual.webp', () => 3, { virtual: true })

jest.mock('@assets/images/watches/full/sky-dweller.webp', () => 4, { virtual: true })

jest.mock('@assets/images/watches/thumb/casio.webp', () => 5, { virtual: true })

jest.mock('@assets/images/watches/thumb/gmt.webp', () => 6, { virtual: true })

jest.mock('@assets/images/watches/thumb/perpetual.webp', () => 7, { virtual: true })

jest.mock('@assets/images/watches/thumb/sky-dweller.webp', () => 8, { virtual: true })

const [casio, gmt] = WATCH_CATALOGUE
const boxesData = { boxes: BOX_CATALOGUE, watches: WATCH_CATALOGUE }
const owned = (ownershipIdentifier: string, watch: typeof casio, boxIdentifier = EBoxIdentifier.Starter) => ({
  ownershipIdentifier,
  boxIdentifier,
  watch,
})

describe('useAdapterCollectionItems', () => {
  it('returns no rows for an empty collection', async () => {
    const { result } = await renderHook(() => useAdapterCollectionItems({ ownedWatches: [], boxesData }))

    expect(result.current).toEqual([])
  })

  it('lists the newest watch first', async () => {
    const ownedWatches = [owned('purchase-1', casio), owned('purchase-2', gmt)]
    const { result } = await renderHook(() => useAdapterCollectionItems({ ownedWatches, boxesData }))

    expect(result.current.map(item => item.ownershipIdentifier)).toEqual(['purchase-2', 'purchase-1'])
  })

  it('shows name, brand, formatted value, thumbnail and the box it came from', async () => {
    const ownedWatches = [owned('purchase-1', gmt, EBoxIdentifier.Classic)]
    const { result } = await renderHook(() => useAdapterCollectionItems({ ownedWatches, boxesData }))
    const [item] = result.current

    expect(item.nameText).toBe(gmt.name)

    expect(item.brandText).toBe(gmt.brand)

    expect(item.valueText).toBe('$1,200')

    expect(item.boxText).toBe('From Classic Box')

    expect(item.thumbnailSource).toBe(6)
  })

  it('keeps duplicates as separate rows', async () => {
    const ownedWatches = [owned('purchase-1', casio), owned('purchase-2', casio)]
    const { result } = await renderHook(() => useAdapterCollectionItems({ ownedWatches, boxesData }))

    expect(result.current).toHaveLength(2)
  })

  it('does not invent a box name while the boxes are not loaded', async () => {
    const { result } = await renderHook(() =>
      useAdapterCollectionItems({ ownedWatches: [owned('purchase-1', casio)], boxesData: undefined }))

    expect(result.current[0].boxText).toBeNull()
  })

  it('gives every watch its rarity: label and colour', async () => {
    const ownedWatches = [owned('purchase-1', casio), owned('purchase-2', gmt)]
    const { result } = await renderHook(() => useAdapterCollectionItems({ ownedWatches, boxesData }))
    const [newest, oldest] = result.current

    expect(newest.rarityLabelText).toBe('Epic')

    expect(oldest.rarityLabelText).toBe('Common')

    expect(newest.rarityColorHex).not.toBe(oldest.rarityColorHex)
  })

  it('shows the full-size picture for the detail sheet and the small one for the list', async () => {
    const { result } = await renderHook(() => useAdapterCollectionItems({ ownedWatches: [owned('purchase-1', gmt)], boxesData }))

    expect(result.current[0].fullImageSource).toBe(2)

    expect(result.current[0].thumbnailSource).toBe(6)
  })
})
