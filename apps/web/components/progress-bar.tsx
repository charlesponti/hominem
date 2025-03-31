import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function ProgressBar({
  className,
  progress = 0,
}: { className?: string; progress?: number }) {
  return (
    <div className={cn('w-full h-1.5 mt-1 bg-gray-200 rounded-full overflow-hidden', className)}>
      <motion.div
        className={cn('h-full', {
          'bg-blue-500': progress > 0,
          'bg-green-500': progress === 100,
        })}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  )
}
