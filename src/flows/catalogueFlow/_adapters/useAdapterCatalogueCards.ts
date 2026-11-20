import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { getBoxFinish } from '@flows/catalogueFlow/_facadesLogic/getBoxFinish'
import { convertHexToLinearColor } from '@flows/catalogueFlow/_facadesLogic/convertHexToLinearColor'
import type { ICatalogueCard } from '@flows/catalogueFlow/_types'
import type { IGetBoxesResponse } from '@networking/api/MysteryBoxApi/_types'
import { formatCurrency } from '@utils/formatCurrency'

interface IUseAdapterCatalogueCardsParams {
  boxesData: IGetBoxesResponse | undefined
  balanceInCents: number
}

// Maps the API boxes and the wallet balance to what a catalogue card shows.
export const useAdapterCatalogueCards = ({ boxesData, balanceInCents }: IUseAdapterCatalogueCardsParams): ICatalogueCard[] => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (!boxesData) {
      return []
    }

    return boxesData.boxes.map(box => {
      const prizeValuesInCents = box.dropTable.map(entry => {
        const watch = boxesData.watches.find(candidate => candidate.identifier === entry.watchIdentifier)

        if (!watch) {
          throw new Error(`Box ${box.identifier} drops an unknown watch: ${entry.watchIdentifier}`)
        }

        return watch.valueInCents
      })
      const isAffordable = balanceInCents >= box.priceInCents

      return {
        identifier: box.identifier,
        name: box.name,
        priceText: formatCurrency(box.priceInCents),
        prizeText: t('catalogue.prizeUpTo', { amount: formatCurrency(Math.max(...prizeValuesInCents)) }),
        affordabilityText: isAffordable ? null : t('catalogue.notEnoughBalance'),
        isAffordable,
        colorLinearRgba: convertHexToLinearColor(box.colorHex),
        finish: getBoxFinish(box.priceInCents),
      }
    })
  }, [t, boxesData, balanceInCents])
}
