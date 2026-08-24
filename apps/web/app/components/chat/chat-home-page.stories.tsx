import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ChatHomePage } from './chat-home-page';

const meta = {
  title: 'Chat/Chat Home Page',
  component: ChatHomePage,
  args: {
    draft: '',
    isSubmitting: false,
    onChangeDraft: () => undefined,
    onSubmit: () => undefined,
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChatHomePage>;

export default meta;
type Story = StoryObj<typeof meta>;

function Harness(props: Partial<React.ComponentProps<typeof ChatHomePage>>) {
  const [draft, setDraft] = useState(props.draft ?? '');
  return (
    <div className="h-screen bg-background">
      <ChatHomePage
        {...props}
        draft={draft}
        isSubmitting={props.isSubmitting ?? false}
        onChangeDraft={setDraft}
        onSubmit={() => undefined}
      />
    </div>
  );
}

export const Empty: Story = { render: () => <Harness /> };

export const Composing: Story = { render: () => <Harness draft="Help me plan my week" /> };

export const Starting: Story = { render: () => <Harness draft="Start this chat" isSubmitting /> };

export const Error: Story = {
  render: () => <Harness draft="Keep this draft" error="Could not start chat. Try again." />,
};
