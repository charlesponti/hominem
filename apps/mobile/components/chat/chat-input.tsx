import { chatTokensNative, fontFamiliesNative, fontSizes } from '@hominem/ui/tokens';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '~/components/Button';
import TextArea from '~/components/text-input-autogrow';
import { makeStyles } from '~/theme';

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
  onTransformNote?: () => void;
  canTransformNote?: boolean;
  isPending?: boolean;
  suggestions?: string[];
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ChatInput = ({
  message,
  onMessageChange,
  onSendMessage,
  onTransformNote,
  canTransformNote = false,
  isPending = false,
  suggestions = DEFAULT_SUGGESTIONS,
}: ChatInputProps) => {
  const styles = useStyles();
  const { bottom } = useSafeAreaInsets();
  const inputRef = useRef<React.ElementRef<typeof TextArea> | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const canSend = message.trim().length > 0 && !isPending && !isOverLimit;
  const showSuggestions = message.length === 0 && !isPending && suggestions.length > 0;
  const shouldShowCharacterCount = isOverLimit || characterCount >= MAX_MESSAGE_LENGTH * 0.8;

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
    <View style={[styles.container, { paddingBottom: Math.max(bottom, 12) }]}>
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

      <TextArea
        ref={inputRef}
        containerStyle={styles.inputContainer}
        placeholder="Reply to Sherpa"
        style={[styles.input, isOverLimit && styles.inputError]}
        editable={!isPending}
        value={message}
        onChangeText={onMessageChange}
        testID="chat-input-message"
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />

      <View style={styles.toolbar}>
        <View style={styles.toolsLeft}>
          <Button
            variant="ghost"
            size="icon-sm"
            style={styles.toolButton}
            onPress={handlePickImage}
            disabled={isPending}
            accessibilityLabel="Attach image"
            testID="chat-attach-button"
          >
            <AppIcon name="plus" size={20} style={styles.toolIcon} />
          </Button>
          {onTransformNote ? (
            <Button
              variant="ghost"
              size="xs"
              style={[styles.toolButton, !canTransformNote ? styles.disabled : null]}
              onPress={onTransformNote}
              disabled={!canTransformNote}
              accessibilityLabel="Transform conversation into a note"
            >
              <Text style={styles.toolText}>note</Text>
            </Button>
          ) : null}
          {shouldShowCharacterCount ? (
            <Text style={[styles.charCount, isOverLimit && styles.charCountError]}>
              {isOverLimit ? 'Too long' : `${characterCount}/${MAX_MESSAGE_LENGTH}`}
            </Text>
          ) : null}
        </View>

        <View style={styles.toolsRight}>
          <Button
            variant="ghost"
            size="icon-sm"
            style={styles.toolButton}
            onPress={() => setIsVoiceModalOpen(true)}
            disabled={isPending}
            accessibilityLabel="Open voice input"
            accessibilityHint="Opens a full-screen voice recording panel"
            testID="chat-voice-input-button"
          >
            <AppIcon name="microphone" size={18} style={styles.toolIcon} />
          </Button>
          <Button
            variant="primary"
            size="icon-sm"
            style={[styles.sendButton, !canSend ? styles.sendButtonDisabled : null]}
            disabled={!canSend}
            onPress={handleSend}
            accessibilityLabel="Send message"
            testID="chat-send-message-button"
          >
            <AppIcon name="arrow-up" size={18} style={styles.sendIcon} />
          </Button>
        </View>
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
      paddingTop: t.spacing.sm_12,
      paddingBottom: t.spacing.xs_4,
      borderTopWidth: 1,
      borderTopColor: t.colors['border-default'],
      backgroundColor: t.colors.background,
      gap: t.spacing.xs_4,
    },
    suggestionsScroll: {
      flexGrow: 0,
    },
    suggestionsContent: {
      gap: chatTokensNative.suggestionGap,
      paddingRight: t.spacing.xs_4,
    },
    suggestionChip: {
      backgroundColor: chatTokensNative.surfaces.suggestion,
      borderColor: chatTokensNative.borders.suggestion,
      borderRadius: chatTokensNative.radii.suggestion,
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
      backgroundColor: t.colors['bg-surface'],
      maxWidth: 160,
      gap: t.spacing.sm_8,
    },
    attachmentName: {
      color: t.colors.foreground,
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
      flex: 1,
    },
    removeAttachment: {
      color: t.colors['text-tertiary'],
    },
    inputContainer: {
      width: '100%',
    },
    input: {
      color: t.colors.foreground,
      fontSize: 17,
      fontFamily: fontFamiliesNative.primary,
      lineHeight: 24,
      maxHeight: 140,
      minHeight: 44,
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      paddingHorizontal: 0,
      paddingVertical: t.spacing.xs_4,
    },
    inputError: {
      borderColor: t.colors.destructive,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toolsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs_4,
    },
    toolsRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm_8,
    },
    toolButton: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      width: 40,
      height: 40,
    },
    toolIcon: {
      color: t.colors['text-tertiary'],
    },
    toolText: {
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
      color: t.colors['text-tertiary'],
    },
    sendButton: {
      backgroundColor: t.colors['emphasis-highest'],
      borderColor: t.colors['emphasis-highest'],
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    sendIcon: {
      color: t.colors.white,
    },
    disabled: {
      opacity: 0.5,
    },
    charCount: {
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
      color: t.colors['text-tertiary'],
    },
    charCountError: {
      color: t.colors.destructive,
    },
  }),
);
