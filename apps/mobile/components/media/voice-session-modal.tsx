import { MaterialIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text, makeStyles } from '~/theme';

import { MobileVoiceInput } from './mobile-voice-input';

interface VoiceSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onAudioTranscribed: (transcription: string) => void;
}

export function VoiceSessionModal({
  visible,
  onClose,
  onAudioTranscribed,
}: VoiceSessionModalProps) {
  const styles = useStyles();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View style={styles.container} accessibilityRole="none">
          <View style={styles.header}>
            <Text variant="label" color="text-secondary">
              Voice Input
            </Text>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close voice input"
              accessibilityRole="button"
            >
              <MaterialIcons name="close" size={20} color="#000" />
            </Pressable>
          </View>

          <View style={styles.body}>
            <MobileVoiceInput
              autoTranscribe
              onAudioTranscribed={(transcription) => {
                onAudioTranscribed(transcription);
                onClose();
              }}
              onError={onClose}
              style={styles.micButton}
            />
            <Text variant="caption" color="text-secondary" style={styles.hint}>
              Tap to record · tap again to stop
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: t.colors['overlay-modal-high'],
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: t.colors.background,
      borderTopLeftRadius: t.borderRadii.xl_20,
      borderTopRightRadius: t.borderRadii.xl_20,
      paddingBottom: t.spacing.xl_48,
      paddingHorizontal: t.spacing.ml_24,
      paddingTop: t.spacing.m_16,
      minHeight: 220,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: t.spacing.l_32,
    },
    closeButton: {
      padding: t.spacing.xs_4,
    },
    body: {
      alignItems: 'center',
      gap: t.spacing.m_16,
    },
    micButton: {
      width: 72,
      height: 72,
      borderRadius: 36 /* half of 72 for circle */,
    },
    hint: {
      textAlign: 'center',
    },
  }),
);
