import { theme } from '@utils/designSystem/Theme'
import { queryClient } from '@services/reactQuery/queryClient'

export const useAppFacade = () => {
  return { theme, queryClient }
}
