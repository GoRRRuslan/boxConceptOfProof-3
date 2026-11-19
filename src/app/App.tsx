import { useMemo } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'

import { makeStyles } from '@app/App.styles'
import { useAppFacade } from '@app/useAppFacade'
import { AppNavigationContainer } from '@navigation/navigationContainer'

const App = () => {
  const { theme, queryClient } = useAppFacade()
  const styles = useMemo(() => makeStyles(theme), [theme])

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppNavigationContainer />
          <StatusBar style="light" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default App
