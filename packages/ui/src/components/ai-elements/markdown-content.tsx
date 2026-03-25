import { lazy, Suspense, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { cn } from '../../lib/utils';

// Lazy load the syntax highlighter component to avoid bundling on initial load
const LazyCodeBlock = lazy(() => import('./code-block'));

// Simple fallback while code block is loading
function CodeBlockFallback({ language }: { language: string }) {
  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-bg-surface px-3 py-1.5 border-b border-border-subtle">
        <span className="text-xs font-mono text-text-tertiary">{language}</span>
      </div>
      <div className="bg-bg-surface p-4 animate-pulse">
        <div className="h-4 bg-border-subtle rounded w-3/4 mb-2" />
        <div className="h-4 bg-border-subtle rounded w-1/2" />
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
    <div
      className={cn(
        'prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-foreground',
        className,
      )}
    >
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
              <code className="bg-bg-surface px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            );
          },
          h1: ({ children }) => <h1 className="heading-3 mt-6 mb-4 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="heading-4 mt-5 mb-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="heading-4 mt-4 mb-2 first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-1 ml-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-1 ml-4">{children}</ol>
          ),
          li: ({ children }) => <li className="ml-2">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-border-subtle pl-4 italic my-4">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-border">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-bg-surface">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-border px-4 py-2 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-4 py-2">{children}</td>,
          hr: () => <hr className="my-6 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="inline-block w-2 h-4 bg-foreground ml-1 align-middle" />}
    </div>
  );
}
