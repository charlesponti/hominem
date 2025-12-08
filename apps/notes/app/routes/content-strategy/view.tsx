import { Button } from '@hominem/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import { useToast } from '@hominem/ui/components/ui/use-toast'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useContentStrategy, useDeleteContentStrategy } from '~/hooks/use-content-strategies'

export default function ContentStrategyViewPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const { strategy, isLoading, error } = useContentStrategy(id || '')
  const { deleteStrategy, isLoading: isDeleting } = useDeleteContentStrategy()

  const handleDelete = async () => {
    if (
      !strategy ||
      !confirm('Are you sure you want to delete this strategy? This action cannot be undone.')
    ) {
      return
    }

    try {
      await deleteStrategy({ id: strategy.id })
      toast({
        title: 'Strategy Deleted',
        description: 'The content strategy has been deleted successfully.',
      })
      // Redirect to strategies list
      window.location.href = '/content-strategy/saved'
    } catch (error) {
      console.error('Failed to delete strategy:', error)
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Unable to delete the strategy. Please try again.',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3">Loading strategy...</span>
        </div>
      </div>
    )
  }

  if (error || !strategy) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Strategy Not Found</h2>
          <p className="text-gray-600 mb-4">
            The content strategy you're looking for doesn't exist.
          </p>
          <Link to="/content-strategy/saved">
            <Button>Back to Strategies</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/content-strategy/saved">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{strategy.title}</h1>
            {strategy.description && <p className="text-gray-600">{strategy.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/content-strategy/edit/${strategy.id}`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Strategy Content */}
      <div className="grid gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Strategy Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">Topic</h4>
                <p className="text-gray-600">{strategy.strategy.topic}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Target Audience</h4>
                <p className="text-gray-600">{strategy.strategy.targetAudience}</p>
              </div>
            </div>
            {strategy.strategy.platforms && strategy.strategy.platforms.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Platforms</h4>
                <div className="flex gap-2 flex-wrap">
                  {strategy.strategy.platforms.map((platform: string) => (
                    <span
                      key={platform}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Insights */}
        {strategy.strategy.keyInsights && strategy.strategy.keyInsights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strategy.strategy.keyInsights.map((insight: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Content Plan */}
        {strategy.strategy.contentPlan && (
          <Card>
            <CardHeader>
              <CardTitle>Content Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Blog Content */}
              {strategy.strategy.contentPlan.blog && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Blog Content</h4>
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium">Title</h5>
                      <p className="text-gray-600">{strategy.strategy.contentPlan.blog.title}</p>
                    </div>
                    <div>
                      <h5 className="font-medium">Word Count</h5>
                      <p className="text-gray-600">
                        {strategy.strategy.contentPlan.blog.wordCount} words
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium">Outline</h5>
                      <ol className="list-decimal list-inside space-y-1">
                        {strategy.strategy.contentPlan.blog.outline.map(
                          (section: any, index: number) => (
                            <li key={index} className="text-gray-600">
                              <strong>{section.heading}:</strong> {section.content}
                            </li>
                          )
                        )}
                      </ol>
                    </div>
                    <div>
                      <h5 className="font-medium">SEO Keywords</h5>
                      <div className="flex gap-2 flex-wrap">
                        {strategy.strategy.contentPlan.blog.seoKeywords.map((keyword: string) => (
                          <span
                            key={keyword}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium">Call to Action</h5>
                      <p className="text-gray-600">
                        {strategy.strategy.contentPlan.blog.callToAction}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Social Media Content */}
              {strategy.strategy.contentPlan.socialMedia &&
                strategy.strategy.contentPlan.socialMedia.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Social Media Content</h4>
                    <div className="space-y-4">
                      {strategy.strategy.contentPlan.socialMedia.map(
                        (platform: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <h5 className="font-medium text-gray-900 mb-2">{platform.platform}</h5>
                            <div className="space-y-2">
                              <div>
                                <h6 className="font-medium text-sm">Best Time to Post</h6>
                                <p className="text-gray-600 text-sm">{platform.bestTimeToPost}</p>
                              </div>
                              <div>
                                <h6 className="font-medium text-sm">Content Ideas</h6>
                                <ul className="list-disc list-inside space-y-1">
                                  {platform.contentIdeas.map((idea: string, ideaIndex: number) => (
                                    <li key={ideaIndex} className="text-gray-600 text-sm">
                                      {idea}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h6 className="font-medium text-sm">Hashtag Suggestions</h6>
                                <div className="flex gap-1 flex-wrap">
                                  {platform.hashtagSuggestions.map((hashtag: string) => (
                                    <span
                                      key={hashtag}
                                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                                    >
                                      {hashtag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Monetization */}
        {strategy.strategy.monetization && strategy.strategy.monetization.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Monetization Ideas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strategy.strategy.monetization.map((idea: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Competitive Analysis */}
        {strategy.strategy.competitiveAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle>Competitive Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Content Gaps</h4>
                <p className="text-gray-600">{strategy.strategy.competitiveAnalysis.gaps}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Opportunities</h4>
                <ul className="space-y-1">
                  {strategy.strategy.competitiveAnalysis.opportunities.map(
                    (opportunity: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        <span className="text-gray-600">{opportunity}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
