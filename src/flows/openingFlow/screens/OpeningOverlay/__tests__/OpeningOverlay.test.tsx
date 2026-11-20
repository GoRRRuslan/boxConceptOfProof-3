import { fireEvent, render, screen } from '@testing-library/react-native'

import { OpeningOverlay } from '@flows/openingFlow/screens/OpeningOverlay'
import { EOpeningPhase, EWatchRarity, type IOpeningFacade } from '@flows/openingFlow/_types'

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: unknown }) => children,
}))

jest.mock('react-native-reanimated', () => jest.requireActual('@utils/testing/reanimatedStub'))

const baseOpening = {
  phase: EOpeningPhase.Inspecting,
  isOverlayVisible: true,
  isListHidden: true,
  isDragging: false,
  boxNameText: 'Starter Box',
  priceText: '$50',
  hintText: 'Drag to turn the box',
  errorText: null,
  backLabelText: 'Back',
  isBackVisible: true,
  primaryButton: { labelText: 'Buy for $50', isDisabled: false, testID: 'buyButton', onPress: jest.fn() },
  reveal: null,
  gesture: {},
  handleBackPress: jest.fn(),
} as unknown as IOpeningFacade

describe('OpeningOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows the box, the hint and the buy button, and reports presses', async () => {
    await render(<OpeningOverlay opening={baseOpening} />)

    expect(screen.getByTestId('openingBoxName').props.children).toBe('Starter Box')

    expect(screen.getByTestId('openingHint').props.children).toBe('Drag to turn the box')

    await fireEvent.press(screen.getByTestId('buyButton'))

    expect(baseOpening.primaryButton?.onPress).toHaveBeenCalledTimes(1)

    await fireEvent.press(screen.getByTestId('backButton'))

    expect(baseOpening.handleBackPress).toHaveBeenCalledTimes(1)
  })

  it('does not report presses of a disabled button', async () => {
    const opening = {
      ...baseOpening,
      primaryButton: { labelText: 'Purchasing…', isDisabled: true, testID: 'buyButton', onPress: jest.fn() },
    } as IOpeningFacade

    await render(<OpeningOverlay opening={opening} />)

    await fireEvent.press(screen.getByTestId('buyButton'))

    expect(opening.primaryButton?.onPress).not.toHaveBeenCalled()
  })

  it('hides the back button while the purchase or the lid is busy', async () => {
    await render(<OpeningOverlay opening={{ ...baseOpening, isBackVisible: false }} />)

    expect(screen.queryByTestId('backButton')).toBeNull()
  })

  it('shows why a purchase failed', async () => {
    await render(<OpeningOverlay opening={{ ...baseOpening, errorText: 'Nothing was charged' }} />)

    expect(screen.getByTestId('openingError').props.children).toBe('Nothing was charged')
  })

  it('shows the revealed watch', async () => {
    const opening = {
      ...baseOpening,
      reveal: {
        titleText: 'You got',
        nameText: 'Casio Vintage',
        brandText: 'Casio',
        valueText: 'Worth $80',
        imageSource: 1,
        rarity: EWatchRarity.Common,
        rarityLabelText: 'Common',
        rarityColorHex: '#9FB7C4',
        flashOpacity: 0,
        particleCount: 0,
      },
    } as IOpeningFacade

    await render(<OpeningOverlay opening={opening} />)

    expect(screen.getByTestId('revealedWatchName').props.children).toBe('Casio Vintage')

    expect(screen.getByText('Worth $80')).toBeTruthy()
  })

  it('shows nothing of the reveal before the watch is known', async () => {
    await render(<OpeningOverlay opening={baseOpening} />)

    expect(screen.queryByTestId('revealedWatch')).toBeNull()
  })

  it('shows the rarity of the prize', async () => {
    const opening = {
      ...baseOpening,
      reveal: {
        titleText: 'You got',
        nameText: 'Sky-Dweller',
        brandText: 'Rolex',
        valueText: 'Worth $2,500',
        imageSource: 1,
        rarity: EWatchRarity.Legendary,
        rarityLabelText: 'Legendary!',
        rarityColorHex: '#FFC24A',
        flashOpacity: 0.9,
        particleCount: 28,
      },
    } as unknown as IOpeningFacade

    await render(<OpeningOverlay opening={opening} />)

    expect(screen.getByTestId('revealedRarity').props.children).toBe('Legendary!')
  })

  it('a common prize has a glow but no flash and no particles; a legendary one has both', async () => {
    const common = { ...baseOpening, reveal: { ...baseOpening.reveal, titleText: 'You got', nameText: 'Casio', brandText: 'Casio', valueText: '$80', imageSource: 1, rarity: EWatchRarity.Common, rarityLabelText: 'Common', rarityColorHex: '#9FB7C4', flashOpacity: 0, particleCount: 0 } } as unknown as IOpeningFacade

    await render(<OpeningOverlay opening={common} />)

    expect(screen.getByTestId('revealGlow')).toBeTruthy()

    expect(screen.queryByTestId('revealFlash')).toBeNull()

    expect(screen.getByTestId('revealParticles').children).toHaveLength(0)
  })

  it('a legendary prize flashes and bursts into particles', async () => {
    const legendary = { ...baseOpening, reveal: { titleText: 'You got', nameText: 'Sky-Dweller', brandText: 'Rolex', valueText: '$2,500', imageSource: 1, rarity: EWatchRarity.Legendary, rarityLabelText: 'Legendary!', rarityColorHex: '#FFC24A', flashOpacity: 0.9, particleCount: 28 } } as unknown as IOpeningFacade

    await render(<OpeningOverlay opening={legendary} />)

    expect(screen.getByTestId('revealFlash')).toBeTruthy()

    expect(screen.getByTestId('revealParticles').children).toHaveLength(28)
  })
})
