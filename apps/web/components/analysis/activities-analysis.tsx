'use client'

import { Badge } from '@/components/ui/badge'
import type { TextAnalysis } from '@ponti/utils/schemas'
import { BarChart } from 'lucide-react'
import { AnalysisCard } from './analysis-card'
import { getBadgeStyles } from './utils'

export const ActivitiesAnalysis = ({ activities }: { activities?: TextAnalysis['activities'] }) => {
  if (!activities || activities.length === 0) return null

  return (
    <AnalysisCard title="Activities" icon={<BarChart className="w-4 h-4 text-indigo-500" />}>
      <div className="flex flex-wrap gap-2">
        {activities.map((activity) => (
          <Badge
            key={crypto.getRandomValues(new Uint32Array(1))[0]}
            className={getBadgeStyles('activities')}
          >
            {activity.description}
          </Badge>
        ))}
      </div>
    </AnalysisCard>
  )
}
