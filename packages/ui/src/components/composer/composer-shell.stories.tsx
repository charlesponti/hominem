import type { Meta, StoryObj } from '@storybook/react-vite';

import { ComposerShell } from './composer-shell';

const baseArgs = {
  children: null,
};

const meta = {
  title: 'Patterns/Composer/ComposerShell',
  component: ComposerShell,
  tags: ['autodocs'],
  args: baseArgs,
  parameters: {
    docs: {
      description: {
        component:
          'Fixed-position container for the message composer. Positions at the bottom of the viewport with safe area awareness for mobile devices. Provides a frosted glass appearance with backdrop blur and shadow elevation.',
      },
    },
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ComposerShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: baseArgs,
  render: () => (
    <div className="min-h-screen bg-bg-base pb-32 pt-8">
      <div className="page-width-lg mx-auto px-4">
        <h1 className="text-xl font-semibold mb-4">Message Composer Demo</h1>
        <p className="text-text-secondary mb-8">
          Scroll down to see the composer shell fixed at the bottom of the viewport.
        </p>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="p-4 bg-bg-surface rounded-lg">
              <p className="font-medium mb-2">Message {item}</p>
              <p className="text-text-tertiary text-sm">
                This is a sample message to demonstrate the composer shell positioning.
              </p>
            </div>
          ))}
        </div>
      </div>

      <ComposerShell>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none text-sm placeholder-text-tertiary"
            readOnly
          />
          <button className="px-3 py-1 rounded-md bg-accent text-accent-foreground text-sm hover:bg-accent/90">
            Send
          </button>
        </div>
      </ComposerShell>
    </div>
  ),
};

export const WithMultilineInput: Story = {
  args: baseArgs,
  render: () => (
    <div className="min-h-screen bg-bg-base pb-40 pt-8">
      <div className="page-width-lg mx-auto px-4">
        <h1 className="text-xl font-semibold mb-4">Multiline Message</h1>
        <p className="text-text-secondary">
          The composer can expand to show longer messages while staying fixed at the bottom.
        </p>
      </div>

      <ComposerShell>
        <textarea
          placeholder="Type a message... You can write multiple lines."
          className="w-full bg-transparent outline-none text-sm placeholder-text-tertiary resize-none max-h-32"
          rows={4}
          readOnly
          defaultValue="This is a longer message that spans multiple lines. The composer shell maintains its position at the bottom while the textarea expands."
        />
      </ComposerShell>
    </div>
  ),
};

export const WithToolbar: Story = {
  args: baseArgs,
  render: () => (
    <div className="min-h-screen bg-bg-base pb-40 pt-8">
      <div className="page-width-lg mx-auto px-4">
        <h1 className="text-xl font-semibold mb-4">With Action Buttons</h1>
        <p className="text-text-secondary">
          The composer can include additional action buttons for attachments, voice, etc.
        </p>
      </div>

      <ComposerShell>
        <div className="flex gap-2 mb-1">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none text-sm placeholder-text-tertiary"
            readOnly
          />
          <button
            className="p-2 rounded-md hover:bg-bg-surface text-text-tertiary"
            title="Attach file"
          >
            📎
          </button>
          <button
            className="p-2 rounded-md hover:bg-bg-surface text-text-tertiary"
            title="Voice message"
          >
            🎤
          </button>
          <button className="px-3 py-1 rounded-md bg-accent text-accent-foreground text-sm hover:bg-accent/90">
            Send
          </button>
        </div>
        <div className="flex gap-1 flex-wrap text-xs text-text-tertiary">
          <span>💡 Tip: Use Cmd+Enter to send</span>
        </div>
      </ComposerShell>
    </div>
  ),
};

export const MobileView: Story = {
  args: baseArgs,
  render: () => (
    <div className="min-h-screen bg-bg-base pb-40 pt-4">
      <div className="px-2">
        <h1 className="text-lg font-semibold mb-3">Mobile View</h1>
        <p className="text-sm text-text-secondary mb-4">
          On mobile, the composer respects safe area insets for notches and home indicators.
        </p>
        <div className="space-y-2">
          {[1, 2].map((item) => (
            <div key={item} className="p-3 bg-bg-surface rounded-lg text-sm">
              <p className="font-medium mb-1">Message {item}</p>
              <p className="text-text-tertiary text-xs">Sample message content</p>
            </div>
          ))}
        </div>
      </div>

      <ComposerShell>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Message..."
            className="flex-1 bg-transparent outline-none text-sm placeholder-text-tertiary"
            readOnly
          />
          <button className="px-3 py-1 rounded-md bg-accent text-accent-foreground text-sm hover:bg-accent/90">
            Send
          </button>
        </div>
      </ComposerShell>
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'iphone12',
    },
  },
};

export const WithLoadingState: Story = {
  args: baseArgs,
  render: () => (
    <div className="min-h-screen bg-bg-base pb-32 pt-8">
      <div className="page-width-lg mx-auto px-4">
        <h1 className="text-xl font-semibold mb-4">Sending Message</h1>
        <p className="text-text-secondary">The composer can show a loading state while sending.</p>
      </div>

      <ComposerShell>
        <div className="flex gap-2 opacity-60">
          <input
            type="text"
            value="Sending message..."
            className="flex-1 bg-transparent outline-none text-sm placeholder-text-tertiary"
            readOnly
            disabled
          />
          <button className="px-3 py-1 rounded-md bg-accent text-accent-foreground text-sm opacity-50 cursor-not-allowed">
            Sending...
          </button>
        </div>
      </ComposerShell>
    </div>
  ),
};

export const Compact: Story = {
  args: baseArgs,
  render: () => (
    <div className="min-h-screen bg-bg-base pb-32 pt-8">
      <div className="page-width-lg mx-auto px-4">
        <h1 className="text-xl font-semibold mb-4">Compact Composer</h1>
        <p className="text-text-secondary">Minimal composer for quick message input.</p>
      </div>

      <ComposerShell>
        <input
          type="text"
          placeholder="Quick message..."
          className="w-full bg-transparent outline-none text-sm placeholder-text-tertiary"
          readOnly
        />
      </ComposerShell>
    </div>
  ),
};
