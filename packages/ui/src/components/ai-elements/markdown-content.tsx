import { lazy, Suspense, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { cn } from '../../lib/utils';

// Lazy load the syntax highlighter component to avoid bundling on initial load
const LazyCodeBlock = lazy(() => import('./code-block'));

// Simple fallback while code block is loading
function CodeBlockFallback({ language }: { language: string }) {
  return (
    <div className="relative group my-4 overflow-hidden rounded-xl border border-[var(--color-border-subtle)]">
      <div className="flex items-center justify-between bg-[var(--color-bg-inset)] px-4 py-2 border-b border-[var(--color-border-subtle)]">
        <span className="text-[11px] font-mono text-[var(--color-text-tertiary)]">{language}</span>
      </div>
      <div className="bg-[var(--color-bg-inset)] p-4 animate-pulse">
        <div className="h-3.5 bg-[var(--color-emphasis-faint)] rounded-full w-3/4 mb-2" />
        <div className="h-3.5 bg-[var(--color-emphasis-faint)] rounded-full w-1/2" />
      </div>
    </div>
  );
}

interface MarkdownContentProps {
  content: string | null;
  isStreaming?: boolean;
  className?: string;
}

export function MarkdownContent({ content, isStreaming = false, className }: MarkdownContentProps) {
  const [copiedCodeBlocks, setCopiedCodeBlocks] = useState<Set<string>>(new Set());

  if (content === null) return null;

  const handleCopyCode = async (code: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeBlocks((prev) => new Set(prev).add(blockId));
      setTimeout(() => {
        setCopiedCodeBlocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(blockId);
          return newSet;
        });
      }, 2000);
    } catch {
      // Copy failure is silently ignored - UI shows no feedback for failure
    }
  };

  return (
    <div className={cn('max-w-none', className)}>
      <ReactMarkdown
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const blockId = `code-${codeString.slice(0, 20)}-${language}`;

            if (language) {
              const isCopied = copiedCodeBlocks.has(blockId);
              return (
                <Suspense fallback={<CodeBlockFallback language={language} />}>
                  <LazyCodeBlock
                    language={language}
                    code={codeString}
                    isCopied={isCopied}
                    onCopy={() => handleCopyCode(codeString, blockId)}
                  />
                </Suspense>
              );
            }

            return (
              <code className="rounded-md bg-[var(--color-bg-inset)] px-1.5 py-0.5 text-[13px] font-mono text-[var(--color-accent)]">
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="mt-7 mb-3 text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 mb-2.5 text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)] first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 mb-2 text-[15px] font-semibold text-[var(--color-text-primary)] first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3.5 last:mb-0 text-[15px] leading-[1.7] text-inherit">{children}</p>
          ),
          ul: ({ children }) => <ul className="list-none mb-3.5 space-y-1 ml-0">{children}</ul>,
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3.5 space-y-1 ml-1 marker:text-[var(--color-text-tertiary)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="relative pl-4 text-[15px] leading-[1.7] before:absolute before:left-0 before:top-[0.65em] before:size-1 before:rounded-full before:bg-[var(--color-text-tertiary)]/40 before:content-['']">
              {children}
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 transition-colors hover:decoration-[var(--color-accent)]"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--color-accent)]/30 pl-4 my-4 text-[var(--color-text-secondary)] italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-[var(--color-border-subtle)]">
              <table className="min-w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[var(--color-bg-inset)]">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-[var(--color-border-subtle)] last:border-b-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="px-3.5 py-2.5 text-[14px]">{children}</td>,
          hr: () => <hr className="my-6 border-[var(--color-border-subtle)]" />,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-[1.1em] bg-[var(--color-accent)] ml-0.5 align-middle animate-pulse rounded-full" />
      )}
    </div>
  );
}
