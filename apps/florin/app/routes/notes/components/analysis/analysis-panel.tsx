'use client'

import type { TextAnalysis } from '@hominem/utils/schemas'
import { ActivitiesAnalysis } from './activities-analysis'
import { DecisionsAnalysis } from './decisions-analysis'
import { EmotionsAnalysis } from './emotions-analysis'
import { LocationsAnalysis } from './locations-analysis'
import { PeopleAnalysis } from './people-analysis'
import { QuestionsAnalysis } from './questions-analysis'
import { TopicsAnalysis } from './topics-analysis'

export const AnalysisPanel = ({ analysis }: { analysis: TextAnalysis }) => {
  if (!analysis) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <TopicsAnalysis topics={analysis.topics} />
      <PeopleAnalysis people={analysis.people} />
      {analysis.locations ? <LocationsAnalysis locations={analysis.locations} /> : null}
      <EmotionsAnalysis emotions={analysis.emotions} />
      <ActivitiesAnalysis activities={analysis.activities} />
      {analysis.decisions ? <DecisionsAnalysis decisions={analysis.decisions} /> : null}
      {analysis.questions ? <QuestionsAnalysis questions={analysis.questions} /> : null}
    </div>
  )
}
