'use client'

import type { Habits } from '@hominem/utils/schemas'
import { Clock, Repeat } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { AnalysisCard } from './analysis-card'
import { getBadgeStyles } from './utils'

export const HabitsAnalysis = ({ habits }: { habits?: Habits }) => {
  if (!habits) return null

  return (
    <AnalysisCard title="Habits & Routines" icon={<Repeat className="w-4 h-4 text-teal-500" />}>
      <div className="space-y-2">
        {habits.routines && habits.routines.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Routines:</div>
            <div className="flex flex-wrap gap-2">
              {habits.routines.map((routine: string) => (
                <Badge key={routine} className={getBadgeStyles('habits')}>
                  {routine}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {habits.frequency && habits.frequency.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Frequency:</div>
            <div className="flex flex-wrap gap-2">
              {habits.frequency.map((freq: string) => (
                <Badge key={freq} className="bg-blue-100 text-blue-700">
                  {freq}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {habits.timePatterns && habits.timePatterns.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Time Patterns:</div>
            <div className="flex flex-wrap gap-2">
              {habits.timePatterns.map((pattern: string) => (
                <Badge key={pattern} className="bg-teal-100 text-teal-700">
                  <Clock className="w-3 h-3 mr-1" /> {pattern}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnalysisCard>
  )
}
