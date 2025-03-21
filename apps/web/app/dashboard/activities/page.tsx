'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAnalyzeNote, useCreateNote, useDeleteNote, useNotes } from '@/lib/hooks/use-notes'
import type { Decisions, Habits, TextAnalysis, TextAnalysisEmotion } from '@ponti/utils/nlp'
import { motion } from 'framer-motion'
import {
  BarChart,
  BarChart2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  LineChart,
  Loader2,
  MapPin,
  Repeat,
  Tag,
  Trash2,
  Users,
} from 'lucide-react'
import { useState, type ChangeEvent } from 'react'

// Utility function to get badge styles based on analysis key
const getBadgeStyles = (key: string) => {
  switch (key) {
    case 'topics':
      return 'bg-violet-100 text-violet-700 hover:bg-violet-200'
    case 'entities':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    case 'sentiment':
      return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
    case 'keywords':
      return 'bg-amber-100 text-amber-700 hover:bg-amber-200'
    case 'categories':
      return 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
    case 'dates':
    case 'time':
      return 'bg-teal-100 text-teal-700 hover:bg-teal-200'
    case 'persons':
      return 'bg-rose-100 text-rose-700 hover:bg-rose-200'
    case 'locations':
      return 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
    case 'organizations':
      return 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }
}

// Analysis Card component to provide consistent styling
interface AnalysisCardProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}

const AnalysisCard = ({ title, icon, children, className = '' }: AnalysisCardProps) => (
  <motion.div
    className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 ${className}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center gap-2 text-sm font-medium mb-3 uppercase tracking-wider">
      {icon}
      <span className="text-violet-600">{title}</span>
    </div>
    <div className="text-gray-800">{children}</div>
  </motion.div>
)

// Topic Analysis Component
const TopicsAnalysis = ({ topics }: { topics?: string[] }) => {
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

// People Analysis Component
const PeopleAnalysis = ({ people }: { people?: string[] }) => {
  if (!people || people.length === 0) return null

  return (
    <AnalysisCard title="People" icon={<Users className="w-4 h-4 text-rose-500" />}>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => (
          <Badge key={person} className={getBadgeStyles('persons')}>
            @{person}
          </Badge>
        ))}
      </div>
    </AnalysisCard>
  )
}

// Define interfaces based on schema from nlp/processor.ts
interface Location {
  name?: string
  city?: string
  state?: string
  region?: string
  country?: string
  continent?: string
}

interface Item {
  name: string
  quantity?: number
}

