import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ChatComposer } from './chat-composer';

const meta = {
  title: 'Chat/Chat Composer',
  component: ChatComposer,
  args: { draft: '', onChangeDraft: () => undefined, onSubmit: () => undefined },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChatComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

function Harness({
  simulateError = false,
  ...props
}: Partial<React.ComponentProps<typeof ChatComposer>> & {
  simulateError?: boolean;
}) {
  const [draft, setDraft] = useState(props.draft ?? '');
  const [error, setError] = useState(props.error ?? null);

  return (
    <div className="min-h-40 bg-background pt-4">
      <ChatComposer
        {...props}
        draft={draft}
        error={error}
        onChangeDraft={setDraft}
        onSubmit={() => {
          if (simulateError) setError('Unable to send the message.');
          props.onSubmit?.();
        }}
      />
    </div>
  );
}

export const Empty: Story = { render: () => <Harness /> };

export const Composing: Story = { render: () => <Harness draft="Plan the next release" /> };

export const WithAttachment: Story = {
  render: () => (
    <Harness
      attachments={[{ id: 'file-1', originalName: 'release-notes.pdf' }]}
      draft="Summarize this"
      onRemoveAttachment={() => undefined}
    />
  ),
};

export const Submitting: Story = {
  render: () => <Harness draft="Send this" isSubmitting />,
};

export const Error: Story = {
  render: () => <Harness draft="Try again" simulateError />,
};
