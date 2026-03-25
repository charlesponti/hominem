import { Button } from '@hominem/ui/button';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker';
import graphql from 'react-syntax-highlighter/dist/esm/languages/prism/graphql';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import html from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';

import { cn } from '../../lib/utils';

// Register commonly used languages for AI chat content
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('jsx', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('zsh', bash);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('html', html);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);
SyntaxHighlighter.registerLanguage('docker', docker);
SyntaxHighlighter.registerLanguage('dockerfile', docker);
SyntaxHighlighter.registerLanguage('graphql', graphql);
SyntaxHighlighter.registerLanguage('gql', graphql);

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
                <div className="relative group my-4">
                  <div className="flex items-center justify-between bg-bg-surface px-3 py-1.5 border-b border-border-subtle">
                    <span className="text-xs font-mono text-text-tertiary">{language}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopyCode(codeString, blockId)}
                      aria-label={`Copy ${language} code block`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3 mr-1" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3 mr-1" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{ margin: 0, fontSize: '0.875rem' }}
                    PreTag="div"
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
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
