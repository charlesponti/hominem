import { useAuthContext } from '@hominem/auth';
import { Stack } from '@hominem/ui';
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
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
} from 'react';

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
  'Pull out the core idea',
  'Turn this into a note',
  'Give me a clean summary',
  'What am I missing?',
]

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
  const shouldShowCharacterCount = isOverLimit || characterCount >= MAX_MESSAGE_LENGTH * 0.8;

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
        const uploadedFiles = selectedFiles.length > 0 ? await uploadFiles(selectedFiles) : [];
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
    [
      attachments,
      chatId,
      formatAttachmentContext,
      onStatusChange,
      sendMessage,
      textInput,
      uploadFiles,
    ],
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
      <Stack gap="md">
        {/* Suggestions */}
        {suggestions.length > 0 && !hasInput && !isSubmitting && (
          <Suggestions className="flex flex-wrap gap-2.5">
            {suggestions.map((suggestion) => (
              <Suggestion
                key={suggestion}
                suggestion={suggestion}
                className="[&_button]:rounded-lg [&_button]:border [&_button]:border-slate-200/70 [&_button]:bg-white [&_button]:px-4 [&_button]:py-2.5 [&_button]:text-xs [&_button]:font-medium [&_button]:text-slate-700 [&_button]:transition-all [&_button]:hover:bg-slate-50 [&_button]:hover:border-slate-300 [&_button]:hover:text-slate-900 [&_button]:shadow-sm"
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
        <PromptInput
          onSubmit={handlePromptSubmit}
          className="rounded-xl border border-slate-200/60 bg-white shadow-lg shadow-black/5 transition-all focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-500/10"
        >
          <div className="flex items-end gap-3">
            <PromptInputTextarea
              ref={textareaRef}
              value={textInput.value}
              onValueChange={textInput.setInput}
              placeholder="Ask a follow-up or drop in a new thought"
              disabled={isSubmitting}
              className="min-h-12 flex-1 text-[15px] leading-6 placeholder:text-muted-foreground/60 bg-transparent"
            />
            <PromptInputSubmit
              status={isSubmitting ? 'streaming' : 'ready'}
              disabled={!canSubmit}
              className="transition-all"
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

          <PromptInputFooter className="border-t border-border/20">
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger title="Attach files" disabled={isSubmitting} className="text-muted-foreground/70 hover:text-foreground transition-colors" />
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
                className="text-muted-foreground/70 hover:text-foreground hover:bg-transparent transition-colors"
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
                  className="text-muted-foreground/70 hover:text-foreground hover:bg-transparent transition-colors"
                >
                  <FileText className="size-4" />
                </Button>
              )}
            </PromptInputTools>

              <span className="text-xs text-muted-foreground/60">
                {shouldShowCharacterCount
                  ? `${characterCount.toLocaleString()}/${MAX_MESSAGE_LENGTH.toLocaleString()}`
                  : 'Enter to send · Shift+Enter for newline'}
              </span>
          </PromptInputFooter>
        </PromptInput>
      </Stack>

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
