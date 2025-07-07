import type { ContentStrategy } from '@hominem/data/schema'
import { Copy, FileText, Save } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useToast } from '~/components/ui/use-toast'
import { useCreateContentStrategy } from '~/hooks/use-content-strategies'

function ResultSkeleton() {
  return (
    <div className="mt-4 p-4 bg-slate-100 rounded-md animate-pulse">
      <div className="h-5 w-20 bg-slate-200 rounded mb-2" />
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
      </div>
    </div>
  )
}

// Temporary type for AI API response that may have different structure
type AIContentStrategy = {
  topic: string
  targetAudience: string
  keyInsights?: string[]
  contentPlan?: {
    blog?: {
      title: string
      outline: { heading: string; content: string }[]
      wordCount: number
      seoKeywords: string[]
      callToAction: string
    }
    socialMedia?: {
      platform: string
      contentIdeas: string[]
      hashtagSuggestions: string[]
      bestTimeToPost: string
    }[]
    visualContent?: {
      infographicIdeas: string[]
      imageSearchTerms: string[]
    }
  }
  monetizationIdeas?: string[]
  competitiveAnalysis?: {
    gaps: string
    opportunities: string | string[] // AI might return either
  }
}

// Type for blog outline sections
type BlogSection = {
  heading: string
  content: string
}

// Type for social media platforms
type SocialMediaPlatform = {
  platform: string
  contentIdeas: string[]
  hashtagSuggestions: string[]
  bestTimeToPost: string
}

