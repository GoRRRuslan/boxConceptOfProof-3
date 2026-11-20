import { renderHook } from '@testing-library/react-native'

import '@i18next/i18init'
import { useFacadeTabNavigator } from '@navigation/navigators/TabNavigator/_facades/useFacadeTabNavigator'

describe('useFacadeTabNavigator', () => {
  it('labels the two tabs', async () => {
    const { result } = await renderHook(() => useFacadeTabNavigator())

    expect(result.current.catalogueLabelText).toBe('Boxes')

    expect(result.current.collectionLabelText).toBe('Collection')
  })
})
