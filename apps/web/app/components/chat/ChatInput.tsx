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
                className="[&_button]:rounded-md [&_button]:border [&_button]:border-[rgba(0,0,0,0.12)] [&_button]:bg-white [&_button]:px-3.5 [&_button]:py-2 [&_button]:text-sm [&_button]:font-normal [&_button]:text-[rgba(0,0,0,0.7)] [&_button]:transition-colors [&_button]:hover:bg-[rgba(0,0,0,0.04)] [&_button]:hover:text-[rgba(0,0,0,0.9)]"
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

        {/* PromptInput - ChatGPT style with elevated shadow */}
        <PromptInput
          onSubmit={handlePromptSubmit}
          className="rounded-[1.75rem] border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-shadow focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-end gap-3 px-4 py-3">
            <PromptInputTextarea
              ref={textareaRef}
              value={textInput.value}
              onValueChange={textInput.setInput}
              placeholder="Ask anything"
              disabled={isSubmitting}
              className="min-h-12 flex-1 border-0 bg-transparent px-0 py-0 text-[15px] leading-relaxed placeholder:text-[rgba(0,0,0,0.35)] focus-visible:ring-0 resize-none"
            />
            <PromptInputSubmit
              status={isSubmitting ? 'streaming' : 'ready'}
              disabled={!canSubmit}
              className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#1a1a1a] disabled:bg-[rgba(0,0,0,0.08)] disabled:text-[rgba(0,0,0,0.3)] size-9 shrink-0 transition-colors"
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

          <PromptInputFooter className="border-t border-[rgba(0,0,0,0.06)] pt-2 pb-1 px-4">
            <PromptInputTools className="gap-1">
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger title="Attach files" disabled={isSubmitting} className="text-[rgba(0,0,0,0.35)] hover:text-[rgba(0,0,0,0.6)] transition-colors h-7 w-7" />
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
                className="text-[rgba(0,0,0,0.35)] hover:text-[rgba(0,0,0,0.6)] hover:bg-transparent transition-colors h-7 w-7 p-0"
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
                  className="text-[rgba(0,0,0,0.35)] hover:text-[rgba(0,0,0,0.6)] hover:bg-transparent transition-colors h-7 w-7 p-0"
                >
                  <FileText className="size-4" />
                </Button>
              )}
            </PromptInputTools>

            <span className="text-[11px] text-[rgba(0,0,0,0.35)]">
              {shouldShowCharacterCount
                ? `${characterCount.toLocaleString()}/${MAX_MESSAGE_LENGTH.toLocaleString()}`
                : 'Enter ↵ · Shift+Enter for newline'}
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
