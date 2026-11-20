import { useMemo } from 'react'
import { Image, Modal, Pressable, View } from 'react-native'

import { AppText } from '@components/AppText'
import { AppButton } from '@components/buttons/AppButton'
import type { ICollectionItem } from '@flows/collectionFlow/_types'
import { makeStyles } from '@flows/collectionFlow/screens/CollectionScreen/_components/CollectionDetailModal/CollectionDetailModal.styles'
import { theme } from '@utils/designSystem/Theme'

interface ICollectionDetailModalProps {
  item: ICollectionItem | null
  closeLabelText: string
  onClose: () => void
}

// A big picture of one won watch, opened by tapping its row.
export const CollectionDetailModal = ({ item, closeLabelText, onClose }: ICollectionDetailModalProps) => {
  const styles = useMemo(() => makeStyles(theme, item?.rarityColorHex ?? theme.Colors.accent), [item?.rarityColorHex])

  return (
    <Modal visible={item !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="collectionDetailBackdrop">
        {item ? (
          <View style={styles.sheet} testID="collectionDetail">
            <AppText style={styles.rarity}>{item.rarityLabelText}</AppText>
            <Image source={item.fullImageSource} style={styles.image} resizeMode="contain" />
            <AppText style={styles.name}>{item.nameText}</AppText>
            <AppText style={styles.brand}>{item.brandText}</AppText>
            <AppText style={styles.value}>{item.valueText}</AppText>
            {item.boxText ? <AppText style={styles.box}>{item.boxText}</AppText> : null}
            <AppButton label={closeLabelText} onPress={onClose} testID="collectionDetailClose" />
          </View>
        ) : null}
      </Pressable>
    </Modal>
  )
}
