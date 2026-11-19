import { useMemo } from 'react'
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { AppText } from '@components/AppText'
import type { ICatalogueCard } from '@flows/catalogueFlow/_types'
import type { EBoxIdentifier } from '@networking/api/MysteryBoxApi/_types'
import { useFacadeBoxCard } from '@flows/catalogueFlow/screens/CatalogueScreen/_components/BoxCard/_facades/useFacadeBoxCard'
import { makeStyles } from '@flows/catalogueFlow/screens/CatalogueScreen/_components/BoxCard/BoxCard.styles'
import { theme } from '@utils/designSystem/Theme'

interface IBoxCardProps {
  card: ICatalogueCard
  index: number
  onPress: (boxIdentifier: EBoxIdentifier) => void
  onPressIn: (boxIdentifier: EBoxIdentifier) => void
  onPressOut: () => void
}

// A card is transparent on top (the 3D box shows through the slot) with the box facts below it.
export const BoxCard = ({ card, index, onPress, onPressIn, onPressOut }: IBoxCardProps) => {
  const styles = useMemo(() => makeStyles(theme), [])
  const { animatedStyle } = useFacadeBoxCard(index)

  return (
    // The texts fade in one card after the other (the 3D boxes pop in on their own, see the scene).
    <Animated.View style={animatedStyle}>
    <Pressable
      style={styles.card}
      onPress={() => {
        onPress(card.identifier)
      }}
      onPressIn={() => {
        onPressIn(card.identifier)
      }}
      onPressOut={onPressOut}
      testID={`boxCard-${card.identifier}`}
    >
      <View style={styles.boxSlot} />
      <View style={styles.info}>
        <AppText style={styles.name}>{card.name}</AppText>
        <AppText style={card.isAffordable ? styles.price : styles.priceUnaffordable} testID={`boxPrice-${card.identifier}`}>
          {card.priceText}
        </AppText>
        <AppText style={styles.prize}>{card.prizeText}</AppText>
        {card.affordabilityText ? (
          <AppText style={styles.affordability} testID={`boxAffordability-${card.identifier}`}>
            {card.affordabilityText}
          </AppText>
        ) : null}
      </View>
    </Pressable>
    </Animated.View>
  )
}
