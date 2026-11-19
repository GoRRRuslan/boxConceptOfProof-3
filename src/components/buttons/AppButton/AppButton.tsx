import { useMemo } from 'react'
import { Pressable } from 'react-native'

import { AppText } from '@components/AppText'
import { makeStyles } from '@components/buttons/AppButton/AppButton.styles'
import { theme } from '@utils/designSystem/Theme'

interface IAppButtonProps {
  label: string
  onPress: () => void
  testID: string
  isDisabled?: boolean
}

export const AppButton = ({ label, onPress, testID, isDisabled = false }: IAppButtonProps) => {
  const styles = useMemo(() => makeStyles(theme), [])

  return (
    <Pressable
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
    >
      <AppText style={styles.label}>{label}</AppText>
    </Pressable>
  )
}
