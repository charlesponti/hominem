'use client'

import { AnalysisCard } from './analysis-card'

export const QuestionsAnalysis = ({ questions }: { questions?: string[] }) => {
  if (!questions || questions.length === 0) return null

  return (
    <AnalysisCard title="Questions" icon={<div className="text-purple-500">?</div>}>
      <ul className="list-disc pl-5 space-y-1">
        {questions.map((question) => (
          <li key={question} className="text-purple-700">
            {question}
          </li>
        ))}
      </ul>
    </AnalysisCard>
  )
}
