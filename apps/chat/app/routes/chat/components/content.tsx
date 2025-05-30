import type { ChatMessageSelect } from '@hominem/utils/types'
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface MessageContentProps {
  content: ChatMessageSelect['content']
}

export const MessageContent = memo<MessageContentProps>(function MessageContent({ content }) {
  if (typeof content !== 'string') {
    console.warn('Message content is not a string:', content)
    return null
  }
  return (
    <div
      className="prose dark:prose-invert max-w-none prose-pre:my-0 prose-p:leading-relaxed prose-pre:bg-muted/50 overflow-hidden"
      data-testid="message-content"
    >
      <ReactMarkdown
        components={{
          code: ({ className, children, node, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const isInline = !match

            return !isInline ? (
              <div className="relative overflow-hidden">
                <SyntaxHighlighter
                  // @ts-ignore - type error in react-syntax-highlighter
                  style={oneDark}
                  language={language}
                  PreTag="div"
                  className="rounded-md !my-3 !bg-muted/50 max-w-full overflow-x-auto"
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-muted/50 rounded px-1.5 py-0.5 break-words" {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children, ...props }) => (
            <pre className="not-prose relative overflow-hidden rounded-md" {...props}>
              {children}
            </pre>
          ),
          p: ({ children }) => <p className="whitespace-pre-wrap break-words">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
