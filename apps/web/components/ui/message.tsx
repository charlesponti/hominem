import type { FilePart, ImagePart, TextPart, ToolCallPart, ToolResultPart } from 'ai'
import React from 'react'
import { Card } from './card'

// Define types that aren't exported from 'ai'
interface ReasoningPart {
  type: 'reasoning'
  text: string
  signature?: string
  providerOptions?: Record<string, unknown>
}

interface RedactedReasoningPart {
  type: 'redacted-reasoning'
  data: string
  providerOptions?: Record<string, unknown>
}

// Type definitions for content
type MessageContent =
  | string
  | Array<TextPart | ImagePart | FilePart>
  | Array<TextPart | ReasoningPart | RedactedReasoningPart | ToolCallPart>
  | Array<ToolResultPart>

interface MessageProps {
  content: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  id?: string
}

// Type guards to determine content type
function isTextPart(part: unknown): part is TextPart {
  return typeof part === 'object' && part !== null && (part as TextPart).type === 'text'
}

function isImagePart(part: unknown): part is ImagePart {
  return typeof part === 'object' && part !== null && (part as ImagePart).type === 'image'
}

function isFilePart(part: unknown): part is FilePart {
  return typeof part === 'object' && part !== null && (part as FilePart).type === 'file'
}

function isReasoningPart(part: unknown): part is ReasoningPart {
  return typeof part === 'object' && part !== null && (part as ReasoningPart).type === 'reasoning'
}

function isRedactedReasoningPart(part: unknown): part is RedactedReasoningPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    (part as RedactedReasoningPart).type === 'redacted-reasoning'
  )
}

function isToolCallPart(part: unknown): part is ToolCallPart {
  return typeof part === 'object' && part !== null && (part as ToolCallPart).type === 'tool-call'
}

function isToolResultPart(part: unknown): part is ToolResultPart {
  return (
    typeof part === 'object' && part !== null && (part as ToolResultPart).type === 'tool-result'
  )
}

export function Message({ content, role, id }: MessageProps) {
  return (
    <Card key={id} className={`p-4 ${role === 'user' ? 'bg-primary/10' : 'bg-muted'}`}>
      <div className="font-semibold mb-1">
        {role === 'user'
          ? 'You'
          : role === 'assistant'
            ? 'Assistant'
            : role === 'tool'
              ? 'Tool'
              : 'System'}
      </div>

      <MessageContent content={content} />
    </Card>
  )
}

function MessageContent({ content }: { content: MessageContent }) {
  // If content is a string, render it directly
  if (typeof content === 'string') {
    return <div className="whitespace-pre-wrap">{content}</div>
  }

  // If content is an array, render each part accordingly
  if (Array.isArray(content)) {
    return (
      <>
        {content.map((part, index) => {
          // Generate a stable key
          const key = `message-part-${index}-${JSON.stringify(part).slice(0, 20)}`

          if (isTextPart(part)) {
            return (
              <div key={key} className="whitespace-pre-wrap">
                {part.text}
              </div>
            )
          }

          if (isImagePart(part)) {
            const imgSrc =
              part.image instanceof URL
                ? part.image.toString()
                : typeof part.image === 'string'
                  ? `data:${part.mimeType || 'image/jpeg'};base64,${part.image}`
                  : '#'

            return (
              <div key={key} className="my-2">
                <img src={imgSrc} alt="message content" className="max-w-full rounded-md" />
              </div>
            )
          }

          if (isFilePart(part)) {
            return (
              <div key={key} className="my-2 p-2 border rounded-md">
                <div className="font-medium">{part.filename || 'File'}</div>
                <div className="text-sm text-muted-foreground">{part.mimeType}</div>
              </div>
            )
          }

          if (isReasoningPart(part)) {
            return (
              <div key={key} className="my-2 p-2 bg-muted/50 rounded-md">
                <div className="text-sm font-medium">Reasoning:</div>
                <div className="whitespace-pre-wrap">{part.text}</div>
                {part.signature && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Signature: {part.signature.substring(0, 20)}...
                  </div>
                )}
              </div>
            )
          }

          if (isRedactedReasoningPart(part)) {
            return (
              <div key={key} className="my-2 p-2 bg-muted/50 rounded-md">
                <div className="text-sm font-medium">Redacted Reasoning</div>
                <div className="text-muted-foreground italic">Content redacted</div>
              </div>
            )
          }

          if (isToolCallPart(part)) {
            return (
              <div key={key} className="my-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                <div className="text-sm font-medium mb-1">Tool Call: {part.toolName}</div>
                <div className="text-xs font-mono bg-black/5 p-2 rounded overflow-x-auto">
                  <pre>{JSON.stringify(part.args, null, 2)}</pre>
                </div>
              </div>
            )
          }

          if (isToolResultPart(part)) {
            return (
              <div
                key={key}
                className="my-2 p-2 bg-secondary/5 rounded-md border border-secondary/20"
              >
                <div className="text-sm font-medium mb-1">
                  Tool Result: {part.toolName}
                  {part.isError && <span className="text-destructive ml-2">(Error)</span>}
                </div>
                <div className="text-xs font-mono bg-black/5 p-2 rounded overflow-x-auto">
                  <pre>{JSON.stringify(part.result, null, 2)}</pre>
                </div>
              </div>
            )
          }

          // Fallback for unknown content types
          return (
            <div key={key} className="text-muted-foreground p-2 border border-dashed rounded-md">
              Unsupported content type:{' '}
              {typeof part === 'object' && part !== null && 'type' in part
                ? String((part as { type?: string }).type || 'unknown')
                : 'unknown'}
            </div>
          )
        })}
      </>
    )
  }

  // Fallback for unknown content structure
  return <div className="text-muted-foreground">Unsupported message format</div>
}
