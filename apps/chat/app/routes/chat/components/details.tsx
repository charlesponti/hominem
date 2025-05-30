import type { ChatMessageSelect } from '@hominem/utils/types'
import { memo, useMemo } from 'react'
import { FilePart } from './file-part.js'
import { Reasoning } from './reasoning.js'
// Removed unused import: import { ToolCall } from './tool-call.js'
import { ToolCall as ToolCallComponent } from './tool-call.js' // Renamed import

interface MessageDetailsProps {
  toolCalls?: ChatMessageSelect['toolCalls']
  reasoning?: ChatMessageSelect['reasoning']
  files?: ChatMessageSelect['files']
}

export const MessageDetails = memo<MessageDetailsProps>(function MessageDetails({
  toolCalls,
  reasoning,
  files,
}) {
  // Memoize the processed tool calls to avoid recalculation on every render
  const processedToolCalls = useMemo(() => {
    if (!toolCalls) return []

    // Create a Map to store the latest tool call/result for each toolName
    const toolCallMap = new Map()

    // Process tool calls to prefer tool-results over tool-calls
    for (const call of toolCalls) {
      if (call.type === 'tool-call' && !toolCallMap.get(call.toolCallId)) {
        toolCallMap.set(call.toolCallId, call)
      }
      if (call.type === 'tool-result') {
        toolCallMap.set(call.toolCallId, call)
      }
    }

    return Array.from(toolCallMap.values())
  }, [toolCalls])

  // Generate stable keys for files to prevent unnecessary re-renders
  const filesWithKeys = useMemo(() => {
    return (
      files?.map((part, index) => ({
        ...part,
        key: `${part.filename || 'file'}-${index}`,
      })) || []
    )
  }, [files])

  return (
    <div className="space-y-2" data-testid="message-details">
      {processedToolCalls.map((call) => (
        <ToolCallComponent key={call.toolCallId} call={call} />
      ))}
      {reasoning && <Reasoning reasoning={reasoning} />}
      {filesWithKeys.map((part) => (
        <FilePart key={part.key} part={part} />
      ))}
    </div>
  )
})
