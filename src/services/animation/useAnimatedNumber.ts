import { useEffect, useRef, useState } from 'react'

import { computeAnimatedNumber } from '@services/animation/computeAnimatedNumber'

const FRAME_MILLISECONDS = 16

// A number that counts to its new value instead of jumping (balance, collection value). The first value is shown at once.
export const useAnimatedNumber = (target: number, durationMilliseconds = 700): number => {
  const [displayed, setDisplayed] = useState<number>(target)
  const displayedReference = useRef<number>(target)

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    if (displayedReference.current === target) {
      return
    }

    const from = displayedReference.current
    const startedAt = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const value = computeAnimatedNumber(from, target, elapsed, durationMilliseconds)

      displayedReference.current = value

      setDisplayed(value)

      if (elapsed >= durationMilliseconds) {
        clearInterval(timer)
      }
    }, FRAME_MILLISECONDS)

    return () => {
      clearInterval(timer)
    }
  }, [target, durationMilliseconds])

  return displayed
}
