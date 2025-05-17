'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRef, useState } from 'react'

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

// Define types for our content strategy
type BlogContent = {
  title: string
  outline: { heading: string; content: string }[]
  wordCount: number
  seoKeywords: string[]
  callToAction: string
}

type SocialMediaContent = {
  platform: string
  contentIdeas: string[]
  hashtagSuggestions: string[]
  bestTimeToPost: string
}

type VisualContent = {
  infographicIdeas: string[]
  imageSearchTerms: string[]
}

type ContentPlan = {
  blog: BlogContent
  socialMedia: SocialMediaContent[]
  visualContent: VisualContent
}

type ContentStrategy = {
  topic: string
  targetAudience: string
  keyInsights: string[]
  contentPlan: ContentPlan
  monetizationIdeas: string[]
  competitiveAnalysis: {
    gaps: string
    opportunities: string
  }
}

export default function ContentStrategyPage() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'blog',
    'twitter',
    'instagram',
  ])
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null)
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
      const response = await fetch('/api/content-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          audience: audience || undefined,
          platforms: selectedPlatforms.length ? selectedPlatforms : undefined,
        }),
      })

      const data = await response.json()
      setStrategy(data)
    } catch (error) {
      console.error('Failed to generate content strategy:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>AI Content Strategy Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic">What topic do you want content for?</Label>
              <Input
                id="topic"
                placeholder="e.g., Sustainable Fashion, AI in Healthcare, Remote Team Management"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="audience">Target Audience (optional)</Label>
              <Input
                id="audience"
                placeholder="e.g., Small Business Owners, Millennials, Tech Professionals"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
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
                    <Label htmlFor={platform.id}>{platform.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={generateStrategy} disabled={loading || !topic} className="w-full">
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
                    <h3 className="font-semibold mb-2">Key Insights</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {strategy.keyInsights.map((insight) => (
                        <li key={getUniqueId('insight', insight)}>{insight}</li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="content" className="space-y-4 p-4 border rounded-md mt-2">
                    <div>
                      <h3 className="font-semibold mb-2">Blog Content</h3>
                      <h4 className="text-lg font-medium">{strategy.contentPlan.blog.title}</h4>
                      <p className="text-sm text-gray-500">
                        Suggested word count: {strategy.contentPlan.blog.wordCount}
                      </p>

                      <div className="mt-2">
                        <h5 className="font-medium">Outline:</h5>
                        <ol className="list-decimal pl-5 space-y-1">
                          {strategy.contentPlan.blog.outline.map((section) => (
                            <li key={getUniqueId('section', section)}>
                              <span className="font-medium">{section.heading}:</span>{' '}
                              {section.content}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="mt-2">
                        <h5 className="font-medium">SEO Keywords:</h5>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {strategy.contentPlan.blog.seoKeywords.map((keyword) => (
                            <span
                              key={getUniqueId('keyword', keyword)}
                              className="bg-gray-100 px-2 py-1 rounded-md text-sm"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Social Media Content</h3>
                      <div className="space-y-3">
                        {strategy.contentPlan.socialMedia.map((platform) => (
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
                                {platform.contentIdeas.map((idea) => (
                                  <li key={getUniqueId(`idea-${platform.platform}`, idea)}>
                                    {idea}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="mt-2">
                              <h5 className="text-sm font-medium">Suggested Hashtags:</h5>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {platform.hashtagSuggestions.map((hashtag) => (
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
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Visual Content Ideas</h3>
                      <div className="space-y-2">
                        <div>
                          <h5 className="text-sm font-medium">Infographic Ideas:</h5>
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {strategy.contentPlan.visualContent.infographicIdeas.map((idea) => (
                              <li key={getUniqueId('infographic', idea)}>{idea}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="text-sm font-medium">Image Search Terms:</h5>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {strategy.contentPlan.visualContent.imageSearchTerms.map((term) => (
                              <span
                                key={getUniqueId('imageTerm', term)}
                                className="bg-gray-100 px-2 py-1 rounded-md text-sm"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="monetization" className="p-4 border rounded-md mt-2">
                    <h3 className="font-semibold mb-2">Monetization Ideas</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {strategy.monetizationIdeas.map((idea) => (
                        <li key={getUniqueId('monetization', idea)}>{idea}</li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="analysis" className="p-4 border rounded-md mt-2">
                    <h3 className="font-semibold mb-2">Competitive Analysis</h3>
                    <div className="space-y-2">
                      <div>
                        <h4 className="text-sm font-medium">Content Gaps:</h4>
                        <p>{strategy.competitiveAnalysis.gaps}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Opportunities:</h4>
                        <p>{strategy.competitiveAnalysis.opportunities}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="pt-4">
                  <Button
                    onClick={() => {
                      // Copy to clipboard functionality could be added here
                      alert('Content strategy copied to clipboard!')
                    }}
                    variant="outline"
                  >
                    Copy Full Strategy
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
