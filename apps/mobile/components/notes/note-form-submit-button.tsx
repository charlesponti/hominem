import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'
import { Text, theme } from '~/theme'
import MindsherpaIcon from '../ui/icon'

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)
const AnimatedText = Animated.createAnimatedComponent(Text)

export const FormSubmitButton = ({
  isLoading,
  isRecording,
  onSubmitButtonClick,
}: {
  isLoading: boolean
  isRecording?: boolean
  onSubmitButtonClick: () => void
}) => {
  const loadingOpacity = useSharedValue(0)
  const loadingWidth = useSharedValue(0)
  const loadingTextStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
    width: loadingWidth.value,
  }))

  useEffect(() => {
    loadingWidth.value = withTiming(isLoading ? 85 : 0, { duration: VOID_MOTION_DURATION_STANDARD })
    loadingOpacity.value = withTiming(isLoading ? 1 : 0, { duration: VOID_MOTION_DURATION_STANDARD })
  }, [isLoading, loadingWidth, loadingOpacity])


  if (isLoading) {
    return (
      <AnimatedTouchableOpacity disabled style={[styles.sendButton, styles.loadingButton]}>
          <ActivityIndicator size="small" color={theme.colors.foreground} />
          <AnimatedText 
            variant="body" 
            color="foreground" 
            style={[loadingTextStyle]}>
            PROCESSING...
          </AnimatedText>
      </AnimatedTouchableOpacity>
    )
  }

  return (
    <AnimatedTouchableOpacity
      disabled={isRecording}
      onPress={onSubmitButtonClick}
      style={[styles.sendButton, { opacity: isRecording ? 0.6 : 1 }]}
    >
      <MindsherpaIcon name="arrow-up" size={20} color={theme.colors.foreground} />
    </AnimatedTouchableOpacity>
  )
}

const styles = StyleSheet.create({
  loadingButton: {
    flexDirection: 'row', 
    alignItems: 'center',
    columnGap: 12,
    paddingHorizontal: 12,
    lineHeight: 24,
    maxHeight: 44,
  },
  sendButton: {
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 190,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
})
