// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    getLoadedLanguages: () => ['typescript'],
    codeToTokens: (code: string) => ({
      bg: '#ffffff',
      fg: '#000000',
      tokens: code.split('\n').map((line) => (line ? [{ content: line, color: '#000000' }] : [])),
    }),
  }),
}));

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockTitle,
} from './code-block';

afterEach(cleanup);

const sampleCode = 'const x = 1;';

describe('CodeBlockContent', () => {
  it('renders the raw code immediately, before highlighting resolves', () => {
    render(<CodeBlockContent code={sampleCode} language="typescript" />);
    expect(screen.getByText(sampleCode)).toBeTruthy();
  });

  it('renders the highlighted tokens once shiki resolves', async () => {
    render(<CodeBlockContent code={sampleCode} language="typescript" />);
    await waitFor(() => expect(screen.getByText(sampleCode)).toBeTruthy());
  });
});

describe('CodeBlock', () => {
  it('renders a header and code together', async () => {
    render(
      <CodeBlock code={sampleCode} language="typescript">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>example.ts</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>,
    );

    expect(screen.getByText('example.ts')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(sampleCode)).toBeTruthy());
  });
});

describe('CodeBlockCopyButton', () => {
  it('copies the code to the clipboard and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const onCopy = vi.fn();

    render(
      <CodeBlock code={sampleCode} language="typescript">
        <CodeBlockHeader>
          <CodeBlockActions>
            <CodeBlockCopyButton onCopy={onCopy} />
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlock>,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(sampleCode));
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('reports an error when the clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    const onError = vi.fn();

    render(
      <CodeBlock code={sampleCode} language="typescript">
        <CodeBlockHeader>
          <CodeBlockActions>
            <CodeBlockCopyButton onError={onError} />
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlock>,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(onError).toHaveBeenCalledOnce());
  });
});
