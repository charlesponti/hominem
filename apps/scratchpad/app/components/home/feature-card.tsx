import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  color: 'primary' | 'secondary' | 'accent'
  delay?: number
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  color,
  delay = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      className={`backdrop-blur-lg bg-base-100/40 border border-white/10 rounded-2xl shadow-xl overflow-hidden hover:shadow-${color}/20 hover:-translate-y-1 transition-all duration-500`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="px-8 pt-8 pb-4">
        <motion.div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${color} to-${color}-foreground flex items-center justify-center text-${color}-content mb-6`}
          whileHover={{ rotate: 5, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Icon size={32} />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="opacity-70 mb-6">{description}</p>
        <div className="card-actions justify-start">
          <button type="button" className={`btn btn-sm btn-${color} rounded-full px-6 group`}>
            Learn More
            <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
          </button>
        </div>
      </div>
      <div className={`h-2 w-full bg-gradient-to-r from-${color}/80 to-transparent`} />
    </motion.div>
  )
}
