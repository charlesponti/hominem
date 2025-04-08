'use client'

import { AnalysisPanel } from '@/components/analysis'
import { getBadgeStyles } from '@/components/analysis/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAnalyzeNote, useCreateNote, useDeleteNote, useNotes } from '@/lib/hooks/use-notes'
import type { TextAnalysisEmotion } from '@hominem/utils/schemas'
import { motion } from 'framer-motion'
import { BarChart2, ChevronDown, ChevronUp, Loader2, Tag, Trash2, Users } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'

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
                          {note.analysis.people?.slice(0, 2).map((person) => (
                            <Badge
                              key={person.fullName}
                              variant="secondary"
                              className={getBadgeStyles('persons')}
                            >
                              @{person.fullName}
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
                            {note.analysis.people && note.analysis.people.length > 0 && (
                              <div>
                                <div className="text-xs text-rose-600 font-medium mb-1 flex items-center gap-1">
                                  <Users className="w-3 h-3" /> PEOPLE
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {note.analysis.people.map((person) => (
                                    <Badge
                                      key={person.fullName}
                                      className={getBadgeStyles('persons')}
                                    >
                                      @{person.fullName}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Activities section */}
                            {note.analysis.activities && note.analysis.activities.length > 0 && (
                              <div>
                                <div className="text-xs text-indigo-600 font-medium mb-1 flex items-center gap-1">
                                  <BarChart2 className="w-3 h-3" /> ACTIVITIES
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {note.analysis.activities.map((activity) => (
                                    <Badge
                                      key={activity.description}
                                      className={getBadgeStyles('activities')}
                                    >
                                      {activity.description}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Emotions section */}
                            {note.analysis.emotions && note.analysis.emotions?.length > 0 && (
                              <div>
                                <div className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
                                  <BarChart2 className="w-3 h-3" /> EMOTIONS
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
