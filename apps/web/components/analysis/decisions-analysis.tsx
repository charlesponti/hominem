'use client'

import type { Decisions } from '@ponti/utils/nlp'
import { CheckCircle } from 'lucide-react'
import { AnalysisCard } from './analysis-card'

export const DecisionsAnalysis = ({ decisions }: { decisions?: Decisions }) => {
  if (!decisions) return null

  return (
    <AnalysisCard
      title="Decisions"
      icon={<CheckCircle className="w-4 h-4 text-green-500" />}
      className="col-span-2"
    >
      <div className="space-y-3">
        {decisions.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Decisions Made:</div>
            <ul className="list-disc pl-5 space-y-1">
              {decisions.map((decision) => (
                <li key={decision.decision} className="text-green-700">
                  {decision.decision}
                  {decision.alternatives && decision.alternatives.length > 0 && (
                    <p>
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Alternatives Considered:
                      </div>
                      <ul className="list-disc pl-5 space-y-1">
                        {decision.alternatives.map((alt: string) => (
                          <li key={alt} className="text-orange-600">
                            {alt}
                          </li>
                        ))}
                      </ul>
                    </p>
                  )}
                  {decision.reasoning.length > 0 && (
                    <p className="text-xs font-medium text-gray-500 mb-1">{decision.reasoning}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AnalysisCard>
  )
}
