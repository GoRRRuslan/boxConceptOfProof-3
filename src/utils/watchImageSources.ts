import type { ImageSourcePropType } from 'react-native'

import casioImage from '@assets/images/watches/full/casio.webp'
import gmtImage from '@assets/images/watches/full/gmt.webp'
import perpetualImage from '@assets/images/watches/full/perpetual.webp'
import skyDwellerImage from '@assets/images/watches/full/sky-dweller.webp'
import casioThumbnail from '@assets/images/watches/thumb/casio.webp'
import gmtThumbnail from '@assets/images/watches/thumb/gmt.webp'
import perpetualThumbnail from '@assets/images/watches/thumb/perpetual.webp'
import skyDwellerThumbnail from '@assets/images/watches/thumb/sky-dweller.webp'
import { EWatchIdentifier } from '@networking/api/MysteryBoxApi/_types'

// Full size: the reveal. Thumbnails (about 1/6 of the bytes): lists.
export const WATCH_IMAGE_SOURCES: Record<EWatchIdentifier, ImageSourcePropType> = {
  [EWatchIdentifier.Casio]: casioImage,
  [EWatchIdentifier.Gmt]: gmtImage,
  [EWatchIdentifier.Perpetual]: perpetualImage,
  [EWatchIdentifier.SkyDweller]: skyDwellerImage,
}

export const WATCH_THUMBNAIL_SOURCES: Record<EWatchIdentifier, ImageSourcePropType> = {
  [EWatchIdentifier.Casio]: casioThumbnail,
  [EWatchIdentifier.Gmt]: gmtThumbnail,
  [EWatchIdentifier.Perpetual]: perpetualThumbnail,
  [EWatchIdentifier.SkyDweller]: skyDwellerThumbnail,
}
