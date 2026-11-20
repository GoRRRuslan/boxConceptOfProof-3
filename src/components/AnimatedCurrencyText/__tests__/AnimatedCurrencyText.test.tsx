import { act, render, screen } from '@testing-library/react-native'

import { AnimatedCurrencyText } from '@components/AnimatedCurrencyText'

describe('AnimatedCurrencyText', () => {
  it('shows the first amount at once and counts to a new one instead of jumping', async () => {
    jest.useFakeTimers()

    const { rerender } = await render(<AnimatedCurrencyText valueInCents={100_000} testID="amount" />)

    expect(screen.getByTestId('amount').props.children).toBe('$1,000')

    await rerender(<AnimatedCurrencyText valueInCents={55_000} testID="amount" />)

    // Not there yet: the number is counting down.
    expect(screen.getByTestId('amount').props.children).toBe('$1,000')

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300)
    })

    expect(screen.getByTestId('amount').props.children).not.toBe('$1,000')

    expect(screen.getByTestId('amount').props.children).not.toBe('$550')

    await act(async () => {
      await jest.advanceTimersByTimeAsync(800)
    })

    expect(screen.getByTestId('amount').props.children).toBe('$550')

    jest.useRealTimers()
  })
})
