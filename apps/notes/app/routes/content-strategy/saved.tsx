'use client'

import { Eye, FileText, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { useToast } from '~/components/ui/use-toast'
import {
  useContentStrategies,
  useDeleteContentStrategy,
} from '~/lib/content/use-content-strategies'

export default function SavedContentStrategiesPage() {
  const { toast } = useToast()
  const { strategies: savedStrategies, isLoading: loadingStrategies } = useContentStrategies()
  const { deleteStrategy, isLoading: isDeleting } = useDeleteContentStrategy()

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
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif tracking-tight">Content Strategies</h1>
        <Link to="/content-strategy/create">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create New Strategy
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      {savedStrategies.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No saved strategies yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first AI-powered content strategy to get started.
          </p>
          <Link to="/content-strategy/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Strategy
            </Button>
          </Link>
        </div>
      ) : null}

      {/* Strategies List */}
      {savedStrategies.length > 0 ? (
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
                    <Link to={`/content-strategy/${strategy.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
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
      ) : null}
    </div>
  )
}
