import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockTitle,
} from './code-block';

const sampleCode = ['function greet(name: string) {', '  return `Hello, ${name}!`;', '}'].join(
  '\n',
);

const meta = {
  title: 'Chat/Primitives/Code Block',
  component: CodeBlock,
  parameters: { layout: 'padded' },
  args: { code: sampleCode, language: 'typescript' },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHeader: Story = {
  render: (args) => (
    <CodeBlock {...args}>
      <CodeBlockHeader>
        <CodeBlockTitle>
          <CodeBlockFilename>greet.ts</CodeBlockFilename>
        </CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton />
        </CodeBlockActions>
      </CodeBlockHeader>
    </CodeBlock>
  ),
};

export const WithLineNumbers: Story = {
  render: () => <CodeBlockContent code={sampleCode} language="typescript" showLineNumbers />,
};
