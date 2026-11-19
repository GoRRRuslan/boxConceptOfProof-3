import { transitionOpeningPhase } from '@flows/openingFlow/_facadesLogic/openingPhaseMachine'
import { EOpeningEvent, EOpeningPhase } from '@flows/openingFlow/_types'

const run = (events: EOpeningEvent[], start = EOpeningPhase.Browsing) =>
  events.reduce((phase, event) => transitionOpeningPhase(phase, event), start)

describe('openingPhaseMachine', () => {
  it('walks the happy path: select, buy, open, reveal, close', () => {
    expect(transitionOpeningPhase(EOpeningPhase.Browsing, EOpeningEvent.BoxSelected)).toBe(EOpeningPhase.Inspecting)

    expect(
      run([
        EOpeningEvent.BoxSelected,
        EOpeningEvent.PurchasePressed,
        EOpeningEvent.PurchaseSucceeded,
        EOpeningEvent.OpenPressed,
        EOpeningEvent.LidOpened,
      ]),
    ).toBe(EOpeningPhase.Revealed)

    expect(transitionOpeningPhase(EOpeningPhase.Revealed, EOpeningEvent.ClosePressed)).toBe(EOpeningPhase.Browsing)
  })

  it('a failed purchase returns to inspecting so the user can try again', () => {
    expect(run([EOpeningEvent.BoxSelected, EOpeningEvent.PurchasePressed, EOpeningEvent.PurchaseFailed])).toBe(
      EOpeningPhase.Inspecting,
    )
  })

  it('cannot leave while the purchase or the opening animation runs', () => {
    expect(transitionOpeningPhase(EOpeningPhase.Purchasing, EOpeningEvent.ClosePressed)).toBe(EOpeningPhase.Purchasing)

    expect(transitionOpeningPhase(EOpeningPhase.Opening, EOpeningEvent.ClosePressed)).toBe(EOpeningPhase.Opening)
  })

  it('may leave after buying without opening (the watch is already owned)', () => {
    expect(transitionOpeningPhase(EOpeningPhase.Ready, EOpeningEvent.ClosePressed)).toBe(EOpeningPhase.Browsing)
  })

  it('ignores events that do not belong to the phase', () => {
    expect(transitionOpeningPhase(EOpeningPhase.Browsing, EOpeningEvent.PurchasePressed)).toBe(EOpeningPhase.Browsing)

    expect(transitionOpeningPhase(EOpeningPhase.Inspecting, EOpeningEvent.OpenPressed)).toBe(EOpeningPhase.Inspecting)

    expect(transitionOpeningPhase(EOpeningPhase.Ready, EOpeningEvent.PurchasePressed)).toBe(EOpeningPhase.Ready)

    expect(transitionOpeningPhase(EOpeningPhase.Purchasing, EOpeningEvent.PurchasePressed)).toBe(EOpeningPhase.Purchasing)

    expect(transitionOpeningPhase(EOpeningPhase.Revealed, EOpeningEvent.OpenPressed)).toBe(EOpeningPhase.Revealed)
  })
})
