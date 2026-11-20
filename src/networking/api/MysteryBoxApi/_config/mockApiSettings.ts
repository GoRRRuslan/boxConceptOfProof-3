import { EMockFailureMode } from '@networking/api/MysteryBoxApi/_types'

const DEFAULT_LATENCY_IN_MILLISECONDS = 700

// Measurement and demo builds can start with a failing purchase: EXPO_PUBLIC_MOCK_PURCHASE_FAILURE=
// networkError | serverError | responseLost
const getInitialFailureMode = (): EMockFailureMode => {
  const requestedMode = process.env.EXPO_PUBLIC_MOCK_PURCHASE_FAILURE
  const knownMode = Object.values(EMockFailureMode).find(mode => mode === requestedMode)

  if (requestedMode && !knownMode) {
    console.warn(`EXPO_PUBLIC_MOCK_PURCHASE_FAILURE=${requestedMode} is not one of ${Object.values(EMockFailureMode).join(', ')}`)
  }

  return knownMode ?? EMockFailureMode.None
}

// Knobs of the simulated backend. Changed at runtime by the dev controls and by tests.
export const mockApiSettings = {
  latencyInMilliseconds: DEFAULT_LATENCY_IN_MILLISECONDS,
  purchaseFailureMode: getInitialFailureMode(),
}

export const resetMockApiSettings = () => {
  mockApiSettings.latencyInMilliseconds = DEFAULT_LATENCY_IN_MILLISECONDS

  mockApiSettings.purchaseFailureMode = EMockFailureMode.None
}
