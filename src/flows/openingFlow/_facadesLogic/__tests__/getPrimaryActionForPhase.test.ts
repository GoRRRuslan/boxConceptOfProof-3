import { getPrimaryActionForPhase } from '@flows/openingFlow/_facadesLogic/getPrimaryActionForPhase'
import { EOpeningPhase, EOpeningPrimaryAction } from '@flows/openingFlow/_types'

describe('getPrimaryActionForPhase', () => {
  it('shows no button while browsing', () => {
    expect(getPrimaryActionForPhase(EOpeningPhase.Browsing, true)).toBeNull()
  })

  it('offers Buy when inspecting, disabled if the balance is too low', () => {
    expect(getPrimaryActionForPhase(EOpeningPhase.Inspecting, true)).toEqual({ action: EOpeningPrimaryAction.Buy, isDisabled: false })

    expect(getPrimaryActionForPhase(EOpeningPhase.Inspecting, false)).toEqual({ action: EOpeningPrimaryAction.Buy, isDisabled: true })
  })

  it('disables the button while the purchase runs', () => {
    expect(getPrimaryActionForPhase(EOpeningPhase.Purchasing, true)).toEqual({ action: EOpeningPrimaryAction.Buy, isDisabled: true })
  })

  it('offers Open once bought, disabled while the lid opens', () => {
    expect(getPrimaryActionForPhase(EOpeningPhase.Ready, true)).toEqual({ action: EOpeningPrimaryAction.Open, isDisabled: false })

    expect(getPrimaryActionForPhase(EOpeningPhase.Opening, true)).toEqual({ action: EOpeningPrimaryAction.Open, isDisabled: true })
  })

  it('offers Done after the reveal', () => {
    expect(getPrimaryActionForPhase(EOpeningPhase.Revealed, true)).toEqual({ action: EOpeningPrimaryAction.Done, isDisabled: false })
  })
})
