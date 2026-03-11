import { useAuthContext } from '@hominem/auth';
import {
  Attachments,
  Attachment,
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  Suggestions,
  Suggestion,
  usePromptInputController,
} from '@hominem/ui/ai-elements';
import { Button } from '@hominem/ui/button';
import { FileText, Mic } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type ForwardedRef } from 'react';

import { useFileUpload } from '~/lib/hooks/use-file-upload';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import type { UploadedFile } from '~/lib/types/upload';

import { ChatModals } from './ChatModals';

const MAX_MESSAGE_LENGTH = 10000;

interface ChatInputProps {
  chatId: string;
  onStatusChange?: (
    status: 'idle' | 'submitted' | 'streaming' | 'error',
    error?: Error | null,
  ) => void;
  onSaveAsNote?: () => void;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  'Help me expand this note',
  'Create an outline from this',
  'Summarize the key points',
  'Rewrite in a different style',
];

const InnerChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(function InnerChatInput(
  { chatId, onStatusChange, onSaveAsNote, suggestions = DEFAULT_SUGGESTIONS },
  ref,
) {
  const { textInput, attachments } = usePromptInputController();
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => textareaRef.current!, []);

  const { userId } = useAuthContext();

  const sendMessage = useSendMessage({ chatId, ...(userId && { userId }) });
  const { uploadFiles, uploadState } = useFileUpload();

  const characterCount = textInput.value.length;
  const hasInput = textInput.value.trim().length > 0;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const canSubmit = hasInput && !isOverLimit;

  const formatAttachmentContext = useCallback((uploadedFiles: UploadedFile[]) => {
    if (uploadedFiles.length === 0) {
      return '';
    }

    return uploadedFiles
      .map((file) => {
        const extractedContent = file.textContent || file.content || '';
        const summary = extractedContent.trim().slice(0, 4000);

        return [
          `Attachment: ${file.originalName}`,
          `Type: ${file.type}`,
          `MIME: ${file.mimetype}`,
          summary ? `Extracted content:\n${summary}` : null,
        ]
          .filter((value): value is string => Boolean(value))
          .join('\n');
      })
      .join('\n\n');
  }, []);

  const handlePromptSubmit = useCallback(
    async (message: {
      text: string;
      files?: Array<{
        id: string;
        file?: File;
      }>;
    }) => {
      const trimmedValue = message.text.trim();
      if (!trimmedValue) return;

      try {
        onStatusChange?.('streaming');

        const selectedFiles = (message.files ?? [])
          .map((file) => file.file)
          .filter((file): file is File => Boolean(file));
        const uploadedFiles =
          selectedFiles.length > 0 ? await uploadFiles(selectedFiles) : [];
        const attachmentContext = formatAttachmentContext(uploadedFiles);
        const messageWithAttachments = attachmentContext
          ? `${trimmedValue}\n\nAttached files context:\n${attachmentContext}`
          : trimmedValue;

        textInput.setInput('');

        await sendMessage.mutateAsync({
          message: messageWithAttachments,
          chatId,
        });

        onStatusChange?.('idle');
        attachments.clear();
      } catch (error) {
        console.error('Failed to send message:', error);
        onStatusChange?.('error', error as Error);
      }
    },
    [attachments, chatId, formatAttachmentContext, onStatusChange, sendMessage, textInput, uploadFiles],
  );

  const handleAudioRecord = useCallback(() => {
    setShowAudioRecorder(true);
  }, []);

  const handleAudioTranscribed = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;
      setShowAudioRecorder(false);
      await handlePromptSubmit({ text: trimmed });
    },
    [handlePromptSubmit],
  );

  const isSubmitting = sendMessage.isPending || uploadState.isUploading;

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      textInput.setInput(suggestion);
      textareaRef.current?.focus();
    },
    [textInput],
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Suggestions */}
        {suggestions.length > 0 && !hasInput && !isSubmitting && (
          <Suggestions>
            {suggestions.map((suggestion) => (
              <Suggestion
                key={suggestion}
                suggestion={suggestion}
                onSuggestionClick={handleSuggestionClick}
              />
            ))}
          </Suggestions>
        )}

        {/* Error message */}
        {isOverLimit && <div className="text-xs text-destructive">Message too long</div>}
        {uploadState.errors.length > 0 && (
          <div className="text-xs text-destructive">{uploadState.errors[0]}</div>
        )}

        {/* PromptInput - AI Elements style */}
        <PromptInput onSubmit={handlePromptSubmit}>
          <div className="flex gap-2 items-end">
            <PromptInputTextarea
              ref={textareaRef}
              value={textInput.value}
              onValueChange={textInput.setInput}
              placeholder="Type your message..."
              disabled={isSubmitting}
              className="flex-1"
            />
            <PromptInputSubmit
              status={isSubmitting ? 'streaming' : 'ready'}
              disabled={!canSubmit}
            />
          </div>

          {attachments.files.length > 0 ? (
            <Attachments variant="inline" className="mb-2">
              {attachments.files.map((file) => (
                <Attachment
                  key={file.id}
                  data={file}
                  onRemove={() => attachments.remove(file.id)}
                />
              ))}
            </Attachments>
          ) : null}

          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger title="Attach files" disabled={isSubmitting} />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments label="Attach files" />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAudioRecord}
                disabled={isSubmitting}
                title="Record audio"
              >
                <Mic className="size-4" />
              </Button>

              {onSaveAsNote && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={onSaveAsNote}
                  title="Save as Note"
                >
                  <FileText className="size-4" />
                </Button>
              )}
            </PromptInputTools>

            <span className="text-xs text-muted-foreground">
              {characterCount}/{MAX_MESSAGE_LENGTH}
            </span>
          </PromptInputFooter>
        </PromptInput>
      </div>

      {/* Voice recording modal */}
      <ChatModals
        showAudioRecorder={showAudioRecorder}
        onCloseAudioRecorder={() => setShowAudioRecorder(false)}
        onAudioTranscribed={handleAudioTranscribed}
      />
    </>
  );
});

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(function ChatInput(
  props: ChatInputProps,
  ref: ForwardedRef<HTMLTextAreaElement>,
) {
  return (
    <PromptInputProvider>
      <InnerChatInput {...props} ref={ref} />
    </PromptInputProvider>
  );
});
