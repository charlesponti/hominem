import { cn } from '@/lib/utils'

export function FileUploadStatusBadge({ status }: { status?: string }) {
  if (!status) return null

  const getStatusConfig = (status: string): { bg: string; text: string; label: string } => {
    const configs = {
      uploading: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Uploading' },
      processing: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Processing' },
      queued: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Queued' },
      done: { bg: 'bg-green-50', text: 'text-green-700', label: 'Complete' },
      error: { bg: 'bg-red-50', text: 'text-red-700', label: 'Error' },
    } as const

    return (
      configs[status as keyof typeof configs] || {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        label: status,
      }
    )
  }

  const config = getStatusConfig(status)

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', config.bg, config.text)}>
      {config.label}
    </span>
  )
}
