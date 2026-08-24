import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mic, Paperclip } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '~/components/ui/button';

import { Persona } from './persona';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
  usePromptInputAttachments,
} from './prompt-input';

const meta = {
  title: 'Chat/PromptInput/Persona concepts',
  component: PromptInput,
  parameters: { layout: 'centered' },
  args: { onSubmit: () => undefined },
} satisfies Meta<typeof PromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function StoryFrame({ children }: { children: ReactNode }) {
  return <div className="w-full min-w-125 max-w-2xl px-4">{children}</div>;
}

function useStoryInput() {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState('');

  return {
    value,
    setValue,
    submitted,
    submit: () => {
      if (value.trim()) setSubmitted(value.trim());
    },
  };
}

const toolbarTransition =
  'transition-[opacity,transform] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none';

function ToolbarItem({ children, visible }: { children: ReactNode; visible: boolean }) {
  return (
    <span
      aria-hidden={!visible}
      className={`${toolbarTransition} ${
        visible ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
      }`}
      inert={!visible || undefined}
    >
      {children}
    </span>
  );
}

function VoiceButton({
  isListening,
  onClick,
  personaSize = 'size-5',
}: {
  isListening: boolean;
  onClick: () => void;
  personaSize?: string;
}) {
  return (
    <PromptInputButton
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      className={isListening ? 'bg-primary/10 text-primary' : undefined}
      onClick={onClick}
      tooltip={isListening ? 'Stop voice input' : 'Voice input'}
    >
      <span className="relative flex size-5 items-center justify-center">
        <span
          aria-hidden="true"
          className={`${toolbarTransition} absolute ${
            isListening ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <Persona className={personaSize} state="listening" />
        </span>
        <span
          aria-hidden="true"
          className={`${toolbarTransition} ${
            isListening ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <Mic size={16} />
        </span>
      </span>
    </PromptInputButton>
  );
}

function InputTools({
  children,
  showAttachment = true,
}: {
  children: ReactNode;
  showAttachment?: boolean;
}) {
  return (
    <PromptInputTools>
      <ToolbarItem visible={showAttachment}>
        <PromptInputButton aria-label="Attach file" tooltip="Attach file">
          <Paperclip size={16} />
        </PromptInputButton>
      </ToolbarItem>
      {children}
    </PromptInputTools>
  );
}

function SubmittedMessage({ value }: { value: string }) {
  return value ? <p className="mt-3 text-xs text-muted-foreground">Submitted: {value}</p> : null;
}

/** Persona takes over the existing microphone button, keeping the input geometry unchanged. */
export const ButtonTransformation: Story = {
  render: () => {
    const input = useStoryInput();
    const [isListening, setIsListening] = useState(false);

    return (
      <StoryFrame>
        <PromptInput onSubmit={input.submit}>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask anything"
              value={input.value}
              onChange={(event) => input.setValue(event.target.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <InputTools showAttachment={!isListening}>
              <VoiceButton
                isListening={isListening}
                onClick={() => setIsListening((current) => !current)}
              />
            </InputTools>
            <ToolbarItem visible={!isListening}>
              <PromptInputSubmit aria-label="Submit" disabled={!input.value.trim()} />
            </ToolbarItem>
          </PromptInputFooter>
        </PromptInput>
        <SubmittedMessage value={input.submitted} />
      </StoryFrame>
    );
  },
};

/** The active voice state stays entirely in the prompt toolbar. */
export const ExpandedVoicePanel: Story = {
  render: () => {
    const input = useStoryInput();
    const [isListening, setIsListening] = useState(false);

    return (
      <StoryFrame>
        <PromptInput onSubmit={input.submit}>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask anything"
              value={input.value}
              onChange={(event) => input.setValue(event.target.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <InputTools showAttachment={!isListening}>
              <VoiceButton
                isListening={isListening}
                onClick={() => setIsListening((current) => !current)}
                personaSize="size-6"
              />
            </InputTools>
            <ToolbarItem visible={!isListening}>
              <PromptInputSubmit aria-label="Submit" disabled={!input.value.trim()} />
            </ToolbarItem>
          </PromptInputFooter>
        </PromptInput>
        <SubmittedMessage value={input.submitted} />
      </StoryFrame>
    );
  },
};

/** Persona stays present as a quiet companion and wakes up when voice input starts. */
export const WakeUpFromInput: Story = {
  render: () => {
    const input = useStoryInput();
    const [isListening, setIsListening] = useState(false);

    return (
      <StoryFrame>
        <PromptInput onSubmit={input.submit}>
          <PromptInputBody>
            <div className="flex items-end gap-1">
              <div
                className={`mb-2 shrink-0 transition-transform motion-reduce:transition-none ${
                  isListening ? 'scale-125' : 'scale-90 opacity-60'
                }`}
              >
                <Persona className="size-6" state={isListening ? 'listening' : 'idle'} />
              </div>
              <PromptInputTextarea
                placeholder="Ask anything"
                value={input.value}
                onChange={(event) => input.setValue(event.target.value)}
              />
            </div>
          </PromptInputBody>
          <PromptInputFooter>
            <InputTools showAttachment={!isListening}>
              <VoiceButton
                isListening={isListening}
                onClick={() => setIsListening((current) => !current)}
              />
            </InputTools>
            <ToolbarItem visible={!isListening}>
              <PromptInputSubmit aria-label="Submit" disabled={!input.value.trim()} />
            </ToolbarItem>
          </PromptInputFooter>
        </PromptInput>
        <SubmittedMessage value={input.submitted} />
      </StoryFrame>
    );
  },
};

function StoryAttachmentButton() {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputButton asChild tooltip="Attach file">
      <label className="cursor-pointer">
        <Paperclip size={16} />
        <input
          hidden
          multiple
          type="file"
          onChange={(event) => {
            if (event.currentTarget.files) {
              attachments.add(event.currentTarget.files);
            }
            event.currentTarget.value = '';
          }}
        />
      </label>
    </PromptInputButton>
  );
}

function StoryAttachmentList() {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-wrap gap-1.5">
      {attachments.files.map((file) => (
        <button
          key={file.id}
          className="rounded-full bg-emphasis-faint px-2.5 py-1 text-xs text-text-secondary"
          onClick={() => attachments.remove(file.id)}
          type="button"
        >
          {file.filename}
        </button>
      ))}
    </div>
  );
}

/** A click-through harness for attachment, request, retry, and cancellation states. */
export const InteractiveHarness: Story = {
  render: () => {
    const [requestState, setRequestState] = useState<'ready' | 'submitted' | 'streaming' | 'error'>(
      'ready',
    );
    const [failNextRequest, setFailNextRequest] = useState(false);
    const attachmentsRef = useRef<ReturnType<typeof usePromptInputAttachments> | null>(null);

    function HarnessContents() {
      const controller = usePromptInputController();
      const attachments = usePromptInputAttachments();
      attachmentsRef.current = attachments;

      useEffect(() => {
        const sample = new File(['Sample attachment'], 'sample-note.txt', { type: 'text/plain' });
        attachments.add([sample]);
      }, [attachments.add]);

      async function handleSubmit({ text, files }: { text: string; files: unknown[] }) {
        setRequestState('submitted');
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        if (failNextRequest) {
          setFailNextRequest(false);
          setRequestState('error');
          throw new Error('Storybook request failed');
        }
        setRequestState('streaming');
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        setRequestState('ready');
        controller.textInput.setInput(
          `Sent ${files.length} attachment${files.length === 1 ? '' : 's'}: ${text}`,
        );
      }

      return (
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputHeader>
            <StoryAttachmentList />
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <StoryAttachmentButton />
              <span className="text-xs text-muted-foreground">
                {attachments.files.length} attached
              </span>
            </PromptInputTools>
            <PromptInputSubmit
              aria-label={requestState === 'error' ? 'Retry' : 'Submit'}
              disabled={!controller.textInput.value.trim() || requestState === 'submitted'}
              onStop={() => setRequestState('ready')}
              status={requestState}
            />
          </PromptInputFooter>
        </PromptInput>
      );
    }

    return (
      <StoryFrame>
        <PromptInputProvider initialInput="Try attaching a file, then send this message.">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const sample = new File(['Sample attachment'], 'sample-note.txt', {
                  type: 'text/plain',
                });
                attachmentsRef.current?.add([sample]);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Add sample file
            </Button>
            <Button
              onClick={() => attachmentsRef.current?.clear()}
              size="sm"
              type="button"
              variant="outline"
            >
              Clear files
            </Button>
            <Button
              aria-pressed={failNextRequest}
              onClick={() => setFailNextRequest((current) => !current)}
              size="sm"
              type="button"
              variant={failNextRequest ? 'destructive' : 'outline'}
            >
              {failNextRequest ? 'Next request will fail' : 'Fail next request'}
            </Button>
          </div>
          <HarnessContents />
        </PromptInputProvider>
        <p className="mt-3 text-xs text-muted-foreground">
          Status: {requestState}. Submit to exercise loading, streaming, success, retry, and stop.
        </p>
      </StoryFrame>
    );
  },
};
