import { CheckCircleIcon } from 'lucide-react'

import { useToast } from 'src/lib/toast/hooks'
import type { ToastMessage } from 'src/lib/toast/types'

const Toast = () => {
  const { messages } = useToast()

  const ToastItem = ({ message }: { message: ToastMessage }) => {
    return (
      <div className={`alert alert-${message.type}`}>
        {message.type === 'success' && <CheckCircleIcon size={16} className="w-4 h-4 mr-2" />}
        <span>{message.text}</span>
      </div>
    )
  }

  return (
    <div className="toast toast-center z-50 bottom-20">
      {messages.map((message) => (
        <ToastItem key={message.text} message={message} />
      ))}
    </div>
  )
}

export default Toast
