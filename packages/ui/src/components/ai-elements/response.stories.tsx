import type { Meta, StoryObj } from '@storybook/react';
import { Response } from './response';

const meta: Meta<typeof Response> = {
  title: 'AI Elements/Response',
  component: Response,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Response>;

export const Default: Story = {
  args: {
    children: 'Here is a simple response from the AI assistant.',
  },
};

export const WithMarkdown: Story = {
  args: {
    children: `# Getting Started

Here's how to install the package:

\`\`\`bash
npm install @hominem/ui
\`\`\`

Then import components:

\`\`\`tsx
import { Button } from '@hominem/ui';
\`\`\`

Key features:
- TypeScript support
- Tailwind CSS styling
- Radix UI primitives`,
  },
};

export const Streaming: Story = {
  args: {
    children: 'The AI is currently generating a response',
    isStreaming: true,
  },
};

export const StreamingEmpty: Story = {
  args: {
    isStreaming: true,
  },
};
