import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function ProgressBar({
  className,
  progress = 0,
}: { className?: string; progress?: number }) {
  return (
    <div className={cn('w-full h-[2px] bg-transparent overflow-hidden', className)}>
      <motion.div
        className={cn('h-full bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200')}
        initial={{ width: 0, opacity: 0.8 }}
        animate={{
          width: `${Math.min(100, Math.max(0, progress))}%`,
          opacity: progress === 100 ? 0 : 0.8,
        }}
        transition={{
          width: { duration: 0.5, ease: 'easeInOut' },
          opacity: { duration: 0.3, delay: progress === 100 ? 0.2 : 0 },
        }}
        style={{
          boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
        }}
      />
    </div>
  )
}
