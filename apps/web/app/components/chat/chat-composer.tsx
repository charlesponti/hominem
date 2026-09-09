import { AlertCircle, Mic, Paperclip, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { Persona } from '~/components/chat/persona';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '~/components/chat/prompt-input';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface ChatComposerFile {
  id: string;
  originalName: string;
}

interface ChatComposerProps {
  draft: string;
  className?: string;
  isSubmitting?: boolean;
  isOffline?: boolean;
  isStreaming?: boolean;
  hasContext?: boolean;
  attachments?: ChatComposerFile[];
  error?: string | null;
  statusMessage?: string | null;
  contextContent?: ReactNode;
  onChangeDraft: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  onRetry?: () => void;
  onAttachFiles?: (files: FileList | null) => void;
  onRemoveAttachment?: (fileId: string) => void;
  isVoiceSupported?: boolean;
  isListening?: boolean;
  onToggleVoice?: () => void;
  fileInputTestId?: string;
}

export function ChatComposer({
  className,
  draft,
  isSubmitting = false,
  isOffline = false,
  isStreaming = false,
  hasContext = false,
  attachments = [],
  error,
  statusMessage,
  contextContent,
  onChangeDraft,
  onSubmit,
  onStop,
  onRetry,
  onAttachFiles,
  onRemoveAttachment,
  isVoiceSupported = false,
  isListening = false,
  onToggleVoice,
  fileInputTestId = 'chat-file-input',
}: ChatComposerProps) {
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const hasContent = draft.trim().length > 0 || attachments.length > 0 || hasContext;
  const visibleError = error && error !== dismissedError ? error : null;
  const handleSubmit = () => {
    if (hasContent && !isSubmitting) {
      if (error) setDismissedError(error);
      onSubmit();
    }
  };

  return (
    <div className={cn('px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]', className)}>
      {contextContent}
      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Attached files">
          {attachments.map((file) => (
            <button
              className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              key={file.id}
              onClick={() => onRemoveAttachment?.(file.id)}
              type="button"
            >
              {file.originalName}
              <X aria-hidden="true" size={12} />
            </button>
          ))}
        </div>
      ) : null}
      {visibleError ? (
        <Badge
          aria-live="assertive"
          className="mb-2 h-auto max-w-full animate-in gap-1.5 rounded-lg py-1.5 pr-1.5 pl-2.5 text-left slide-in-from-bottom-2 fade-in"
          role="alert"
          variant="destructive"
        >
          <AlertCircle aria-hidden="true" />
          <span className="min-w-0 flex-1 whitespace-normal">{visibleError}</span>
          {onRetry ? (
            <Button
              aria-label="Retry sending"
              className="shrink-0"
              onClick={() => {
                setDismissedError(null);
                onRetry();
              }}
              size="xs"
              type="button"
              variant="ghost"
            >
              Retry
            </Button>
          ) : null}
          <Button
            aria-label="Dismiss error"
            className="-mr-1"
            onClick={() => setDismissedError(visibleError)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
        </Badge>
      ) : null}
      {statusMessage ? (
        <p aria-live="polite" className="mb-2 text-sm text-muted-foreground">
          {statusMessage}
        </p>
      ) : null}
      <PromptInput
        inputGroupClassName="rounded-xl border-border/50 bg-card/40 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-card/35"
        onSubmit={handleSubmit}
      >
        <PromptInputBody>
          <PromptInputTextarea
            aria-label="Chat message"
            className="min-h-10 text-sm"
            disabled={isSubmitting}
            onChange={(event) => onChangeDraft(event.target.value)}
            placeholder="Ask anything"
            value={draft}
          />
        </PromptInputBody>
        <PromptInputFooter className="!justify-end !gap-0.5 !pb-1 !pt-0">
          <PromptInputTools>
            {onAttachFiles ? (
              <PromptInputButton asChild tooltip="Attach file">
                <label className="cursor-pointer">
                  <Paperclip aria-hidden="true" size={16} />
                  <input
                    data-testid={fileInputTestId}
                    hidden
                    multiple
                    onChange={(event) => {
                      onAttachFiles(event.target.files);
                      event.currentTarget.value = '';
                    }}
                    type="file"
                  />
                </label>
              </PromptInputButton>
            ) : null}
            {isVoiceSupported && onToggleVoice ? (
              <PromptInputButton
                aria-label={isListening ? 'Stop voice input' : 'Voice input'}
                data-testid="chat-voice-input"
                data-voice-state={isListening ? 'listening' : 'ready'}
                onClick={onToggleVoice}
                tooltip={isListening ? 'Stop voice input' : 'Voice input'}
              >
                <span className="relative flex size-5 items-center justify-center">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
                      isListening
                        ? 'scale-100 opacity-100'
                        : 'pointer-events-none scale-95 opacity-0',
                    )}
                  >
                    <Persona className="size-5" state="listening" />
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
                      isListening ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
                    )}
                  >
                    <Mic size={16} />
                  </span>
                </span>
              </PromptInputButton>
            ) : null}
          </PromptInputTools>
          <PromptInputSubmit
            disabled={!isStreaming && (!hasContent || isSubmitting || isOffline)}
            onStop={isStreaming ? onStop : undefined}
            status={isStreaming ? 'streaming' : isSubmitting ? 'submitted' : 'ready'}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
