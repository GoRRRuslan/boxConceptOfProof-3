import { render, screen } from '@testing-library/react-native'

import '@i18next/i18init'
import App from '@app/App'

jest.mock('@flows/catalogueFlow/screens/CatalogueScreen', () => {
  const { View } = jest.requireActual('react-native')

  return { CatalogueScreen: () => <View testID="catalogueScreen" /> }
})

jest.mock('@flows/collectionFlow/screens/CollectionScreen', () => {
  const { View } = jest.requireActual('react-native')

  return { CollectionScreen: () => <View testID="collectionScreen" /> }
})

describe('App', () => {
  it('renders the root screen inside the providers', async () => {
    await render(<App />)

    expect(screen.getByTestId('catalogueScreen')).toBeTruthy()
  })
})
