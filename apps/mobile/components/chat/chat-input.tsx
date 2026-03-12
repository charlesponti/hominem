import { fontSizes } from '@hominem/ui/tokens';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '~/components/Button';
import TextArea from '~/components/text-input-autogrow';
import { makeStyles, theme } from '~/theme';

import { VoiceSessionModal } from '../media/voice-session-modal';
import AppIcon from '../ui/icon';

const MAX_MESSAGE_LENGTH = 10_000;

const DEFAULT_SUGGESTIONS = [
  'Help me expand this note',
  'Create an outline from this',
  'Summarize the key points',
  'Rewrite in a different style',
];

type ChatInputProps = {
  message: string;
  onMessageChange: (message: string) => void;
  onSendMessage: (message: string) => void;
  isPending?: boolean;
  suggestions?: string[];
};

export const ChatInput = ({
  message,
  onMessageChange,
  onSendMessage,
  isPending = false,
  suggestions = DEFAULT_SUGGESTIONS,
}: ChatInputProps) => {
  const styles = useStyles();
  const inputRef = useRef<React.ElementRef<typeof TextArea> | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const canSend = message.trim().length > 0 && !isPending && !isOverLimit;
  const showSuggestions = message.length === 0 && !isPending && suggestions.length > 0;

  const formatAttachmentContext = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
    if (assets.length === 0) return '';
    return assets
      .map((a) => {
        const name = a.fileName ?? a.uri.split('/').pop() ?? 'image';
        return `Attachment: ${name} (${a.type ?? 'image'})`;
      })
      .join('\n');
  }, []);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const attachmentContext = formatAttachmentContext(attachments);
    const fullMessage = attachmentContext
      ? `${message.trim()}\n\nAttached files:\n${attachmentContext}`
      : message.trim();
    onSendMessage(fullMessage);
    onMessageChange('');
    setAttachments([]);
    inputRef.current?.focus();
  }, [canSend, message, attachments, formatAttachmentContext, onSendMessage, onMessageChange]);

  const handleVoiceTranscribed = useCallback(
    (transcription: string) => {
      onSendMessage(transcription);
    },
    [onSendMessage],
  );

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setAttachments((prev) => [...prev, ...result.assets]);
    }
  }, []);

  const handleRemoveAttachment = useCallback((uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri));
  }, []);

  const handleSuggestionTap = useCallback(
    (suggestion: string) => {
      onMessageChange(suggestion);
      inputRef.current?.focus();
    },
    [onMessageChange],
  );

  return (
    <View style={styles.container}>
      {/* Suggestion chips */}
      {showSuggestions && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsScroll}
          contentContainerStyle={styles.suggestionsContent}
        >
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="xs"
              style={styles.suggestionChip}
              onPress={() => handleSuggestionTap(suggestion)}
              accessibilityLabel={suggestion}
            >
              {suggestion}
            </Button>
          ))}
        </ScrollView>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.attachmentsScroll}
          contentContainerStyle={styles.attachmentsContent}
        >
          {attachments.map((asset) => {
            const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'image';
            return (
              <View key={asset.uri} style={styles.attachmentChip}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {name}
                </Text>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onPress={() => handleRemoveAttachment(asset.uri)}
                  textStyle={styles.removeAttachment}
                  accessibilityLabel={`Remove ${name}`}
                >
                  ×
                </Button>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TextArea
          ref={inputRef}
          containerStyle={styles.inputContainer}
          placeholder="Where should we start?"
          style={[styles.input, isOverLimit && styles.inputError]}
          editable={!isPending}
          value={message}
          onChangeText={onMessageChange}
          testID="chat-input-message"
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Button
          variant="outline"
          size="icon-sm"
          style={styles.iconButton}
          onPress={handlePickImage}
          disabled={isPending}
          accessibilityLabel="Attach image"
          testID="chat-attach-button"
        >
          <AppIcon name="paperclip" size={18} color={theme.colors['text-tertiary']} />
        </Button>
        <Button
          variant="primary"
          size="icon-sm"
          style={styles.iconButton}
          onPress={() => setIsVoiceModalOpen(true)}
          accessibilityLabel="Open voice input"
          accessibilityHint="Opens a full-screen voice recording panel"
          testID="chat-voice-input-button"
        >
          <AppIcon name="microphone" size={20} color={theme.colors.white} />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          style={[styles.iconButton, styles.sendButton, !canSend ? styles.disabled : null]}
          disabled={!canSend}
          onPress={handleSend}
          accessibilityLabel="Send message"
          testID="chat-send-message-button"
        >
          <AppIcon name="arrow-up" size={20} color={theme.colors.foreground} />
        </Button>
      </View>

      {/* Character counter / over-limit warning */}
      <View style={styles.footer}>
        {isOverLimit ? <Text style={styles.overLimitText}>Message too long</Text> : null}
        <Text style={[styles.charCount, isOverLimit && styles.charCountError]}>
          {characterCount}/{MAX_MESSAGE_LENGTH}
        </Text>
      </View>

      <VoiceSessionModal
        visible={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onAudioTranscribed={handleVoiceTranscribed}
      />
    </View>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
      borderTopWidth: 1,
      borderTopColor: t.colors['border-default'],
      backgroundColor: t.colors.background,
      gap: t.spacing.sm_8,
    },
    suggestionsScroll: {
      flexGrow: 0,
    },
    suggestionsContent: {
      gap: t.spacing.sm_8,
      paddingRight: t.spacing.xs_4,
    },
    suggestionChip: {
      backgroundColor: t.colors.muted,
    },
    attachmentsScroll: {
      flexGrow: 0,
    },
    attachmentsContent: {
      gap: t.spacing.sm_8,
      paddingRight: t.spacing.xs_4,
    },
    attachmentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.xs_4,
      borderRadius: t.borderRadii.sm_6,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      backgroundColor: t.colors.muted,
      maxWidth: 160, // <‑ this value may need a token, consider adding if reused elsewhere
      gap: t.spacing.sm_8,
    },
    attachmentName: {
      color: t.colors.foreground,
      fontSize: fontSizes.xs,
      fontFamily: 'Geist Mono',
      flex: 1,
    },
    removeAttachment: {
      color: t.colors['text-tertiary'],
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: t.spacing.sm_8,
    },
    inputContainer: {
      flex: 1,
    },
    input: {
      color: t.colors.foreground,
      fontSize: fontSizes.sm,
      fontFamily: 'Geist Mono',
      maxHeight: 120, // <‑ consider converting to spacing token if needed
      minHeight: 48,
    },
    inputError: {
      borderColor: t.colors.destructive,
    },
    iconButton: {
      backgroundColor: t.colors.muted,
      borderColor: t.colors['border-default'],
    },
    sendButton: {
      backgroundColor: t.colors.muted,
    },
    disabled: {
      opacity: 0.5,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: t.spacing.sm_8,
    },
    charCount: {
      fontSize: fontSizes.xs,
      fontFamily: 'Geist Mono',
      color: t.colors['text-tertiary'],
    },
    charCountError: {
      color: t.colors.destructive,
    },
    overLimitText: {
      fontSize: fontSizes.xs,
      fontFamily: 'Geist Mono',
      color: t.colors.destructive,
      flex: 1,
    },
  }),
);
