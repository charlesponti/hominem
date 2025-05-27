'use client'

import type { ContentStrategiesSelect } from '@hominem/utils/types'
import { Eye, FileText, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useToast } from '~/components/ui/use-toast'
import {
  useContentStrategies,
  useDeleteContentStrategy,
} from '~/lib/content/use-content-strategies'

export default function SavedContentStrategiesPage() {
  const { toast } = useToast()
  const { strategies: savedStrategies, isLoading: loadingStrategies } = useContentStrategies()
  const { deleteStrategy, isLoading: isDeleting } = useDeleteContentStrategy()
  const [selectedStrategy, setSelectedStrategy] = useState<ContentStrategiesSelect | null>(null)

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) {
      return
    }

    try {
      await deleteStrategy.mutateAsync(strategyId)
      toast({
        title: 'Strategy Deleted',
        description: 'The content strategy has been deleted successfully.',
      })
    } catch (error) {
      console.error('Failed to delete strategy:', error)
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Unable to delete the strategy. Please try again.',
      })
    }
  }

  const handleViewStrategy = (strategy: ContentStrategiesSelect) => {
    setSelectedStrategy(strategy)
  }

  if (loadingStrategies) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3">Loading saved strategies...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Saved Content Strategies</span>
            <Link to="/content-strategy/create">
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create New Strategy
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {savedStrategies.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No saved strategies yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first AI-powered content strategy to get started.
              </p>
              <Link to="/content-strategy">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Strategy
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {savedStrategies.map((strategy) => (
                <Card key={strategy.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{strategy.title}</h3>
                        {strategy.description && (
                          <p className="text-gray-600 text-sm mb-2">{strategy.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span>
                            <strong>Topic:</strong> {strategy.strategy.topic}
                          </span>
                          <span>
                            <strong>Audience:</strong> {strategy.strategy.targetAudience}
                          </span>
                          <span>
                            <strong>Created:</strong>{' '}
                            {strategy.createdAt
                              ? new Date(strategy.createdAt).toLocaleDateString()
                              : 'Unknown date'}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {strategy.strategy.platforms?.map((platform) => (
                            <span
                              key={platform}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                            >
                              {platform}
                            </span>
                          )) || <span className="text-xs text-gray-500">No platforms</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewStrategy(strategy)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteStrategy(strategy.id)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategy Details Modal/Sidebar */}
      {selectedStrategy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedStrategy.title}</h2>
                <Button variant="outline" onClick={() => setSelectedStrategy(null)}>
                  Close
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Strategy Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Topic:</strong> {selectedStrategy.strategy.topic}
                    </div>
                    <div>
                      <strong>Target Audience:</strong> {selectedStrategy.strategy.targetAudience}
                    </div>
                    <div>
                      <strong>Platforms:</strong>{' '}
                      {selectedStrategy.strategy.platforms?.join(', ') || 'No platforms'}
                    </div>
                    <div>
                      <strong>Created:</strong>{' '}
                      {selectedStrategy.createdAt
                        ? new Date(selectedStrategy.createdAt).toLocaleDateString()
                        : 'Unknown date'}
                    </div>
                  </div>
                </div>

                {selectedStrategy.strategy.keyInsights &&
                  selectedStrategy.strategy.keyInsights.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Key Insights</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedStrategy.strategy.keyInsights.map((insight) => (
                          <li key={insight}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {selectedStrategy.strategy.contentPlan?.blog && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Blog Content Plan</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="font-medium mb-2">
                        {selectedStrategy.strategy.contentPlan.blog.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Word Count: {selectedStrategy.strategy.contentPlan.blog.wordCount}
                      </p>
                      {selectedStrategy.strategy.contentPlan.blog.outline && (
                        <div>
                          <h5 className="font-medium mb-1">Outline:</h5>
                          <ol className="list-decimal pl-5 space-y-1 text-sm">
                            {selectedStrategy.strategy.contentPlan.blog.outline.map((section) => (
                              <li key={`${section.heading}-${section.content}`}>
                                <strong>{section.heading}:</strong> {section.content}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedStrategy.strategy.monetization &&
                  selectedStrategy.strategy.monetization.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Monetization Ideas</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedStrategy.strategy.monetization.map((idea) => (
                          <li key={idea}>{idea}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {selectedStrategy.strategy.competitiveAnalysis && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Competitive Analysis</h3>
                    <div className="bg-gray-50 p-4 rounded-md space-y-2">
                      <div>
                        <strong>Content Gaps:</strong>{' '}
                        {selectedStrategy.strategy.competitiveAnalysis.gaps}
                      </div>
                      <div>
                        <strong>Opportunities:</strong>{' '}
                        {Array.isArray(selectedStrategy.strategy.competitiveAnalysis.opportunities)
                          ? selectedStrategy.strategy.competitiveAnalysis.opportunities.join(', ')
                          : selectedStrategy.strategy.competitiveAnalysis.opportunities}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
