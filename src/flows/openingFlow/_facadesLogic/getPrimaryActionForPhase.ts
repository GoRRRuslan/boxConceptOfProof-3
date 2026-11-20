import { EOpeningPhase, EOpeningPrimaryAction } from '@flows/openingFlow/_types'

interface IPrimaryActionState {
  action: EOpeningPrimaryAction
  isDisabled: boolean
}

// The one big button of the opening screen, by phase: Buy -> (wait) -> Open -> (wait) -> Done.
export const getPrimaryActionForPhase = (phase: EOpeningPhase, isAffordable: boolean): IPrimaryActionState | null => {
  switch (phase) {
    case EOpeningPhase.Inspecting:
      return { action: EOpeningPrimaryAction.Buy, isDisabled: !isAffordable }
    case EOpeningPhase.Purchasing:
      return { action: EOpeningPrimaryAction.Buy, isDisabled: true }
    case EOpeningPhase.Ready:
      return { action: EOpeningPrimaryAction.Open, isDisabled: false }
    case EOpeningPhase.Opening:
      return { action: EOpeningPrimaryAction.Open, isDisabled: true }
    case EOpeningPhase.Revealed:
      return { action: EOpeningPrimaryAction.Done, isDisabled: false }
    case EOpeningPhase.Browsing:
      return null
  }
}
