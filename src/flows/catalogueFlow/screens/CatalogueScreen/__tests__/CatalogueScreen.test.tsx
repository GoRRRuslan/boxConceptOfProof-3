import { fireEvent, render, screen } from '@testing-library/react-native'

import { useCatalogueFacade } from '@flows/catalogueFlow/_facades/useCatalogueFacade'
import type { ICatalogueFacade } from '@flows/catalogueFlow/_types'
import { CatalogueScreen } from '@flows/catalogueFlow/screens/CatalogueScreen'
import { EOpeningPhase } from '@flows/openingFlow/_types'
import { EBoxIdentifier } from '@networking/api/MysteryBoxApi/_types'

jest.mock('@flows/catalogueFlow/_facades/useCatalogueFacade', () => ({ useCatalogueFacade: jest.fn() }))

jest.mock('@flows/catalogueFlow/screens/CatalogueScreen/_components/CatalogueScene', () => {
  const { View } = jest.requireActual('react-native')

  return { CatalogueScene: () => <View testID="catalogueScene" /> }
})

jest.mock('@components/FadingView', () => ({ FadingView: ({ children }: { children: unknown }) => children }))

jest.mock('react-native-reanimated', () => jest.requireActual('@utils/testing/reanimatedStub'))

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: unknown }) => children,
}))

const handleCardPress = jest.fn()
const baseFacade = {
  titleText: 'Mystery Boxes',
  balanceLabelText: 'Balance',
  balanceInCents: 100_000,
  loadingText: 'Loading boxes…',
  errorText: 'Could not load the boxes.',
  retryLabelText: 'Try again',
  isLoadingBoxes: false,
  sceneEpoch: 0,
  isSceneReady: true,
  isErrorBoxes: false,
  cards: [
    {
      identifier: EBoxIdentifier.Starter,
      name: 'Starter Box',
      priceText: '$50',
      prizeText: 'Win a watch worth up to $1,200',
      affordabilityText: null,
      isAffordable: true,
      colorLinearRgba: [0, 0, 1, 1],
      finish: { roughness: 0.5, metallic: 0, clearCoat: 0 },
    },
  ],
  viewport: null,
  listRef: { current: null },
  opening: {
    phase: EOpeningPhase.Browsing,
    isOverlayVisible: false,
    isListHidden: false,
    handleCardPress,
  },
  sceneCardLooks: [],
  scrollViewTag: null,
  isPerformanceOverlayVisible: false,
  renderFrameStats: null,
  isRenderPaused: false,
  handleListLayout: jest.fn(),
  handleScroll: jest.fn(),
  handleRetryPress: jest.fn(),
  handleCardPressIn: jest.fn(),
  handleCardPressOut: jest.fn(),
  handleFrameStats: jest.fn(),
  handleModelLoaded: jest.fn(),
  handleScrollSourceChange: jest.fn(),
} as unknown as ICatalogueFacade

const mockFacade = (overrides: Partial<ICatalogueFacade>) => {
  jest.mocked(useCatalogueFacade).mockReturnValue({ ...baseFacade, ...overrides })
}

describe('CatalogueScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows the balance, the 3D scene and a card for every box', async () => {
    mockFacade({})

    await render(<CatalogueScreen />)

    expect(screen.getByTestId('balanceHeaderValue').props.children).toBe('$1,000')

    expect(screen.getByTestId('catalogueScene')).toBeTruthy()

    expect(screen.getByTestId('boxCard-starter')).toBeTruthy()

    expect(screen.queryByTestId('catalogueLoading')).toBeNull()

    expect(screen.queryByTestId('openingOverlay')).toBeNull()
  })

  it('opens a box when its card is pressed', async () => {
    mockFacade({})

    await render(<CatalogueScreen />)

    await fireEvent.press(screen.getByTestId('boxCard-starter'))

    expect(handleCardPress).toHaveBeenCalledWith(EBoxIdentifier.Starter)
  })

  it('says it is loading', async () => {
    mockFacade({ isLoadingBoxes: true, cards: [] })

    await render(<CatalogueScreen />)

    expect(screen.getByTestId('catalogueLoading')).toBeTruthy()
  })

  it('keeps the loader up until the 3D scene is ready, although the boxes are already loaded', async () => {
    mockFacade({ isLoadingBoxes: false, isSceneReady: false })

    await render(<CatalogueScreen />)

    expect(screen.getByTestId('catalogueLoading')).toBeTruthy()
  })

  it('takes the loader away once the scene is ready', async () => {
    mockFacade({ isLoadingBoxes: false, isSceneReady: true })

    await render(<CatalogueScreen />)

    expect(screen.queryByTestId('catalogueLoading')).toBeNull()
  })

  it('offers a retry when the boxes could not be loaded', async () => {
    mockFacade({ isErrorBoxes: true, cards: [] })

    await render(<CatalogueScreen />)

    await fireEvent.press(screen.getByTestId('retryButton'))

    expect(baseFacade.handleRetryPress).toHaveBeenCalledTimes(1)
  })

  it('shows the opening overlay on top while a box is opened', async () => {
    mockFacade({
      opening: {
        ...baseFacade.opening,
        phase: EOpeningPhase.Inspecting,
        isOverlayVisible: true,
        isListHidden: true,
        boxNameText: 'Starter Box',
        priceText: '$50',
        hintText: '',
        errorText: null,
        backLabelText: 'Back',
        isBackVisible: true,
        primaryButton: null,
        reveal: null,
        gesture: {} as never,
        handleBackPress: jest.fn(),
      },
    })

    await render(<CatalogueScreen />)

    expect(screen.getByTestId('openingOverlay')).toBeTruthy()
  })
})
