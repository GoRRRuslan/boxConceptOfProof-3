import type { ImageSourcePropType } from 'react-native'

export interface ICollectionItem {
  ownershipIdentifier: string
  nameText: string
  brandText: string
  valueText: string
  // Which box it came from; null while the boxes are not loaded (nothing is guessed).
  boxText: string | null
  thumbnailSource: ImageSourcePropType
  fullImageSource: ImageSourcePropType
  rarityLabelText: string
  rarityColorHex: string
}

export interface ICollectionFacade {
  titleText: string
  totalValueLabelText: string
  totalValueInCents: number
  countText: string
  items: ICollectionItem[]
  isEmpty: boolean
  emptyTitleText: string
  emptyDescriptionText: string
  browseLabelText: string
  handleBrowsePress: () => void
  // The watch shown big in the detail sheet; null while none is opened.
  selectedItem: ICollectionItem | null
  closeLabelText: string
  handleItemPress: (ownershipIdentifier: string) => void
  handleDetailClose: () => void
}
