'use client'

import { trpc } from '@/lib/trpc'
import { useState } from 'react'

export default function SurveysPage() {
  const [newSurvey, setNewSurvey] = useState({
    name: '',
    description: '',
    options: [{ title: '', description: '' }],
  })

  const { data: surveys, refetch } = trpc.surveys.list.useQuery()
  const createMutation = trpc.surveys.create.useMutation({
    onSuccess: () => refetch(),
  })
  const voteMutation = trpc.surveys.vote.useMutation({
    onSuccess: () => refetch(),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createMutation.mutateAsync(newSurvey)
    setNewSurvey({
      name: '',
      description: '',
      options: [{ title: '', description: '' }],
    })
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Surveys</h1>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div>
          <input
            type="text"
            placeholder="Survey Name"
            value={newSurvey.name}
            onChange={(e) => setNewSurvey((prev) => ({ ...prev, name: e.target.value }))}
            className="input input-bordered w-full"
          />
        </div>
        <div>
          <textarea
            placeholder="Description"
            value={newSurvey.description}
            onChange={(e) => setNewSurvey((prev) => ({ ...prev, description: e.target.value }))}
            className="textarea textarea-bordered w-full"
          />
        </div>

        {newSurvey.options.map((option, index) => (
          <div key={crypto.getRandomValues(new Uint16Array(1))[0]} className="flex gap-2">
            <input
              type="text"
              placeholder="Option Title"
              value={option.title}
              onChange={(e) => {
                const newOptions = [...newSurvey.options]
                newOptions[index].title = e.target.value
                setNewSurvey((prev) => ({ ...prev, options: newOptions }))
              }}
              className="input input-bordered flex-1"
            />
            <input
              type="text"
              placeholder="Option Description"
              value={option.description}
              onChange={(e) => {
                const newOptions = [...newSurvey.options]
                newOptions[index].description = e.target.value
                setNewSurvey((prev) => ({ ...prev, options: newOptions }))
              }}
              className="input input-bordered flex-1"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setNewSurvey((prev) => ({
              ...prev,
              options: [...prev.options, { title: '', description: '' }],
            }))
          }
          className="btn btn-secondary"
        >
          Add Option
        </button>

        <button type="submit" className="btn btn-primary">
          Create Survey
        </button>
      </form>

      <div className="space-y-4">
        {surveys?.map((survey) => (
          <div key={survey.id} className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">{survey.name}</h2>
              <p>{survey.description}</p>
              <div className="space-y-2">
                {survey.options.map((option) => (
                  <div key={option.id} className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{option.title}</h3>
                      <p>{option.description}</p>
                    </div>
                    <button
                      type="submit"
                      onClick={() =>
                        voteMutation.mutateAsync({
                          surveyId: survey.id,
                          optionId: option.id,
                        })
                      }
                      className="btn btn-sm btn-primary"
                    >
                      Vote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
