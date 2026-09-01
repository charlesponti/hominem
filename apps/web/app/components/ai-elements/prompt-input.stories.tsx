import type { Meta, StoryObj } from '@storybook/react-vite';
import { Paperclip } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '~/components/ui/button';

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
  usePromptInputAttachments,
  usePromptInputController,
} from './prompt-input';

const meta = {
  title: 'Chat/Primitives/Prompt Input',
  component: PromptInput,
  parameters: { layout: 'centered' },
  args: { onSubmit: () => undefined },
} satisfies Meta<typeof PromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function StoryFrame({ children }: { children: ReactNode }) {
  return <div className="w-full min-w-125 max-w-2xl px-4">{children}</div>;
}

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
          className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
          onClick={() => attachments.remove(file.id)}
          type="button"
        >
          {file.filename}
        </button>
      ))}
    </div>
  );
}

/** Click through attachments, requests, retries, and cancellation. */
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

      useEffect(() => {
        attachmentsRef.current = attachments;
      }, [attachments]);

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
