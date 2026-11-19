import { theme } from '@utils/designSystem/Theme'
import { queryClient } from '@services/reactQuery/queryClient'

// EXPO_PUBLIC_INITIAL_SCREEN=spike starts the Filament benchmark lab instead of the catalogue.
const IS_PERFORMANCE_LAB = process.env.EXPO_PUBLIC_INITIAL_SCREEN === 'spike'

export const useAppFacade = () => {
  return { theme, queryClient, isPerformanceLab: IS_PERFORMANCE_LAB }
}
