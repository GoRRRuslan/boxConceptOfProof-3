import { NavigationContainer } from '@react-navigation/native'

import { navigationTheme } from '@navigation/navigationContainer/navigationTheme'
import { TabNavigator } from '@navigation/navigators/TabNavigator'

export const AppNavigationContainer = () => (
  <NavigationContainer theme={navigationTheme}>
    <TabNavigator />
  </NavigationContainer>
)
