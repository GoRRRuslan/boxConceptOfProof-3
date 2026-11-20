import { render, screen } from '@testing-library/react-native'

import { ScreenHeader } from '@components/ScreenHeader'

describe('ScreenHeader', () => {
  it('shows the title and the labelled figure', async () => {
    await render(<ScreenHeader titleText="My Collection" trailingLabelText="Total value" trailingValueInCents={16_000} testID="header" />)

    expect(screen.getByText('My Collection')).toBeTruthy()

    expect(screen.getByText('Total value')).toBeTruthy()

    expect(screen.getByTestId('headerValue').props.children).toBe('$160')
  })
})
