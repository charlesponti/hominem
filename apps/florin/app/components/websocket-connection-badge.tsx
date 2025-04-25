import { motion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Badge } from './ui/badge'

export function WebSocketConnectionBadge({ isConnected }: { isConnected: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50"
    >
      <Badge
        variant="outline"
        className={cn(
          'flex items-center gap-2 shadow-sm transition-colors duration-200',
          isConnected ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
        )}
      >
        {isConnected ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
            >
              <Wifi size={14} className="text-green-600" aria-hidden="true" />
            </motion.div>
            <span className="text-green-600 font-medium">Connected</span>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
            >
              <WifiOff size={14} className="text-red-600" aria-hidden="true" />
            </motion.div>
            <span className="text-red-600 font-medium">Disconnected</span>
          </>
        )}
      </Badge>
    </motion.div>
  )
}
