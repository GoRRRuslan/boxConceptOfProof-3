import { FlashList } from '@shopify/flash-list'
import { useMemo } from 'react'
import { View } from 'react-native'

import { AppText } from '@components/AppText'
import { FadingView } from '@components/FadingView'
import { ScreenHeader } from '@components/ScreenHeader'
import { PerformanceOverlay } from '@components/PerformanceOverlay'
import { EPerformanceOverlayPlacement } from '@components/PerformanceOverlay/_types'
import { AppButton } from '@components/buttons/AppButton'
import { ScreenContainer } from '@components/_layout/ScreenContainer'
import { useCatalogueFacade } from '@flows/catalogueFlow/_facades/useCatalogueFacade'
import type { ICatalogueCard } from '@flows/catalogueFlow/_types'
import { BoxCard } from '@flows/catalogueFlow/screens/CatalogueScreen/_components/BoxCard'
import { CatalogueScene } from '@flows/catalogueFlow/screens/CatalogueScreen/_components/CatalogueScene'
import { makeStyles } from '@flows/catalogueFlow/screens/CatalogueScreen/CatalogueScreen.styles'
import { OpeningOverlay } from '@flows/openingFlow/screens/OpeningOverlay'

const CatalogueScreen = () => {
  const styles = useMemo(() => makeStyles(), [])

  // -------------------- Service hooks -------------------- //
  const {
    titleText,
    balanceLabelText,
    balanceInCents,
    loadingText,
    errorText,
    retryLabelText,
    isLoadingBoxes,
    isErrorBoxes,
    cards,
    listRef,
    sceneCardLooks,
    opening,
    isPerformanceOverlayVisible,
    handleFrameStats,
    renderFrameStats,
    isRenderPaused,
    handleListLayout,
    handleScroll,
    handleRetryPress,
    handleCardPressIn,
    handleCardPressOut,
  } = useCatalogueFacade()

  // --------------------- Render methods ------------------//
  const renderCard = ({ item, index }: { item: ICatalogueCard; index: number }) => (
    <BoxCard
      card={item}
      index={index}
      onPress={opening.handleCardPress}
      onPressIn={handleCardPressIn}
      onPressOut={handleCardPressOut}
    />
  )

  const renderScene = () => (
    <View style={styles.sceneLayer} pointerEvents="none">
      <CatalogueScene
        cardLooks={sceneCardLooks}
        isFrameStatsEnabled={isPerformanceOverlayVisible}
        onFrameStats={handleFrameStats}
      />
    </View>
  )

  const renderList = () => (
    <FlashList
      ref={listRef}
      data={cards}
      renderItem={renderCard}
      keyExtractor={card => card.identifier}
      onScroll={handleScroll}
      scrollEventThrottle={1}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      testID="catalogueList"
    />
  )

  const renderStatus = () => {
    if (isLoadingBoxes) {
      return (
        <View style={styles.status} testID="catalogueLoading">
          <AppText>{loadingText}</AppText>
        </View>
      )
    }

    if (isErrorBoxes) {
      return (
        <View style={styles.status} testID="catalogueError">
          <AppText>{errorText}</AppText>
          <AppButton label={retryLabelText} onPress={handleRetryPress} testID="retryButton" />
        </View>
      )
    }

    return null
  }

  return (
    <ScreenContainer testID="catalogueScreen">
      <ScreenHeader
        titleText={titleText}
        trailingLabelText={balanceLabelText}
        trailingValueInCents={balanceInCents}
        testID="balanceHeader"
      />
      <View style={styles.listRegion} onLayout={handleListLayout}>
        {renderScene()}
        <FadingView isVisible={!opening.isListHidden} style={styles.listLayer}>
          {renderList()}
        </FadingView>
        {opening.isOverlayVisible ? <OpeningOverlay opening={opening} /> : null}
        {renderStatus()}
      </View>
      {isPerformanceOverlayVisible && !opening.isOverlayVisible ? (
        <PerformanceOverlay
          renderFrameStats={renderFrameStats}
          isRenderPaused={isRenderPaused}
          placement={EPerformanceOverlayPlacement.Bottom}
        />
      ) : null}
    </ScreenContainer>
  )
}

export default CatalogueScreen
