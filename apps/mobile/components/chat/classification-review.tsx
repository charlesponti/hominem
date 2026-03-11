import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { useEffect } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { ArtifactType } from '@hominem/chat-services/types'
import { Text, theme } from '~/theme'
import { VOID_EASING_ENTER, VOID_MOTION_ENTER } from '~/theme/motion'

interface ClassificationReviewProps {
  proposedType: ArtifactType
  proposedTitle: string
  proposedChanges: string[]
  previewContent: string
  onAccept: () => void
  onReject: () => void
}

const TYPE_LABEL: Record<ArtifactType, string> = {
  note: 'NOTE',
  task: 'TASK',
  task_list: 'TASK LIST',
  tracker: 'TRACKER',
}

/**
 * ClassificationReview — mobile bottom sheet shown when state enters 'reviewing_changes'.
 * Accepts (persist) or rejects (idle). No swipe-to-dismiss.
 */
export const ClassificationReview = ({
  proposedType,
  proposedTitle,
  proposedChanges,
  previewContent,
  onAccept,
  onReject,
}: ClassificationReviewProps) => {
  const insets = useSafeAreaInsets()
  const translateY = useSharedValue(80)
  const opacity = useSharedValue(0)

  useEffect(() => {
    translateY.value = withTiming(0, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER })
    opacity.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER })
  }, [translateY, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16 },
            animatedStyle,
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text variant="caption" color="secondaryForeground" style={styles.typeLabel}>
              SAVE AS {TYPE_LABEL[proposedType]}
            </Text>
            <Text variant="body" color="foreground" style={styles.title}>
              {proposedTitle}
            </Text>
          </View>

          {/* Changes */}
          {proposedChanges.length > 0 && (
            <View style={styles.changesList}>
              {proposedChanges.map((change, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <View key={i} style={styles.changeRow}>
                  <Text variant="caption" color="secondaryForeground" style={styles.dash}>—</Text>
                  <Text variant="caption" color="secondaryForeground" style={styles.changeText}>{change}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Preview */}
          <ScrollView style={styles.preview} nestedScrollEnabled>
            <Text variant="caption" color="secondaryForeground" style={styles.previewText}>
              {previewContent}
            </Text>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.primaryBtn]}
              onPress={onAccept}
              accessibilityLabel="Save Note"
            >
              <Text variant="label" color="background">SAVE NOTE</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.secondaryBtn]}
              onPress={onReject}
              accessibilityLabel="Discard"
            >
              <Text variant="label" color="secondaryForeground">DISCARD</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: { gap: 4 },
  typeLabel: { letterSpacing: 1 },
  title: { fontWeight: '500' },
  changesList: { gap: 6 },
  changeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dash: { opacity: 0.4, marginTop: 1 },
  changeText: { flex: 1 },
  preview: {
    maxHeight: 120,
    backgroundColor: theme.colors.muted,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },
  previewText: { fontFamily: 'Geist Mono' },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryBtn: {
    backgroundColor: theme.colors.foreground,
    borderColor: theme.colors.foreground,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
  },
})
