import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useMemo } from 'react'

import { CatalogueScreen } from '@flows/catalogueFlow/screens/CatalogueScreen'
import { CollectionScreen } from '@flows/collectionFlow/screens/CollectionScreen'
import { ETabRoute, type TTabParamList } from '@navigation/_types'
import { useFacadeTabNavigator } from '@navigation/navigators/TabNavigator/_facades/useFacadeTabNavigator'
import { makeStyles } from '@navigation/navigators/TabNavigator/TabNavigator.styles'
import { theme } from '@utils/designSystem/Theme'

const Tab = createBottomTabNavigator<TTabParamList>()

export const TabNavigator = () => {
  const styles = useMemo(() => makeStyles(theme), [])

  // -------------------- Service hooks -------------------- //
  const { catalogueLabelText, collectionLabelText } = useFacadeTabNavigator()

  // The catalogue holds the app's only 3D canvas: its screen must stay attached while another tab is
  // shown, otherwise the surface is destroyed and recreated on every switch.
  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={({ route }) => ({
        headerShown: false,
        // Switching tabs fades instead of cutting.
        animation: 'fade',
        // While the catalogue shows a prize its tab bar is invisible and cannot be tapped (the layout does not change).
        tabBarStyle: [styles.tabBar, route.name === ETabRoute.Catalogue && route.params?.isTabBarHidden ? styles.tabBarHidden : null],
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
        tabBarActiveTintColor: theme.Colors.accent,
        tabBarInactiveTintColor: theme.Colors.textSecondary,
      })}
    >
      <Tab.Screen
        name={ETabRoute.Catalogue}
        component={CatalogueScreen}
        options={{ tabBarLabel: catalogueLabelText, tabBarButtonTestID: 'catalogueTab' }}
      />
      <Tab.Screen
        name={ETabRoute.Collection}
        component={CollectionScreen}
        options={{ tabBarLabel: collectionLabelText, tabBarButtonTestID: 'collectionTab' }}
      />
    </Tab.Navigator>
  )
}
