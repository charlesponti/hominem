import { Button } from '@hominem/ui/button';
import { Textarea } from '@hominem/ui/textarea';
import { LoaderCircle, Mic, Paperclip, Send } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { useMatches } from 'react-router';

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
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(function ChatInput(
  { chatId, onStatusChange },
  ref,
) {
  const [inputValue, setInputValue] = useState('');
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose textarea ref to parent
  useImperativeHandle(ref, () => textareaRef.current!, []);

  // Get userId from root loader data
  const matches = useMatches();
  const rootData = matches.find((match) => match.id === 'root')?.data as
    | { supabaseId: string | null }
    | undefined;
  const userId = rootData?.supabaseId || undefined;

  const sendMessage = useSendMessage({ chatId, ...(userId && { userId }) });
  const { uploadState, clearAll } = useFileUpload();

  const characterCount = inputValue.length;
  const hasInput = inputValue.trim().length > 0;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const canSubmit = hasInput && !isOverLimit;

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit && uploadState.uploadedFiles.length === 0) return;

    const trimmedValue = inputValue.trim();
    try {
      onStatusChange?.('streaming');
      setInputValue(''); // Clear input immediately for better UX
      clearAll();

      await sendMessage.mutateAsync({
        message: trimmedValue,
        chatId,
      });

      onStatusChange?.('idle');
    } catch (error) {
      console.error('Failed to send message:', error);
      onStatusChange?.('error', error as Error);
      // Could add error handling UI here
    }
  }, [
    canSubmit,
    inputValue,
    sendMessage,
    uploadState.uploadedFiles,
    clearAll,
    chatId,
    onStatusChange,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (canSubmit || uploadState.uploadedFiles.length > 0) {
          handleSubmit();
        }
      }
    },
    [canSubmit, handleSubmit, uploadState.uploadedFiles.length],
  );

  const handleFileUpload = useCallback(() => {
    setShowFileUploader(true);
  }, []);

  const handleAudioRecord = useCallback(() => {
    setShowAudioRecorder(true);
  }, []);

  const handleFilesUploaded = useCallback((_files: unknown[]) => {
    // Files are already uploaded by the FileUploader component
    // The useFileUpload hook manages the state internally
  }, []);

  const handleAudioTranscribed = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        return
      }

      try {
        onStatusChange?.('streaming')
        await sendMessage.mutateAsync({
          message: transcript.trim(),
          chatId,
        })
        onStatusChange?.('idle')
      } catch (error) {
        console.error('Failed to send transcribed message:', error)
        onStatusChange?.('error', error as Error)
        throw error
      }
    },
    [chatId, onStatusChange, sendMessage],
  )

  const isSubmitting = sendMessage.isPending;

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Error message */}
        {isOverLimit ? (
          <div className="text-xs text-muted-foreground">
            <span className="text-destructive">Message too long</span>
          </div>
        ) : null}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="resize-none pr-12 touch-manipulation"
              rows={1}
              disabled={isSubmitting}
            />

            <div className="absolute bottom-3 right-2 text-xs text-muted-foreground/50">
              {characterCount}/{MAX_MESSAGE_LENGTH}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit && uploadState.uploadedFiles.length === 0}
            size="sm"
            title="Send message"
          >
            {isSubmitting ? <LoaderCircle className="size-4" /> : <Send className="size-4" />}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFileUpload}
            disabled={isSubmitting}
            title="Attach files"
          >
            <Paperclip className="size-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAudioRecord}
            disabled={isSubmitting}
            title="Record audio"
          >
            <Mic className="size-4" />
          </Button>
        </div>
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
