import { useMemo } from 'react'
import { View } from 'react-native'

import { AppText } from '@components/AppText'
import { AppButton } from '@components/buttons/AppButton'
import { makeStyles } from '@flows/collectionFlow/screens/CollectionScreen/_components/EmptyCollection/EmptyCollection.styles'
import { theme } from '@utils/designSystem/Theme'

interface IEmptyCollectionProps {
  titleText: string
  descriptionText: string
  browseLabelText: string
  onBrowsePress: () => void
}

export const EmptyCollection = ({ titleText, descriptionText, browseLabelText, onBrowsePress }: IEmptyCollectionProps) => {
  const styles = useMemo(() => makeStyles(theme), [])

  return (
    <View style={styles.container} testID="collectionEmpty">
      <AppText style={styles.title}>{titleText}</AppText>
      <AppText style={styles.description}>{descriptionText}</AppText>
      <AppButton label={browseLabelText} onPress={onBrowsePress} testID="browseBoxesButton" />
    </View>
  )
}
