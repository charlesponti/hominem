'use client'

import { Badge } from '@/components/ui/badge'
import type { Locations } from '@ponti/utils/nlp'
import { MapPin } from 'lucide-react'
import { AnalysisCard } from './analysis-card'
import { getBadgeStyles } from './utils'

export const LocationsAnalysis = ({ locations }: { locations?: Locations }) => {
  if (!locations || locations.length === 0) return null

  return (
    <AnalysisCard title="Locations" icon={<MapPin className="w-4 h-4 text-cyan-500" />}>
      <div className="flex flex-col gap-2">
        {locations.map((location) => (
          <div
            key={`${location.name || ''}-${location.city || ''}-${location.country || ''}`}
            className="bg-cyan-50 p-2 rounded"
          >
            {location.name && <div className="font-medium text-cyan-700">{location.name}</div>}
            <div className="text-xs text-cyan-600 flex flex-wrap gap-1 mt-1">
              {location.city && (
                <Badge className={getBadgeStyles('locations')}>📍 {location.city}</Badge>
              )}
              {location.country && (
                <Badge className={getBadgeStyles('locations')}>{location.country}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </AnalysisCard>
  )
}
