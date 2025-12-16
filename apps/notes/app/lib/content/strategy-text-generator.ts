import type { ContentStrategiesSelect } from '@hominem/data/schema'

export function generateFullStrategyText(strategy: ContentStrategiesSelect) {
  const sections = [
    generateHeader(strategy),
    generateStrategyDetails(strategy),
    generateKeyInsights(strategy),
    generateBlogContentPlan(strategy),
    generateMonetizationIdeas(strategy),
    generateCompetitiveAnalysis(strategy),
  ]

  return sections.filter(Boolean).join('\n\n')
}

function generateHeader(strategy: ContentStrategiesSelect) {
  return `# Content Strategy: ${strategy.title}`
}

function generateStrategyDetails(strategy: ContentStrategiesSelect) {
  const createdDate = strategy.createdAt
    ? new Date(strategy.createdAt).toLocaleDateString()
    : 'Unknown date'

  return `## Strategy Details
- **Topic:** ${strategy.strategy.topic}
- **Target Audience:** ${strategy.strategy.targetAudience}
- **Platforms:** ${strategy.strategy.platforms?.join(', ') || 'No platforms'}
- **Created:** ${createdDate}`
}

function generateKeyInsights(strategy: ContentStrategiesSelect) {
  if (!strategy.strategy.keyInsights || strategy.strategy.keyInsights.length === 0) {
    return null
  }

  const insights = strategy.strategy.keyInsights.map((insight) => `• ${insight}`).join('\n')

  return `## Key Insights
${insights}`
}

function generateBlogContentPlan(strategy: ContentStrategiesSelect) {
  const blog = strategy.strategy.contentPlan?.blog
  if (!blog) {
    return null
  }

  const outline =
    blog.outline
      ?.map((section, index) => `${index + 1}. **${section.heading}:** ${section.content}`)
      .join('\n') || 'No outline available'

  return `## Blog Content Plan
**Title:** ${blog.title}
**Word Count:** ${blog.wordCount}

### Outline:
${outline}

**SEO Keywords:** ${blog.seoKeywords?.join(', ') || 'No keywords'}
**Call to Action:** ${blog.callToAction || 'No CTA'}`
}

function generateMonetizationIdeas(strategy: ContentStrategiesSelect) {
  if (!strategy.strategy.monetization || strategy.strategy.monetization.length === 0) {
    return null
  }

  const ideas = strategy.strategy.monetization.map((idea) => `• ${idea}`).join('\n')

  return `## Monetization Ideas
${ideas}`
}

function generateCompetitiveAnalysis(strategy: ContentStrategiesSelect) {
  const analysis = strategy.strategy.competitiveAnalysis
  if (!analysis) {
    return null
  }

  const opportunities = Array.isArray(analysis.opportunities)
    ? analysis.opportunities.join(', ')
    : analysis.opportunities

  return `## Competitive Analysis
**Content Gaps:** ${analysis.gaps || 'No gaps identified'}
**Opportunities:** ${opportunities || 'No opportunities identified'}`
}

export function generateKeyInsightsText(strategy: ContentStrategiesSelect) {
  if (!strategy.strategy.keyInsights || strategy.strategy.keyInsights.length === 0) {
    return ''
  }
  return strategy.strategy.keyInsights.map((insight) => `• ${insight}`).join('\n')
}

export function generateBlogContentPlanText(strategy: ContentStrategiesSelect) {
  const blog = strategy.strategy.contentPlan?.blog
  if (!blog) return ''

  const outline =
    blog.outline
      ?.map((section, index) => `${index + 1}. ${section.heading}: ${section.content}`)
      .join('\n') || 'No outline available'

  return [
    `Title: ${blog.title}`,
    `Word Count: ${blog.wordCount}`,
    `Outline:\n${outline}`,
    `SEO Keywords: ${blog.seoKeywords?.join(', ') || 'No keywords'}`,
    `Call to Action: ${blog.callToAction || 'No CTA'}`,
  ].join('\n')
}

export function generateMonetizationIdeasText(strategy: ContentStrategiesSelect) {
  if (!strategy.strategy.monetization || strategy.strategy.monetization.length === 0) {
    return ''
  }
  return strategy.strategy.monetization.map((idea) => `• ${idea}`).join('\n')
}

export function generateCompetitiveAnalysisText(strategy: ContentStrategiesSelect) {
  const analysis = strategy.strategy.competitiveAnalysis
  if (!analysis) return ''

  const opportunities = Array.isArray(analysis.opportunities)
    ? analysis.opportunities.join(', ')
    : analysis.opportunities

  return `Content Gaps: ${analysis.gaps || 'No gaps identified'}\n\nOpportunities: ${opportunities || 'No opportunities identified'}`
}
