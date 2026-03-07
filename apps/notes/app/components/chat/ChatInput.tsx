import { useAuthContext } from '@hominem/auth';
import {
  Suggestions,
  Suggestion,
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputTools,
} from '@hominem/ui/ai-elements';
import { Button } from '@hominem/ui/button';
import { Mic, Paperclip, FileText } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';

import { useFileUpload } from '~/lib/hooks/use-file-upload';
import { useSendMessage } from '~/lib/hooks/use-send-message';

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

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(function ChatInput(
  { chatId, onStatusChange, onSaveAsNote, suggestions = DEFAULT_SUGGESTIONS },
  ref,
) {
  const [inputValue, setInputValue] = useState('');
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => textareaRef.current!, []);

  const { userId } = useAuthContext();

  const sendMessage = useSendMessage({ chatId, ...(userId && { userId }) });
  const { clearAll } = useFileUpload();

  const characterCount = inputValue.length;
  const hasInput = inputValue.trim().length > 0;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const canSubmit = hasInput && !isOverLimit;

  const handlePromptSubmit = useCallback(
    async (message: { text: string }) => {
      const trimmedValue = message.text.trim();
      if (!trimmedValue) return;

      try {
        onStatusChange?.('streaming');
        setInputValue('');
        clearAll();

        await sendMessage.mutateAsync({
          message: trimmedValue,
          chatId,
        });

        onStatusChange?.('idle');
      } catch (error) {
        console.error('Failed to send message:', error);
        onStatusChange?.('error', error as Error);
      }
    },
    [chatId, sendMessage, clearAll, onStatusChange],
  );

  const handleFileUpload = useCallback(() => {
    setShowFileUploader(true);
  }, []);

  const handleAudioRecord = useCallback(() => {
    setShowAudioRecorder(true);
  }, []);

  const handleFilesUploaded = useCallback(() => {}, []);

  const handleAudioTranscribed = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      try {
        onStatusChange?.('streaming');
        await sendMessage.mutateAsync({
          message: transcript.trim(),
          chatId,
        });
        onStatusChange?.('idle');
      } catch (error) {
        console.error('Failed to send transcribed message:', error);
        onStatusChange?.('error', error as Error);
        throw error;
      }
    },
    [chatId, onStatusChange, sendMessage],
  );

  const isSubmitting = sendMessage.isPending;

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  }, []);

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Suggestions */}
        {suggestions.length > 0 && !inputValue && !isSubmitting && (
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

        {/* PromptInput - AI Elements style */}
        <PromptInput onSubmit={handlePromptSubmit}>
          <div className="flex gap-2 items-end">
            <PromptInputTextarea
              ref={textareaRef}
              value={inputValue}
              onValueChange={setInputValue}
              placeholder="Type your message..."
              disabled={isSubmitting}
              className="flex-1"
            />
            <PromptInputSubmit
              status={isSubmitting ? 'streaming' : 'ready'}
              disabled={!canSubmit}
            />
          </div>

          <PromptInputFooter>
            <PromptInputTools>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFileUpload}
                disabled={isSubmitting}
                title="Attach files"
              >
                <Paperclip className="size-4" />
              </Button>

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

      {/* File Upload and Audio Recording Modals */}
      <ChatModals
        showFileUploader={showFileUploader}
        showAudioRecorder={showAudioRecorder}
        onCloseFileUploader={() => setShowFileUploader(false)}
        onCloseAudioRecorder={() => setShowAudioRecorder(false)}
        onFilesUploaded={handleFilesUploaded}
        onAudioTranscribed={handleAudioTranscribed}
      />
    </>
  );
});
