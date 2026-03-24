import type { Meta, StoryObj } from '@storybook/react';

import { MarkdownContent } from './markdown-content';

const meta: Meta<typeof MarkdownContent> = {
  title: 'AI Elements/MarkdownContent',
  component: MarkdownContent,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof MarkdownContent>;

const prose = `
## Introduction

This is a **bold statement** and _italic text_ in a paragraph.

Here's a list of key points:
- First item with some detail
- Second item that matters
- Third item to round it out

### Code Example

Here's some inline \`code\` and a block below:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`
}

console.log(greet('world'))
\`\`\`

> This is a blockquote with important context.

[Visit the docs](https://example.com) for more information.
`;

export const Default: Story = {
  args: { content: prose },
};

export const Streaming: Story = {
  args: {
    content: 'The answer is being generated right now',
    isStreaming: true,
  },
};

export const InlineCode: Story = {
  args: {
    content: 'Use the `useState` hook to manage local state, and `useEffect` for side effects.',
  },
};

export const WithTable: Story = {
  args: {
    content: `
| Name     | Type   | Description          |
|----------|--------|----------------------|
| id       | string | Unique identifier    |
| title    | string | Display title        |
| createdAt| Date   | Creation timestamp   |
    `,
  },
};

export const Null: Story = {
  args: { content: null },
};
