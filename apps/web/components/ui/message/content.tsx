import type { ChatMessage } from '@ponti/utils/schema'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface MessageContentProps {
  content: ChatMessage['content']
}

export function MessageContent({ content }: MessageContentProps) {
  return (
    <div
      className="prose dark:prose-invert max-w-none prose-pre:my-0 prose-p:leading-relaxed prose-pre:bg-muted/50"
      data-testid="message-content"
    >
      <ReactMarkdown
        components={
          {
            code: ({ className, children, node, ...props }) => {
              const match = /language-(\w+)/.exec(className || '')
              const language = match ? match[1] : ''
              const isInline = !match

              return !isInline ? (
                <SyntaxHighlighter
                  // @ts-ignore - type error in react-syntax-highlighter
                  style={oneDark}
                  language={language}
                  PreTag="div"
                  className="rounded-md !my-3 !bg-muted/50"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className="bg-muted/50 rounded px-1.5 py-0.5" {...props}>
                  {children}
                </code>
              )
            },
          } as Components
        }
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
