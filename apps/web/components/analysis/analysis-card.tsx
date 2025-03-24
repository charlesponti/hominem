'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

// Analysis Card component to provide consistent styling
interface AnalysisCardProps {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
}

export const AnalysisCard = ({ title, icon, children, className = '' }: AnalysisCardProps) => (
  <motion.div
    className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 ${className}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center gap-2 text-sm font-medium mb-3 uppercase tracking-wider">
      {icon}
      <span className="text-violet-600">{title}</span>
    </div>
    <div className="text-gray-800">{children}</div>
  </motion.div>
)