export default function ContentStrategyPage() {
  const { toast } = useToast()
  const { createStrategy, isLoading: isSaving } = useCreateContentStrategy()
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'blog',
    'twitter',
    'instagram',
  ])
  const [strategy, setStrategy] = useState<AIContentStrategy | null>(null)
  const [loading, setLoading] = useState(false)

  // Store IDs in a ref to maintain them across renders
  const idMapRef = useRef(new Map<string, string>())

  // Generate a unique ID for an item
  const getUniqueId = (prefix: string, item: string | number | object) => {
    const mapKey = `${prefix}-${typeof item === 'object' ? JSON.stringify(item) : item}`

    if (!idMapRef.current.has(mapKey)) {
      idMapRef.current.set(mapKey, crypto.randomUUID())
    }

    return idMapRef.current.get(mapKey)
  }

  const platforms = [
    { id: 'blog', label: 'Blog' },
    { id: 'twitter', label: 'Twitter' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'tiktok', label: 'TikTok' },
  ]

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform]
    )
  }

  const generateStrategy = async () => {
    if (!topic) return

    setLoading(true)
    try {
      // For now, we'll use a simple mock strategy since the AI endpoint might not be available
      // In a real implementation, you'd call the AI endpoint here
      const mockStrategy: AIContentStrategy = {
        topic,
        targetAudience: audience || 'General audience',
        keyInsights: [
          'Content should be engaging and informative',
          'Focus on providing value to the target audience',
          'Use storytelling to connect with readers',
        ],
        contentPlan: {
          blog: {
            title: `Complete Guide to ${topic}`,
            outline: [
              { heading: 'Introduction', content: 'Overview of the topic and its importance' },
              { heading: 'Key Concepts', content: 'Main ideas and principles' },
              { heading: 'Practical Applications', content: 'How to apply these concepts' },
              { heading: 'Conclusion', content: 'Summary and next steps' },
            ],
            wordCount: 1500,
            seoKeywords: [topic, 'guide', 'tips', 'best practices'],
            callToAction: 'Start implementing these strategies today!',
          },
          socialMedia: selectedPlatforms
            .filter((p) => p !== 'blog')
            .map((platform) => ({
              platform,
              contentIdeas: [
                `Share insights about ${topic}`,
                `Create engaging content around ${topic}`,
                `Connect with your audience through ${topic}`,
              ],
              hashtagSuggestions: [`#${topic.replace(/\s+/g, '')}`, '#content', '#strategy'],
              bestTimeToPost: '9:00 AM - 5:00 PM',
            })),
        },
        monetizationIdeas: [
          'Create premium content',
          'Offer consulting services',
          'Develop online courses',
        ],
        competitiveAnalysis: {
          gaps: 'Focus on unique perspectives and personal experiences',
          opportunities: ['Build a community', 'Create partnerships', 'Expand to new platforms'],
        },
      }

      setStrategy(mockStrategy)
      toast({
        title: 'Content Strategy Generated',
        description: 'Your AI-powered content strategy is ready!',
      })
    } catch (error) {
      console.error('Failed to generate content strategy:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate content strategy. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied!',
        description: `${description} copied to clipboard`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Unable to copy to clipboard',
      })
    }
  }

  const copyFullStrategy = async () => {
    if (!strategy) return

    const fullText = `
Content Strategy for: ${strategy.topic}
Target Audience: ${strategy.targetAudience}

KEY INSIGHTS:
${strategy.keyInsights?.map((insight) => `• ${insight}`).join('\n') || 'No insights available'}

BLOG CONTENT:
Title: ${strategy.contentPlan?.blog?.title || 'No title available'}
Word Count: ${strategy.contentPlan?.blog?.wordCount || 'Not specified'}

Outline:
${
  strategy.contentPlan?.blog?.outline
    ?.map((section, index) => `${index + 1}. ${section.heading}: ${section.content}`)
    .join('\n') || 'No outline available'
}

SEO Keywords: ${strategy.contentPlan?.blog?.seoKeywords?.join(', ') || 'No keywords available'}
Call to Action: ${strategy.contentPlan?.blog?.callToAction || 'No call to action available'}

SOCIAL MEDIA CONTENT:
${
  strategy.contentPlan?.socialMedia
    ?.map(
      (platform) => `
${platform.platform.toUpperCase()}:
Best time to post: ${platform.bestTimeToPost}
Content Ideas:
${platform.contentIdeas.map((idea) => `• ${idea}`).join('\n')}
Hashtags: ${platform.hashtagSuggestions.join(' ')}
`
    )
    .join('\n') || 'No social media content available'
}

VISUAL CONTENT IDEAS:
Infographics:
${strategy.contentPlan?.visualContent?.infographicIdeas?.map((idea) => `• ${idea}`).join('\n') || 'No infographic ideas available'}

Image Search Terms: ${strategy.contentPlan?.visualContent?.imageSearchTerms?.join(', ') || 'No image search terms available'}

MONETIZATION IDEAS:
${strategy.monetizationIdeas?.map((idea) => `• ${idea}`).join('\n') || 'No monetization ideas available'}

COMPETITIVE ANALYSIS:
Content Gaps: ${strategy.competitiveAnalysis?.gaps || 'No gaps identified'}
Opportunities: ${strategy.competitiveAnalysis?.opportunities || 'No opportunities identified'}
    `.trim()

    await copyToClipboard(fullText, 'Full content strategy')
  }

  const createNotesFromStrategy = async () => {
    if (!strategy) return

    const notesContent = `
# Content Strategy for ${strategy.topic}

## Key Insights
${strategy.keyInsights?.map((insight) => `- ${insight}`).join('\n') || '- No insights available'}

## Blog Content
**Title:** ${strategy.contentPlan?.blog?.title || 'No title available'}  
**Word Count:** ${strategy.contentPlan?.blog?.wordCount || 'Not specified'}

**Outline:**
${
  strategy.contentPlan?.blog?.outline
    ?.map((section, index) => `${index + 1}. ${section.heading}: ${section.content}`)
    .join('\n') || 'No outline available'
}

**SEO Keywords:** ${strategy.contentPlan?.blog?.seoKeywords?.join(', ') || 'No keywords available'}  
**Call to Action:** ${strategy.contentPlan?.blog?.callToAction || 'No call to action available'}

## Social Media Content
${
  strategy.contentPlan?.socialMedia
    ?.map(
      (platform) =>
        `**${platform.platform.toUpperCase()}**\n- Best time to post: ${platform.bestTimeToPost}\n- Content Ideas:\n${platform.contentIdeas
          .map((idea) => `  - ${idea}`)
          .join('\n')}\n- Hashtags: ${platform.hashtagSuggestions.join(' ')}`
    )
    .join('\n\n') || 'No social media content available'
}

## Visual Content Ideas
**Infographics:**
${strategy.contentPlan?.visualContent?.infographicIdeas?.map((idea) => `- ${idea}`).join('\n') || '- No infographic ideas available'}

**Image Search Terms:** ${strategy.contentPlan?.visualContent?.imageSearchTerms?.join(', ') || 'No image search terms available'}

## Monetization Ideas
${strategy.monetizationIdeas?.map((idea) => `- ${idea}`).join('\n') || '- No monetization ideas available'}

## Competitive Analysis
**Content Gaps:** ${strategy.competitiveAnalysis?.gaps || 'No gaps identified'}
**Opportunities:** ${strategy.competitiveAnalysis?.opportunities || 'No opportunities identified'}
    `.trim()

    try {
      await navigator.clipboard.writeText(notesContent)
      toast({
        title: 'Notes Created!',
        description: 'The content strategy has been converted into notes and copied to clipboard.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create notes',
        description: 'Unable to convert strategy to notes. Please try again.',
      })
    }
  }

  const saveStrategy = async () => {
    if (!strategy) return

    try {
      // Ensure the strategy matches our schema
      const normalizedStrategy: ContentStrategy = {
        topic: strategy.topic,
        targetAudience: strategy.targetAudience,
        platforms: selectedPlatforms,
        keyInsights: strategy.keyInsights || [],
        contentPlan: strategy.contentPlan,
        monetization: strategy.monetizationIdeas || [],
        competitiveAnalysis: strategy.competitiveAnalysis
          ? {
              gaps: strategy.competitiveAnalysis.gaps,
              opportunities: Array.isArray(strategy.competitiveAnalysis.opportunities)
                ? strategy.competitiveAnalysis.opportunities
                : typeof strategy.competitiveAnalysis.opportunities === 'string'
                  ? [strategy.competitiveAnalysis.opportunities]
                  : [],
            }
          : undefined,
      }

      // Save the strategy using the new content strategies API
      createStrategy({
        title: `Content Strategy: ${strategy.topic}`,
        description: `Content strategy for ${strategy.targetAudience} focusing on ${strategy.topic}`,
        strategy: normalizedStrategy,
      })

      toast({
        title: 'Strategy Saved!',
        description: 'Your content strategy has been saved successfully.',
      })
    } catch (error) {
      console.error('Failed to save strategy:', error)
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Unable to save the strategy. Please try again.',
      })
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>AI Content Strategy Generator</span>
            <Link to="/content-strategy/saved">
              <Button variant="outline" size="sm">
                View Saved Strategies
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic">What topic do you want content for? *</Label>
              <Input
                id="topic"
                placeholder="e.g., Sustainable Fashion, AI in Healthcare, Remote Team Management"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="audience">Target Audience (optional)</Label>
              <Input
                id="audience"
                placeholder="e.g., Small Business Owners, Millennials, Tech Professionals"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Platforms</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform.id}
                      checked={selectedPlatforms.includes(platform.id)}
                      onCheckedChange={() => togglePlatform(platform.id)}
                    />
                    <Label htmlFor={platform.id} className="text-sm font-normal">
                      {platform.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={generateStrategy}
              disabled={loading || !topic}
              className="w-full"
            >
              {loading ? 'Generating Strategy...' : 'Generate Content Strategy'}
            </Button>
          </div>

          {loading ? (
            <ResultSkeleton />
          ) : (
            strategy && (
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Content Strategy for: {strategy.topic}</h2>
                  <p className="text-gray-500">Target Audience: {strategy.targetAudience}</p>
                </div>

                <Tabs defaultValue="insights" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="insights">Key Insights</TabsTrigger>
                    <TabsTrigger value="content">Content Plan</TabsTrigger>
                    <TabsTrigger value="monetization">Monetization</TabsTrigger>
                    <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="insights" className="p-4 border rounded-md mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">Key Insights</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            strategy.keyInsights
                              ?.map((insight: string) => `• ${insight}`)
                              .join('\n') || 'No insights available',
                            'Key insights'
                          )
                        }
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    {strategy.keyInsights && strategy.keyInsights.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {strategy.keyInsights.map((insight: string) => (
                          <li key={getUniqueId('insight', insight)}>{insight}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No key insights available</p>
                    )}
                  </TabsContent>

                  <TabsContent value="content" className="space-y-4 p-4 border rounded-md mt-2">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold">Blog Content</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              `${strategy.contentPlan?.blog?.title || 'No title'}\n\nOutline:\n${
                                strategy.contentPlan?.blog?.outline
                                  ?.map(
                                    (section: BlogSection) =>
                                      `${section.heading}: ${section.content}`
                                  )
                                  .join('\n') || 'No outline available'
                              }\n\nSEO Keywords: ${
                                strategy.contentPlan?.blog?.seoKeywords?.join(', ') || 'No keywords'
                              }`,
                              'Blog content plan'
                            )
                          }
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      {strategy.contentPlan?.blog ? (
                        <>
                          <h4 className="text-lg font-medium">{strategy.contentPlan.blog.title}</h4>
                          <p className="text-sm text-gray-500">
                            Suggested word count: {strategy.contentPlan.blog.wordCount}
                          </p>

                          <div className="mt-2">
                            <h5 className="font-medium">Outline:</h5>
                            {strategy.contentPlan.blog.outline &&
                            strategy.contentPlan.blog.outline.length > 0 ? (
                              <ol className="list-decimal pl-5 space-y-1">
                                {strategy.contentPlan.blog.outline.map((section: BlogSection) => (
                                  <li key={getUniqueId('section', section)}>
                                    <span className="font-medium">{section.heading}:</span>{' '}
                                    {section.content}
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="text-gray-500">No outline available</p>
                            )}
                          </div>

                          <div className="mt-2">
                            <h5 className="font-medium">SEO Keywords:</h5>
                            {strategy.contentPlan.blog.seoKeywords &&
                            strategy.contentPlan.blog.seoKeywords.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {strategy.contentPlan.blog.seoKeywords.map((keyword: string) => (
                                  <span
                                    key={getUniqueId('keyword', keyword)}
                                    className="bg-gray-100 px-2 py-1 rounded-md text-sm"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500">No SEO keywords available</p>
                            )}
                          </div>

                          <div className="mt-2">
                            <h5 className="font-medium">Call to Action:</h5>
                            <p className="text-sm">
                              {strategy.contentPlan.blog.callToAction ||
                                'No call to action available'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">No blog content available</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold">Social Media Content</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              strategy.contentPlan?.socialMedia
                                ?.map(
                                  (platform: SocialMediaPlatform) =>
                                    `${platform.platform.toUpperCase()}:\nContent Ideas:\n${platform.contentIdeas
                                      .map((idea: string) => `• ${idea}`)
                                      .join('\n')}\nHashtags: ${platform.hashtagSuggestions.join(
                                      ' '
                                    )}`
                                )
                                .join('\n\n') || 'No social media content available',
                              'Social media content'
                            )
                          }
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      {strategy.contentPlan?.socialMedia &&
                      strategy.contentPlan.socialMedia.length > 0 ? (
                        <div className="space-y-3">
                          {strategy.contentPlan.socialMedia.map((platform: SocialMediaPlatform) => (
                            <div
                              key={getUniqueId('platform', platform.platform)}
                              className="p-3 bg-gray-50 rounded-md"
                            >
                              <h4 className="font-medium capitalize">{platform.platform}</h4>
                              <p className="text-sm text-gray-500">
                                Best time to post: {platform.bestTimeToPost}
                              </p>

                              <div className="mt-2">
                                <h5 className="text-sm font-medium">Content Ideas:</h5>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                  {platform.contentIdeas.map((idea: string) => (
                                    <li key={getUniqueId(`idea-${platform.platform}`, idea)}>
                                      {idea}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="mt-2">
                                <h5 className="text-sm font-medium">Suggested Hashtags:</h5>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {platform.hashtagSuggestions.map((hashtag: string) => (
                                    <span
                                      key={getUniqueId(`hashtag-${platform.platform}`, hashtag)}
                                      className="bg-blue-100 px-2 py-0.5 rounded-md text-xs"
                                    >
                                      {hashtag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No social media content available</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold">Visual Content Ideas</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              `Infographic Ideas:\n${
                                strategy.contentPlan?.visualContent?.infographicIdeas
                                  ?.map((idea: string) => `• ${idea}`)
                                  .join('\n') || 'No infographic ideas'
                              }\n\nImage Search Terms: ${
                                strategy.contentPlan?.visualContent?.imageSearchTerms?.join(', ') ||
                                'No image search terms'
                              }`,
                              'Visual content ideas'
                            )
                          }
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      {strategy.contentPlan?.visualContent ? (
                        <div className="space-y-2">
                          <div>
                            <h5 className="text-sm font-medium">Infographic Ideas:</h5>
                            {strategy.contentPlan.visualContent.infographicIdeas &&
                            strategy.contentPlan.visualContent.infographicIdeas.length > 0 ? (
                              <ul className="list-disc pl-5 space-y-1 text-sm">
                                {strategy.contentPlan.visualContent.infographicIdeas.map(
                                  (idea: string) => (
                                    <li key={getUniqueId('infographic', idea)}>{idea}</li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <p className="text-gray-500 text-sm">
                                No infographic ideas available
                              </p>
                            )}
                          </div>

                          <div>
                            <h5 className="text-sm font-medium">Image Search Terms:</h5>
                            {strategy.contentPlan.visualContent.imageSearchTerms &&
                            strategy.contentPlan.visualContent.imageSearchTerms.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {strategy.contentPlan.visualContent.imageSearchTerms.map(
                                  (term: string) => (
                                    <span
                                      key={getUniqueId('imageTerm', term)}
                                      className="bg-gray-100 px-2 py-1 rounded-md text-sm"
                                    >
                                      {term}
                                    </span>
                                  )
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">
                                No image search terms available
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">No visual content available</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="monetization" className="p-4 border rounded-md mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">Monetization Ideas</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            strategy.monetizationIdeas
                              ?.map((idea: string) => `• ${idea}`)
                              .join('\n') || 'No monetization ideas available',
                            'Monetization ideas'
                          )
                        }
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    {strategy.monetizationIdeas && strategy.monetizationIdeas.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {strategy.monetizationIdeas.map((idea: string) => (
                          <li key={getUniqueId('monetization', idea)}>{idea}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No monetization ideas available</p>
                    )}
                  </TabsContent>

                  <TabsContent value="analysis" className="p-4 border rounded-md mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">Competitive Analysis</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            `Content Gaps: ${strategy.competitiveAnalysis?.gaps || 'No gaps identified'}\n\nOpportunities: ${strategy.competitiveAnalysis?.opportunities || 'No opportunities identified'}`,
                            'Competitive analysis'
                          )
                        }
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    {strategy.competitiveAnalysis ? (
                      <div className="space-y-2">
                        <div>
                          <h4 className="text-sm font-medium">Content Gaps:</h4>
                          <p>{strategy.competitiveAnalysis.gaps || 'No gaps identified'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Opportunities:</h4>
                          <p>
                            {strategy.competitiveAnalysis.opportunities ||
                              'No opportunities identified'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">No competitive analysis available</p>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="pt-4 border-t space-y-2">
                  <Button
                    onClick={saveStrategy}
                    variant="default"
                    className="w-full"
                    disabled={loading || isSaving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving Strategy...' : 'Save Strategy'}
                  </Button>
                  <Button onClick={copyFullStrategy} variant="outline" className="w-full">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Full Strategy
                  </Button>
                  <Button
                    onClick={createNotesFromStrategy}
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Convert to Notes
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
