import { useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface IUseFacadeScreenContainerParams {
  withTopInset: boolean
  withBottomInset: boolean
}

export const useFacadeScreenContainer = ({ withTopInset, withBottomInset }: IUseFacadeScreenContainerParams) => {
  const insets = useSafeAreaInsets()

  // -------------------------- Values ------------------------- //
  const topPadding = useMemo(() => (withTopInset ? insets.top : 0), [withTopInset, insets.top])
  const bottomPadding = useMemo(() => (withBottomInset ? insets.bottom : 0), [withBottomInset, insets.bottom])

  return { topPadding, bottomPadding }
}
