import { Button } from '@hominem/ui/button'
import { Card, CardContent } from '@hominem/ui/card'
import { PageContainer } from '@hominem/ui/components/layout/page-container'
import { useToast } from '@hominem/ui/components/ui/use-toast'
import { Eye, FileText, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { Loading } from '~/components/loading'
import { useContentStrategies, useDeleteContentStrategy } from '~/hooks/use-content-strategies'
import i18n from '~/lib/i18n'

export default function SavedContentStrategiesPage() {
  const { toast } = useToast()
  const { strategies: savedStrategies, isLoading: loadingStrategies } = useContentStrategies()
  const { deleteStrategy, isLoading: isDeleting } = useDeleteContentStrategy()

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) {
      return
    }

    try {
      await deleteStrategy({ id: strategyId })
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
      <PageContainer>
        <Loading text="Loading saved strategies..." />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Saved Content Strategies</h1>
          <Link to="/content-strategy/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Strategy
            </Button>
          </Link>
        </div>

        {savedStrategies.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No saved strategies</h3>
            <p className="text-muted-foreground mb-6">
              Create your first content strategy to get started.
            </p>
            <Link to="/content-strategy/create">
              <Button>Create Your First Strategy</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedStrategies.map((strategy) => (
              <Card key={strategy.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-lg line-clamp-2">{strategy.title}</h3>
                    <div className="flex items-center gap-2">
                      <Link to={`/content-strategy/view/${strategy.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteStrategy(strategy.id)}
                        disabled={isDeleting}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                    {strategy.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created {new Date(strategy.createdAt).toLocaleDateString()}</span>
                    <span>
                      {i18n.t('platform', {
                        count: strategy.strategy.platforms?.length || 0,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
