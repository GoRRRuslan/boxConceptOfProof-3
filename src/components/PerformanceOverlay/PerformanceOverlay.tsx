import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppText } from '@components/AppText'
import { EPerformanceOverlayPlacement } from '@components/PerformanceOverlay/_types'
import { makeStyles } from '@components/PerformanceOverlay/PerformanceOverlay.styles'
import type { IRenderFrameStats } from '@services/performance/summarizeFrameDeltas'
import { theme } from '@utils/designSystem/Theme'

interface IPerformanceOverlayProps {
  renderFrameStats: IRenderFrameStats | null
  isRenderPaused: boolean
  placement?: EPerformanceOverlayPlacement
}

export const PerformanceOverlay = ({
  renderFrameStats,
  isRenderPaused,
  placement = EPerformanceOverlayPlacement.Top,
}: IPerformanceOverlayProps) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const inset = placement === EPerformanceOverlayPlacement.Top ? insets.top : insets.bottom
  const styles = useMemo(() => makeStyles(theme, inset, placement), [inset, placement])

  const overlayText = useMemo(() => {
    if (isRenderPaused) {
      return t('performance.paused')
    }

    if (!renderFrameStats) {
      return t('performance.measuring')
    }

    return t('performance.summary', {
      fps: renderFrameStats.averageFps.toFixed(1),
      average: renderFrameStats.averageFrameMilliseconds.toFixed(1),
      p95: renderFrameStats.p95FrameMilliseconds.toFixed(1),
      slow: renderFrameStats.slowFrames,
    })
  }, [t, renderFrameStats, isRenderPaused])

  return (
    <View style={styles.container} pointerEvents="none" testID="performanceOverlay">
      <AppText style={styles.text}>{overlayText}</AppText>
    </View>
  )
}
