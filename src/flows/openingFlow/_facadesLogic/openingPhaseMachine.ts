import { EOpeningEvent, EOpeningPhase } from '@flows/openingFlow/_types'

// phase -> event -> next phase. An event that is not listed for the phase is ignored (the phase
// stays), so a double tap or a late result can never push the flow into a wrong state.
const TRANSITIONS: Record<EOpeningPhase, Partial<Record<EOpeningEvent, EOpeningPhase>>> = {
  [EOpeningPhase.Browsing]: {
    [EOpeningEvent.BoxSelected]: EOpeningPhase.Inspecting,
  },
  [EOpeningPhase.Inspecting]: {
    [EOpeningEvent.PurchasePressed]: EOpeningPhase.Purchasing,
    [EOpeningEvent.ClosePressed]: EOpeningPhase.Browsing,
  },
  [EOpeningPhase.Purchasing]: {
    [EOpeningEvent.PurchaseSucceeded]: EOpeningPhase.Ready,
    [EOpeningEvent.PurchaseFailed]: EOpeningPhase.Inspecting,
  },
  [EOpeningPhase.Ready]: {
    [EOpeningEvent.OpenPressed]: EOpeningPhase.Opening,
    [EOpeningEvent.ClosePressed]: EOpeningPhase.Browsing,
  },
  [EOpeningPhase.Opening]: {
    [EOpeningEvent.LidOpened]: EOpeningPhase.Revealed,
  },
  [EOpeningPhase.Revealed]: {
    [EOpeningEvent.ClosePressed]: EOpeningPhase.Browsing,
  },
}

export const transitionOpeningPhase = (phase: EOpeningPhase, event: EOpeningEvent): EOpeningPhase =>
  TRANSITIONS[phase][event] ?? phase
