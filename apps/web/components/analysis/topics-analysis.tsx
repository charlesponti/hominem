'use client'

import { Badge } from '@/components/ui/badge'
import { Tag } from 'lucide-react'
import { AnalysisCard } from './analysis-card'
import { getBadgeStyles } from './utils'

export const TopicsAnalysis = ({ topics }: { topics?: string[] }) => {
  if (!topics || topics.length === 0) return null

  return (
    <AnalysisCard title="Topics" icon={<Tag className="w-4 h-4 text-violet-500" />}>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Badge key={topic} className={getBadgeStyles('topics')}>
            #{topic}
          </Badge>
        ))}
      </div>
    </AnalysisCard>
  )
}
