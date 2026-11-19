import { fireEvent, render, screen } from '@testing-library/react-native'

import { AppButton } from '@components/buttons/AppButton'

describe('AppButton', () => {
  it('shows its label and reports presses', async () => {
    const onPress = jest.fn()

    await render(<AppButton label="Buy" onPress={onPress} testID="button" />)

    expect(screen.getByText('Buy')).toBeTruthy()

    await fireEvent.press(screen.getByTestId('button'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn()

    await render(<AppButton label="Buy" onPress={onPress} isDisabled testID="button" />)

    await fireEvent.press(screen.getByTestId('button'))

    expect(onPress).not.toHaveBeenCalled()
  })
})
