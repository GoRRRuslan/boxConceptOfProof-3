import { useMemo } from 'react'

import { useAnimatedNumber } from '@services/animation/useAnimatedNumber'
import { formatCurrency } from '@utils/formatCurrency'

// The text of an amount of money that counts to its new value instead of jumping. Only the component that shows
// the text re-renders while it counts, not the whole screen.
export const useFacadeAnimatedCurrency = (valueInCents: number): string => {
  const animatedValueInCents = useAnimatedNumber(valueInCents)

  return useMemo(() => formatCurrency(animatedValueInCents), [animatedValueInCents])
}
