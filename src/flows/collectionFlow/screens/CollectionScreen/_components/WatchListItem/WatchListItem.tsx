import { useMemo } from 'react'
import { Image, Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { AppText } from '@components/AppText'
import type { ICollectionItem } from '@flows/collectionFlow/_types'
import { makeStyles } from '@flows/collectionFlow/screens/CollectionScreen/_components/WatchListItem/WatchListItem.styles'
import { useEntranceAnimation } from '@services/animation/useEntranceAnimation'
import { theme } from '@utils/designSystem/Theme'

interface IWatchListItemProps {
  item: ICollectionItem
  onPress: (ownershipIdentifier: string) => void
}

export const WatchListItem = ({ item, onPress }: IWatchListItemProps) => {
  const styles = useMemo(() => makeStyles(theme, item.rarityColorHex), [item.rarityColorHex])
  const { animatedStyle } = useEntranceAnimation()

  return (
    // A newly won watch slides in; every row can be tapped for a big picture.
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.row}
        onPress={() => {
          onPress(item.ownershipIdentifier)
        }}
        testID={`collectionItem-${item.ownershipIdentifier}`}
      >
        <Image source={item.thumbnailSource} style={styles.thumbnail} resizeMode="contain" />
        <View style={styles.texts}>
          <AppText style={styles.name}>{item.nameText}</AppText>
          <AppText style={styles.brand}>{item.brandText}</AppText>
          {item.boxText ? <AppText style={styles.box}>{item.boxText}</AppText> : null}
        </View>
        <View style={styles.trailing}>
          <AppText style={styles.value}>{item.valueText}</AppText>
          <AppText style={styles.rarity}>{item.rarityLabelText}</AppText>
        </View>
      </Pressable>
    </Animated.View>
  )
}
