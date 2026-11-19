import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { RARITY_STYLES } from '@flows/openingFlow/_config/rarityConfig'
import { getWatchRarity } from '@flows/openingFlow/_facadesLogic/getWatchRarity'
import type { ICollectionItem } from '@flows/collectionFlow/_types'
import type { IOwnedWatch } from '@models/mainStorage/CollectionStore/_types'
import type { IGetBoxesResponse } from '@networking/api/MysteryBoxApi/_types'
import { formatCurrency } from '@utils/formatCurrency'
import { WATCH_IMAGE_SOURCES, WATCH_THUMBNAIL_SOURCES } from '@utils/watchImageSources'

interface IUseAdapterCollectionItemsParams {
  ownedWatches: IOwnedWatch[]
  boxesData: IGetBoxesResponse | undefined
}

// Maps the owned watches to list rows, newest first.
export const useAdapterCollectionItems = ({ ownedWatches, boxesData }: IUseAdapterCollectionItemsParams): ICollectionItem[] => {
  const { t } = useTranslation()

  return useMemo(
    () =>
      [...ownedWatches].reverse().map(ownedWatch => {
        const rarity = getWatchRarity(ownedWatch.watch.valueInCents)
        const box = boxesData?.boxes.find(candidate => candidate.identifier === ownedWatch.boxIdentifier)

        return {
          ownershipIdentifier: ownedWatch.ownershipIdentifier,
          nameText: ownedWatch.watch.name,
          brandText: ownedWatch.watch.brand,
          valueText: formatCurrency(ownedWatch.watch.valueInCents),
          boxText: box ? t('collection.fromBox', { box: box.name }) : null,
          thumbnailSource: WATCH_THUMBNAIL_SOURCES[ownedWatch.watch.identifier],
          fullImageSource: WATCH_IMAGE_SOURCES[ownedWatch.watch.identifier],
          rarityLabelText: t(`opening.rarity.${rarity}`),
          rarityColorHex: RARITY_STYLES[rarity].colorHex,
        }
      }),
    [t, ownedWatches, boxesData],
  )
}
