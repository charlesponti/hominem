'use client'

import { Badge } from '@/components/ui/badge'
import type { TextAnalysis } from '@hominem/utils/schemas'
import { Users } from 'lucide-react'
import { AnalysisCard } from './analysis-card'
import { getBadgeStyles } from './utils'

export const PeopleAnalysis = ({ people }: { people: TextAnalysis['people'] }) => {
  if (!people || people.length === 0) return null

  return (
    <AnalysisCard title="People" icon={<Users className="w-4 h-4 text-rose-500" />}>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => (
          <Badge
            key={crypto.getRandomValues(new Uint32Array(1))[0]}
            className={getBadgeStyles('persons')}
          >
            @{person.fullName}
          </Badge>
        ))}
      </div>
    </AnalysisCard>
  )
}
