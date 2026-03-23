type ChatInputProps = {
  message: string
  onMessageChange: (message: string) => void
  onSendMessage: (message: string) => void
  onTransformNote?: () => void
  canTransformNote?: boolean
  isPending?: boolean
  suggestions?: string[]
}

export const ChatInput = (_props: ChatInputProps) => null
