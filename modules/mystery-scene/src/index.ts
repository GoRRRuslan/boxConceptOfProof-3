import { requireNativeModule, requireNativeView } from 'expo'
import type { ComponentType } from 'react'

import type { IMysterySceneModule, IMysterySceneViewProps } from './MysteryScene.types'

export * from './MysteryScene.types'

export const MysteryScene = requireNativeModule<IMysterySceneModule>('MysteryScene')

export const MysterySceneView: ComponentType<IMysterySceneViewProps> = requireNativeView('MysteryScene')
