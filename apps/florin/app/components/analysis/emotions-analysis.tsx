'use client'

import type { TextAnalysis } from '@hominem/utils/schemas'
import { LineChart } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { AnalysisCard } from './analysis-card'

export const EmotionsAnalysis = ({ emotions }: { emotions?: TextAnalysis['emotions'] }) => {
  if (!emotions || emotions.length === 0) return null

  return (
    <AnalysisCard title="Emotions" icon={<LineChart className="w-4 h-4 text-amber-500" />}>
      <div className="flex flex-wrap gap-2">
        {emotions.map((emotion) => {
          // Create color intensity based on emotion intensity
          const intensity = emotion.intensity || 5
          const key = `${emotion.emotion}-${intensity}`

          return (
            <Badge key={key} className="bg-amber-100 text-amber-800">
              {emotion.emotion}
              {intensity && <span className="ml-1 opacity-70">({intensity}/10)</span>}
            </Badge>
          )
        })}
      </div>
    </AnalysisCard>
  )
}
