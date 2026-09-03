import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChatResponseSettings } from './chat-response-settings';

const meta = {
  title: 'Chat/Response Settings',
  component: ChatResponseSettings,
  parameters: { layout: 'centered' },
  args: {
    onChange: () => undefined,
    onChangeWalkieTalkieMode: () => undefined,
    onClose: () => undefined,
    value: 'medium',
    walkieTalkieMode: false,
  },
} satisfies Meta<typeof ChatResponseSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};
export const Short: Story = { args: { value: 'short' } };
export const Long: Story = { args: { value: 'long' } };
