import { MaterialIcons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { MobileVoiceInput } from './mobile-voice-input'
import { Text, theme } from '~/theme'

interface VoiceSessionModalProps {
  visible: boolean
  onClose: () => void
  onAudioTranscribed: (transcription: string) => void
}

export function VoiceSessionModal({ visible, onClose, onAudioTranscribed }: VoiceSessionModalProps) {
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
              <MaterialIcons name="close" size={20} color={theme.colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <MobileVoiceInput
              autoTranscribe
              onAudioTranscribed={(transcription) => {
                onAudioTranscribed(transcription)
                onClose()
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
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 20,
    minHeight: 220,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    alignItems: 'center',
    gap: 16,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  hint: {
    textAlign: 'center',
  },
})
