import { useMemo } from 'react'
import { View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated'

import { AppText } from '@components/AppText'
import { AppButton } from '@components/buttons/AppButton'
import type { IOpeningFacade } from '@flows/openingFlow/_types'
import { RevealBurst, RevealGlow } from '@flows/openingFlow/screens/OpeningOverlay/_components/RevealEffects'
import { WatchRevealImage } from '@flows/openingFlow/screens/OpeningOverlay/_components/WatchRevealImage'
import { makeStyles } from '@flows/openingFlow/screens/OpeningOverlay/OpeningOverlay.styles'
import { theme } from '@utils/designSystem/Theme'

interface IOpeningOverlayProps {
  opening: IOpeningFacade
}

// Everything the user sees on top of the 3D box while it is opened: title, hint, errors, the one
// primary button and the revealed watch. The drag area under it turns the box.
export const OpeningOverlay = ({ opening }: IOpeningOverlayProps) => {
  const { reveal, primaryButton } = opening
  const styles = useMemo(() => makeStyles(theme, reveal?.rarityColorHex ?? theme.Colors.accent), [reveal?.rarityColorHex])

  const renderReveal = () =>
    reveal ? (
      <View style={styles.reveal} pointerEvents="none" testID="revealedWatch">
        <RevealGlow colorHex={reveal.rarityColorHex} />
        <View style={styles.rarityPill}>
          <AppText style={styles.rarity} testID="revealedRarity">
            {reveal.rarityLabelText}
          </AppText>
        </View>
        <WatchRevealImage source={reveal.imageSource} tilt={opening.tilt} />
        <Animated.View entering={FadeInUp.delay(450).duration(450)} style={styles.revealTexts}>
          <AppText style={styles.watchValue}>{reveal.valueText}</AppText>
          <AppText style={styles.watchName} testID="revealedWatchName">
            {reveal.nameText}
          </AppText>
          <AppText style={styles.watchBrand}>{reveal.brandText}</AppText>
        </Animated.View>
      </View>
    ) : null

  return (
    <View style={styles.container} pointerEvents="box-none" testID="openingOverlay">
      <GestureDetector gesture={opening.gesture}>
        <View style={styles.dragArea} testID="dragArea" />
      </GestureDetector>
      <View style={styles.header} pointerEvents="box-none">
        {opening.isBackVisible ? (
          <View style={styles.backSlot}>
            <AppButton label={opening.backLabelText} onPress={opening.handleBackPress} testID="backButton" />
          </View>
        ) : null}
        {/* Once the prize is revealed the box name steps aside: the prize gets a clean stage, no text on top of the glow. */}
        {reveal ? null : (
          <Animated.View style={styles.titles} pointerEvents="none" exiting={FadeOut.duration(250)}>
            <AppText style={styles.boxName} numberOfLines={1} testID="openingBoxName">
              {opening.boxNameText}
            </AppText>
            <AppText style={styles.price}>{opening.priceText}</AppText>
          </Animated.View>
        )}
      </View>
      {/* The flash and the particles are drawn under the watch and its texts, so nothing ever covers the watch. */}
      {reveal ? (
        <RevealBurst colorHex={reveal.rarityColorHex} flashOpacity={reveal.flashOpacity} particleCount={reveal.particleCount} />
      ) : null}
      {renderReveal()}
      <View style={styles.footer} pointerEvents="box-none">
        {opening.errorText ? (
          <AppText style={styles.error} testID="openingError">
            {opening.errorText}
          </AppText>
        ) : null}
        {opening.hintText ? (
          <AppText style={styles.hint} testID="openingHint">
            {opening.hintText}
          </AppText>
        ) : null}
        {primaryButton ? (
          <AppButton
            label={primaryButton.labelText}
            onPress={primaryButton.onPress}
            isDisabled={primaryButton.isDisabled}
            testID={primaryButton.testID}
          />
        ) : null}
      </View>
    </View>
  )
}
