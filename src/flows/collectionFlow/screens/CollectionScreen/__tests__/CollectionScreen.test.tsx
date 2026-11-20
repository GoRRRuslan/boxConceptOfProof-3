import { fireEvent, render, screen } from '@testing-library/react-native'

import { useCollectionFacade } from '@flows/collectionFlow/_facades/useCollectionFacade'
import type { ICollectionFacade } from '@flows/collectionFlow/_types'
import { CollectionScreen } from '@flows/collectionFlow/screens/CollectionScreen'

jest.mock('@flows/collectionFlow/_facades/useCollectionFacade')

jest.mock('react-native-reanimated', () => jest.requireActual('@utils/testing/reanimatedStub'))

const baseFacade: ICollectionFacade = {
  titleText: 'My Collection',
  totalValueLabelText: 'Total value',
  totalValueInCents: 0,
  countText: '0 watches',
  items: [],
  isEmpty: true,
  emptyTitleText: 'No watches yet',
  emptyDescriptionText: 'Buy a mystery box',
  browseLabelText: 'Browse boxes',
  handleBrowsePress: jest.fn(),
  selectedItem: null,
  closeLabelText: 'Close',
  handleItemPress: jest.fn(),
  handleDetailClose: jest.fn(),
}

const mockFacade = (facade: ICollectionFacade) => {
  jest.mocked(useCollectionFacade).mockReturnValue(facade)
}

describe('CollectionScreen', () => {
  it('shows the empty state with a way to the boxes', async () => {
    mockFacade(baseFacade)

    await render(<CollectionScreen />)

    expect(screen.getByTestId('collectionEmpty')).toBeTruthy()

    expect(screen.queryByTestId('collectionList')).toBeNull()

    await fireEvent.press(screen.getByTestId('browseBoxesButton'))

    expect(baseFacade.handleBrowsePress).toHaveBeenCalledTimes(1)
  })

  it('lists the watches with the count and the total value', async () => {
    mockFacade({
      ...baseFacade,
      isEmpty: false,
      countText: '2 watches',
      totalValueInCents: 16_000,
      items: [
        { ownershipIdentifier: 'purchase-2', nameText: 'GMT Master', brandText: 'Rolex', valueText: '$1,200', boxText: 'From Classic Box', thumbnailSource: 1, fullImageSource: 3, rarityLabelText: 'Epic', rarityColorHex: '#B05AE0' },
        { ownershipIdentifier: 'purchase-1', nameText: 'Casio Vintage', brandText: 'Casio', valueText: '$80', boxText: null, thumbnailSource: 2, fullImageSource: 4, rarityLabelText: 'Common', rarityColorHex: '#9FB7C4' },
      ],
    })

    await render(<CollectionScreen />)

    expect(screen.queryByTestId('collectionEmpty')).toBeNull()

    expect(screen.getByTestId('collectionHeaderValue').props.children).toBe('$160')

    expect(screen.getByTestId('collectionItem-purchase-2')).toBeTruthy()

    expect(screen.getByText('GMT Master')).toBeTruthy()

    expect(screen.getByText('From Classic Box')).toBeTruthy()
  })

  it('opens the big picture of a watch when its row is tapped', async () => {
    const handleItemPress = jest.fn()

    mockFacade({
      ...baseFacade,
      isEmpty: false,
      handleItemPress,
      items: [
        { ownershipIdentifier: 'purchase-1', nameText: 'Casio Vintage', brandText: 'Casio', valueText: '$80', boxText: null, thumbnailSource: 2, fullImageSource: 4, rarityLabelText: 'Common', rarityColorHex: '#9FB7C4' },
      ],
    })

    await render(<CollectionScreen />)

    await fireEvent.press(screen.getByTestId('collectionItem-purchase-1'))

    expect(handleItemPress).toHaveBeenCalledWith('purchase-1')
  })

  it('shows the detail sheet of the selected watch and closes it', async () => {
    const handleDetailClose = jest.fn()

    mockFacade({
      ...baseFacade,
      isEmpty: false,
      handleDetailClose,
      selectedItem: { ownershipIdentifier: 'purchase-1', nameText: 'Casio Vintage', brandText: 'Casio', valueText: '$80', boxText: 'From Starter Box', thumbnailSource: 2, fullImageSource: 4, rarityLabelText: 'Common', rarityColorHex: '#9FB7C4' },
    })

    await render(<CollectionScreen />)

    expect(screen.getByTestId('collectionDetail')).toBeTruthy()

    expect(screen.getAllByText('Casio Vintage').length).toBeGreaterThan(0)

    await fireEvent.press(screen.getByTestId('collectionDetailClose'))

    expect(handleDetailClose).toHaveBeenCalled()
  })

  it('shows no detail sheet while no watch is selected', async () => {
    mockFacade({ ...baseFacade, isEmpty: false, items: [] })

    await render(<CollectionScreen />)

    expect(screen.queryByTestId('collectionDetail')).toBeNull()
  })
})