// Locations Analysis Component
const LocationsAnalysis = ({ locations }: { locations?: Location[] }) => {
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

// Emotions Analysis Component
const EmotionsAnalysis = ({ emotions }: { emotions?: TextAnalysisEmotion[] }) => {
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

// Activities Analysis Component
const ActivitiesAnalysis = ({ activities }: { activities?: string[] }) => {
  if (!activities || activities.length === 0) return null

  return (
    <AnalysisCard title="Activities" icon={<BarChart className="w-4 h-4 text-indigo-500" />}>
      <div className="flex flex-wrap gap-2">
        {activities.map((activity) => (
          <Badge key={activity} className={getBadgeStyles('activities')}>
            {activity}
          </Badge>
        ))}
      </div>
    </AnalysisCard>
  )
}

// Habits Analysis Component
const HabitsAnalysis = ({ habits }: { habits?: Habits }) => {
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

// Decisions Analysis Component
const DecisionsAnalysis = ({ decisions }: { decisions?: Decisions }) => {
  if (!decisions) return null

  return (
    <AnalysisCard
      title="Decisions"
      icon={<CheckCircle className="w-4 h-4 text-green-500" />}
      className="col-span-2"
    >
      <div className="space-y-3">
        {decisions.decisions && decisions.decisions.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Decisions Made:</div>
            <ul className="list-disc pl-5 space-y-1">
              {decisions.decisions.map((decision: string) => (
                <li key={decision} className="text-green-700">
                  {decision}
                </li>
              ))}
            </ul>
          </div>
        )}

        {decisions.alternatives && decisions.alternatives.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Alternatives Considered:</div>
            <ul className="list-disc pl-5 space-y-1">
              {decisions.alternatives.map((alt: string) => (
                <li key={alt} className="text-orange-600">
                  {alt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {decisions.reasoning && decisions.reasoning.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Reasoning:</div>
            <ul className="list-disc pl-5 space-y-1">
              {decisions.reasoning.map((reason: string) => (
                <li key={reason} className="text-blue-600">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AnalysisCard>
  )
}

// Questions Analysis Component
const QuestionsAnalysis = ({ questions }: { questions?: string[] }) => {
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

// Items Analysis Component
const ItemsAnalysis = ({ items }: { items?: Item[] }) => {
  if (!items || items.length === 0) return null

  return (
    <AnalysisCard title="Items" icon={<div className="text-gray-500">📦</div>}>
      <ul className="space-y-2">
        {items.map((item) => {
          const key = `${item.name}-${item.quantity || 'undefined'}`
          return (
            <li key={key} className="flex justify-between items-center bg-gray-50 p-2 rounded">
              <span>{item.name}</span>
              {item.quantity && (
                <Badge className="bg-gray-200 text-gray-700">x{item.quantity}</Badge>
              )}
            </li>
          )
        })}
      </ul>
    </AnalysisCard>
  )
}

// Main Analysis Panel Component
const AnalysisPanel = ({ analysis }: { analysis: TextAnalysis }) => {
  if (!analysis) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <TopicsAnalysis topics={analysis.topics} />
      <PeopleAnalysis people={analysis.people} />
      {analysis.locations ? <LocationsAnalysis locations={analysis.locations} /> : null}
      <EmotionsAnalysis emotions={analysis.emotions} />
      <ActivitiesAnalysis activities={analysis.activities} />
      {analysis.habits ? <HabitsAnalysis habits={analysis.habits} /> : null}
      {analysis.decisions ? <DecisionsAnalysis decisions={analysis.decisions} /> : null}
      {analysis.questions ? <QuestionsAnalysis questions={analysis.questions} /> : null}
      {analysis.items ? <ItemsAnalysis items={analysis.items} /> : null}
    </div>
  )
}

const SmartTaskInput = () => {
  const [inputValue, setInputValue] = useState('')
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null)
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const { createNote } = useCreateNote()
  const { deleteNote } = useDeleteNote()
  const { analyzeNote } = useAnalyzeNote()
  const { notes } = useNotes()

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
  }

  const handleSubmit = async () => {
    if (!inputValue) return
    await createNote.mutateAsync({ content: inputValue })
    setInputValue('')
  }

  const handleDelete = async (id: string) => {
    await deleteNote.mutateAsync(id)
  }

  const handleAnalyze = async (id: string) => {
    setSelectedNoteId(id)
    await analyzeNote.mutateAsync(id)
    setAnalysisDialogOpen(true)
  }

  const toggleExpand = (id: string) => {
    setExpandedNoteId(expandedNoteId === id ? null : id)
  }

  const getSelectedNote = () => {
    if (!selectedNoteId || !notes) return null
    return notes.find((note) => note.id === selectedNoteId)
  }

  const selectedNote = getSelectedNote()

  return (
    <div className="flex flex-col items-center justify-center pt-4">
      <Card className="container max-w-2xl shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Add task (try: Buy groceries next Friday #shopping @errands)"
                className="w-full text-lg rounded-lg border-gray-200 focus:ring-violet-500 focus:border-violet-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
              >
                Add
              </Button>
            </div>

            <div className="space-y-4 mt-6">
              {notes?.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
                    <div className="p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-gray-800">{note.content}</div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAnalyze(note.id)}
                            className="text-violet-600 hover:bg-violet-100 hover:text-violet-700"
                            disabled={analyzeNote.isLoading && selectedNoteId === note.id}
                          >
                            {analyzeNote.isLoading && selectedNoteId === note.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <BarChart2 className="w-4 h-4" />
                            )}
                          </Button>
                          {note.analysis && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(note.id)}
                              className="text-gray-500 hover:bg-gray-100"
                            >
                              {expandedNoteId === note.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(note.id)}
                            className="text-red-500 hover:bg-red-100 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Note analysis preview */}
                      {note.analysis && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {/* Topics badges */}
                          {note.analysis.topics?.slice(0, 3).map((tag: string) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className={getBadgeStyles('topics')}
                            >
                              #{tag}
                            </Badge>
                          ))}

                          {/* People badges */}
                          {note.analysis.people?.slice(0, 2).map((person: string) => (
                            <Badge
                              key={person}
                              variant="secondary"
                              className={getBadgeStyles('persons')}
                            >
                              @{person}
                            </Badge>
                          ))}

                          {/* Emotions badge */}
                          {note.analysis.emotions?.[0] && (
                            <Badge variant="secondary" className={getBadgeStyles('emotions')}>
                              {note.analysis.emotions[0].emotion}
                            </Badge>
                          )}

                          {/* Show more badge if there's more analysis data */}
                          {(note.analysis.topics?.length || 0) +
                            (note.analysis.people?.length || 0) >
                            5 && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500">
                              +more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Expanded analysis view */}
                      {expandedNoteId === note.id && note.analysis && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pt-4 border-t border-gray-100 text-sm"
                        >
                          <div className="space-y-3">
                            {/* Topics section */}
                            {note.analysis.topics?.length > 0 && (
                              <div>
                                <div className="text-xs text-violet-600 font-medium mb-1 flex items-center gap-1">
                                  <Tag className="w-3 h-3" /> TOPICS
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {note.analysis.topics.map((topic: string) => (
                                    <Badge key={topic} className={getBadgeStyles('topics')}>
                                      #{topic}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* People section */}
                            {note.analysis.people?.length > 0 && (
                              <div>
                                <div className="text-xs text-rose-600 font-medium mb-1 flex items-center gap-1">
                                  <Users className="w-3 h-3" /> PEOPLE
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {note.analysis.people.map((person: string) => (
                                    <Badge key={person} className={getBadgeStyles('persons')}>
                                      @{person}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Activities section */}
                            {note.analysis.activities?.length > 0 && (
                              <div>
                                <div className="text-xs text-indigo-600 font-medium mb-1 flex items-center gap-1">
                                  <BarChart className="w-3 h-3" /> ACTIVITIES
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {note.analysis.activities.map((activity: string) => (
                                    <Badge key={activity} className={getBadgeStyles('activities')}>
                                      {activity}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Emotions section */}
                            {note.analysis.emotions?.length > 0 && (
                              <div>
                                <div className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
                                  <LineChart className="w-3 h-3" /> EMOTIONS
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {note.analysis.emotions.map((emotion: TextAnalysisEmotion) => {
                                    const key = `${emotion.emotion}-${emotion.intensity || 0}`
                                    return (
                                      <Badge key={key} className="bg-amber-100 text-amber-800">
                                        {emotion.emotion}
                                        {emotion.intensity && (
                                          <span className="ml-1 opacity-70">
                                            ({emotion.intensity}/10)
                                          </span>
                                        )}
                                      </Badge>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-gradient-to-b from-white to-gray-50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-indigo-600">
              Analysis Results
            </DialogTitle>
          </DialogHeader>

          {selectedNote?.content && (
            <div className="border-b pb-3 mb-3">
              <div className="text-sm text-gray-500">Original note:</div>
              <div className="font-medium">{selectedNote.content}</div>
            </div>
          )}

          {selectedNote?.analysis ? (
            <AnalysisPanel analysis={selectedNote.analysis} />
          ) : (
            <div className="text-center py-8 text-gray-500">No analysis available</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SmartTaskInput
