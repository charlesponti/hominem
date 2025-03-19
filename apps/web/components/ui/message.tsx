import type { ChatMessage } from '@ponti/utils/schema'
import React from 'react'
import { Card } from './card'

interface MessageProps {
  message: ChatMessage
}
export function Message({ message }: MessageProps) {
  const { content, role, id } = message
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

      <div className="whitespace-pre-wrap">{content}</div>
      <MessageContent
        toolCalls={message.toolCalls}
        reasoning={message.reasoning}
        files={message.files}
      />
    </Card>
  )
}

type MessageContent = {
  toolCalls?: ChatMessage['toolCalls']
  reasoning?: ChatMessage['reasoning']
  files?: ChatMessage['files']
}

function MessageContent({ toolCalls, reasoning, files }: MessageContent) {
  return (
    <>
      {toolCalls?.map((call, index) => {
        const key = `tool-call-${index}`
        return (
          <div key={key} className="my-2 p-2 bg-primary/5 rounded-md border border-primary/20">
            <div className="text-sm font-medium mb-1">Tool Call: {call.toolName}</div>
            <div className="text-xs font-mono bg-black/5 p-2 rounded overflow-x-auto">
              <pre>{JSON.stringify(call.args, null, 2)}</pre>
            </div>
            <div className="text-sm font-medium mb-1">
              {call.isError && <span className="text-destructive ml-2">(Error)</span>}
            </div>
            <div className="text-xs font-mono bg-black/5 p-2 rounded overflow-x-auto">
              <pre>{JSON.stringify(call.result, null, 2)}</pre>
            </div>
          </div>
        )
      })}
      {reasoning ? (
        <div className="my-2 p-2 bg-muted/50 rounded-md">
          <div className="text-sm font-medium">Reasoning:</div>
          <div className="whitespace-pre-wrap">{reasoning}</div>
        </div>
      ) : null}
      {files?.map((part, index) => {
        // Generate a stable key
        const key = `message-part-${index}-${JSON.stringify(part).slice(0, 20)}`

        switch (part.type) {
          case 'image': {
            return (
              <div key={key} className="my-2">
                <img src={part.filename} alt="message content" className="max-w-full rounded-md" />
              </div>
            )
          }
          case 'file':
            return (
              <div key={key} className="my-2 p-2 border rounded-md">
                <div className="font-medium">{part.filename || 'File'}</div>
                <div className="text-sm text-muted-foreground">{part.mimeType}</div>
              </div>
            )
          default:
            return (
              <div key={key} className="my-2 p-2 bg-muted/50 rounded-md">
                <div className="text-sm font-medium">Unknown Part Type</div>
                <div className="whitespace-pre-wrap">{JSON.stringify(part, null, 2)}</div>
              </div>
            )
        }
      })}
    </>
  )
}
