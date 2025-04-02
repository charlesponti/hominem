import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from './theme-provider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <motion.button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="btn btn-circle btn-ghost"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <motion.div
          initial={{ rotate: -45 }}
          animate={{ rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 10,
          }}
        >
          <Sun className="h-5 w-5 text-amber-500" />
        </motion.div>
      ) : (
        <motion.div
          initial={{ rotate: 45 }}
          animate={{ rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 10,
          }}
        >
          <Moon className="h-5 w-5 text-indigo-300" />
        </motion.div>
      )}
    </motion.button>
  )
}
