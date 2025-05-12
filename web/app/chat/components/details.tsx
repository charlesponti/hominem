import type { ChatMessageSelect } from '@hominem/utils/types'
import { FilePart } from './file-part.js'
import { Reasoning } from './reasoning.js'
import { ToolCall } from './tool-call.js'

interface MessageDetailsProps {
  toolCalls?: ChatMessageSelect['toolCalls']
  reasoning?: ChatMessageSelect['reasoning']
  files?: ChatMessageSelect['files']
}

export function MessageDetails({ toolCalls, reasoning, files }: MessageDetailsProps) {
  // Create a Map to store the latest tool call/result for each toolName
  const toolCallMap = new Map()

  // Process tool calls to prefer tool-results over tool-calls
  for (const call of toolCalls || []) {
    if (call.type === 'tool-call' && !toolCallMap.get(call.toolCallId)) {
      toolCallMap.set(call.toolCallId, call)
    }
    if (call.type === 'tool-result') {
      toolCallMap.set(call.toolCallId, call)
    }
  }

  return (
    <div className="space-y-2" data-testid="message-details">
      {Array.from(toolCallMap.values()).map((call) => (
        <ToolCall key={call.toolCallId} call={call} />
      ))}
      {reasoning && <Reasoning reasoning={reasoning} />}
      {files?.map((part) => (
        <FilePart key={crypto.getRandomValues(new Uint32Array(1))[0]} part={part} />
      ))}
    </div>
  )
}
