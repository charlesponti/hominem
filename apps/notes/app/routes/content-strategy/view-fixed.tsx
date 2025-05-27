'use client'

import { ArrowLeft, FileText } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CopyButton } from '~/components/copy-button'
import { KeyboardShortcutsHelp } from '~/components/keyboard-shortcuts-help'
import { SkipLinks } from '~/components/skip-links'
import { StrategySection } from '~/components/strategy-section'
import { Button } from '~/components/ui/button'
import { useContentStrategy } from '~/lib/content/use-content-strategies'
import { useCopyStrategy } from '~/lib/content/use-copy-strategy'
import { useKeyboardNavigation } from '~/lib/hooks/use-keyboard-navigation'

export default function ViewContentStrategyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { strategy, isLoading, error } = useContentStrategy(id || '')
  const {
    copiedSections,
    copyFullStrategy,
    copyKeyInsights,
    copyBlogContentPlan,
    copyMonetizationIdeas,
    copyCompetitiveAnalysis,
  } = useCopyStrategy(strategy)

  // Keyboard navigation setup
  const handleGoBack = useCallback(() => {
    navigate('/content-strategy')
  }, [navigate])

  const handleCopySection = useCallback(
    (sectionName: string) => {
      switch (sectionName.toLowerCase()) {
        case 'key insights':
          copyKeyInsights()
          break
        case 'blog content plan':
          copyBlogContentPlan()
          break
        case 'monetization ideas':
          copyMonetizationIdeas()
          break
        case 'competitive analysis':
          copyCompetitiveAnalysis()
          break
        default:
          copyFullStrategy()
      }
    },
    [
      copyKeyInsights,
      copyBlogContentPlan,
      copyMonetizationIdeas,
      copyCompetitiveAnalysis,
      copyFullStrategy,
    ]
  )

  const sections = [
    'Key insights',
    'Blog content plan',
    'Monetization ideas',
    'Competitive analysis',
  ]

  const { getShortcutText } = useKeyboardNavigation({
    onCopyAll: copyFullStrategy,
    onGoBack: handleGoBack,
    onCopySection: handleCopySection,
    sections,
  })

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <SkipLinks />
        <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
            aria-hidden="true"
          />
          <span className="ml-3">Loading strategy...</span>
        </div>
      </div>
    )
  }

  if (error || !strategy) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <SkipLinks />
        <div className="text-center py-8" role="alert">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-lg font-medium text-gray-900 mb-2">Strategy not found</h1>
          <p className="text-gray-500 mb-4">
            The content strategy you're looking for could not be found.
          </p>
          <Link to="/content-strategy">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Back to Strategies
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <SkipLinks />

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/content-strategy">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Back to Strategies
            </Button>
          </Link>
        </div>
        <CopyButton
          onClick={copyFullStrategy}
          sectionName="Full strategy"
          copiedSections={copiedSections}
          variant="outline"
          shortcutKey={getShortcutText('copyAll')}
        >
          {copiedSections.has('Full strategy') ? 'Copied!' : 'Copy All'}
        </CopyButton>
      </header>

      <main id="main-content" tabIndex={-1}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold" id="strategy-title">
            {strategy.title}
          </h1>
          {strategy.description && (
            <p className="text-gray-600 mt-1" id="strategy-description">
              {strategy.description}
            </p>
          )}
        </div>

        <div className="space-y-6" aria-labelledby="strategy-title">
          {/* Strategy Overview */}
          <StrategySection title="Strategy Details" sectionId="strategy-details" level={2}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Topic:</strong> {strategy.strategy.topic}
              </div>
              <div>
                <strong>Target Audience:</strong> {strategy.strategy.targetAudience}
              </div>
              <div>
                <strong>Platforms:</strong>{' '}
                {strategy.strategy.platforms?.join(', ') || 'No platforms'}
              </div>
              <div>
                <strong>Created:</strong>{' '}
                {strategy.createdAt
                  ? new Date(strategy.createdAt).toLocaleDateString()
                  : 'Unknown date'}
              </div>
            </div>
          </StrategySection>

          {/* Key Insights */}
          {strategy.strategy.keyInsights && strategy.strategy.keyInsights.length > 0 && (
            <StrategySection
              title="Key Insights"
              onCopy={copyKeyInsights}
              sectionName="Key insights"
              copiedSections={copiedSections}
              showCopyButton={true}
              sectionId="key-insights"
              shortcutKey={getShortcutText('copySection')}
              level={2}
            >
              <ul className="list-disc pl-5 space-y-1">
                {strategy.strategy.keyInsights.map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
              </ul>
            </StrategySection>
          )}

          {/* Blog Content Plan */}
          {strategy.strategy.contentPlan?.blog && (
            <StrategySection
              title="Blog Content Plan"
              onCopy={copyBlogContentPlan}
              sectionName="Blog content plan"
              copiedSections={copiedSections}
              showCopyButton={true}
              sectionId="blog-content-plan"
              shortcutKey={getShortcutText('copySection')}
              level={2}
            >
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-lg" id="blog-title">
                    {strategy.strategy.contentPlan.blog.title}
                  </h3>
                  <p className="text-sm text-gray-600" aria-describedby="blog-title">
                    Suggested word count: {strategy.strategy.contentPlan.blog.wordCount}
                  </p>
                </div>

                {strategy.strategy.contentPlan.blog.outline && (
                  <div>
                    <h4 className="font-medium mb-2">Outline:</h4>
                    <ol className="list-decimal pl-5 space-y-2">
                      {strategy.strategy.contentPlan.blog.outline.map((section, index) => (
                        <li key={`${section.heading}-${index}`}>
                          <span className="font-medium">{section.heading}:</span> {section.content}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {strategy.strategy.contentPlan.blog.seoKeywords &&
                  strategy.strategy.contentPlan.blog.seoKeywords.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">SEO Keywords:</h4>
                      <div className="flex flex-wrap gap-2" aria-label="SEO keywords">
                        {strategy.strategy.contentPlan.blog.seoKeywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {strategy.strategy.contentPlan.blog.callToAction && (
                  <div>
                    <h4 className="font-medium mb-1">Call to Action:</h4>
                    <p className="text-sm bg-gray-50 p-3 rounded">
                      {strategy.strategy.contentPlan.blog.callToAction}
                    </p>
                  </div>
                )}
              </div>
            </StrategySection>
          )}

          {/* Monetization Ideas */}
          {strategy.strategy.monetization && strategy.strategy.monetization.length > 0 && (
            <StrategySection
              title="Monetization Ideas"
              onCopy={copyMonetizationIdeas}
              sectionName="Monetization ideas"
              copiedSections={copiedSections}
              showCopyButton={true}
              sectionId="monetization-ideas"
              shortcutKey={getShortcutText('copySection')}
              level={2}
            >
              <ul className="list-disc pl-5 space-y-1">
                {strategy.strategy.monetization.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            </StrategySection>
          )}

          {/* Competitive Analysis */}
          {strategy.strategy.competitiveAnalysis && (
            <StrategySection
              title="Competitive Analysis"
              onCopy={copyCompetitiveAnalysis}
              sectionName="Competitive analysis"
              copiedSections={copiedSections}
              showCopyButton={true}
              sectionId="competitive-analysis"
              shortcutKey={getShortcutText('copySection')}
              level={2}
            >
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Content Gaps:</h3>
                  <div className="text-sm bg-gray-50 p-3 rounded">
                    {strategy.strategy.competitiveAnalysis.gaps || 'No gaps identified'}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Opportunities:</h3>
                  <div className="text-sm bg-gray-50 p-3 rounded">
                    {Array.isArray(strategy.strategy.competitiveAnalysis.opportunities)
                      ? strategy.strategy.competitiveAnalysis.opportunities.join(', ')
                      : strategy.strategy.competitiveAnalysis.opportunities ||
                        'No opportunities identified'}
                  </div>
                </div>
              </div>
            </StrategySection>
          )}
        </div>
      </main>

      {/* Help and Keyboard Shortcuts */}
      <KeyboardShortcutsHelp />
    </div>
  )
}
