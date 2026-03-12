import type { ArtifactType } from '@hominem/chat-services/types';
import { useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '~/components/Button';
import { Text, makeStyles } from '~/theme';
import { VOID_EASING_ENTER, VOID_MOTION_ENTER } from '~/theme/motion';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: t.colors['overlay-modal-high'],
    },
    sheet: {
      backgroundColor: t.colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopWidth: 1,
      borderColor: t.colors['border-default'],
      padding: t.spacing.ml_24,
      gap: t.spacing.m_16,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 999, // special: infinite radius for pill
      backgroundColor: t.colors['border-default'],
      alignSelf: 'center',
      marginBottom: t.spacing.xs_4,
    },
    header: { gap: t.spacing.xs_4 },
    typeLabel: { letterSpacing: 1 },
    title: { fontWeight: '500' },
    changesList: { gap: t.spacing.xs_4 },
    changeRow: { flexDirection: 'row', gap: t.spacing.sm_8, alignItems: 'flex-start' },
    dash: { opacity: 0.4, marginTop: 1 },
    changeText: { flex: 1 },
    preview: {
      maxHeight: 120,
      backgroundColor: t.colors.muted,
      borderRadius: t.borderRadii.sm_6,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      padding: t.spacing.sm_12,
    },
    previewText: { fontFamily: 'Geist Mono' },
    actions: { flexDirection: 'row', gap: t.spacing.sm_8 },
    btn: {
      flex: 1,
    },
    primaryBtn: {
      backgroundColor: t.colors.foreground,
      borderColor: t.colors.foreground,
    },
    secondaryBtn: {
      backgroundColor: 'transparent',
      borderColor: t.colors['border-default'],
    },
  }),
);

type ClassificationReviewProps = {
  proposedType: ArtifactType;
  proposedTitle: string;
  proposedChanges: string[];
  previewContent: string;
  onAccept: () => void;
  onReject: () => void;
};

const TYPE_LABEL: Record<ArtifactType, string> = {
  note: 'NOTE',
  task: 'TASK',
  task_list: 'TASK LIST',
  tracker: 'TRACKER',
};

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
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
    opacity.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
  }, [translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, animatedStyle]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text variant="caption" color="text-secondary" style={styles.typeLabel}>
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
                  <Text variant="caption" color="text-secondary" style={styles.dash}>
                    —
                  </Text>
                  <Text variant="caption" color="text-secondary" style={styles.changeText}>
                    {change}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Preview */}
          <ScrollView style={styles.preview} nestedScrollEnabled>
            <Text variant="caption" color="text-secondary" style={styles.previewText}>
              {previewContent}
            </Text>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              variant="primary"
              style={[styles.btn, styles.primaryBtn]}
              onPress={onAccept}
              accessibilityLabel="Save Note"
            >
              SAVE NOTE
            </Button>
            <Button
              variant="outline"
              style={[styles.btn, styles.secondaryBtn]}
              onPress={onReject}
              accessibilityLabel="Discard"
            >
              DISCARD
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
