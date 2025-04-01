import type { ChatMessage } from '@ponti/utils/schema'
import { FilePart } from './file-part'
import { Reasoning } from './reasoning'
import { ToolCall } from './tool-call'

interface MessageDetailsProps {
  toolCalls?: ChatMessage['toolCalls']
  reasoning?: ChatMessage['reasoning']
  files?: ChatMessage['files']
}

export function MessageDetails({ toolCalls, reasoning, files }: MessageDetailsProps) {
  return (
    <div className="space-y-2" data-testid="message-details">
      {toolCalls?.map((call) => (
        <ToolCall key={crypto.getRandomValues(new Uint32Array(1))[0]} call={call} />
      ))}
      {reasoning && <Reasoning reasoning={reasoning} />}
      {files?.map((part) => (
        <FilePart key={crypto.getRandomValues(new Uint32Array(1))[0]} part={part} />
      ))}
    </div>
  )
}
