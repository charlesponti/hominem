import type { ContentStrategiesSelect } from '@hominem/utils/schema'
import { useCallback, useState } from 'react'
import { useToast } from '~/components/ui/use-toast'
import {
  generateBlogContentPlanText,
  generateCompetitiveAnalysisText,
  generateFullStrategyText,
  generateKeyInsightsText,
  generateMonetizationIdeasText,
} from '~/lib/content/strategy-text-generator'

export function useCopyStrategy(strategy: ContentStrategiesSelect | null) {
  const { toast } = useToast()
  const [copiedSections, setCopiedSections] = useState<Set<string>>(new Set())

  const copyToClipboard = useCallback(
    async (text: string, sectionName: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopiedSections((prev) => new Set(prev).add(sectionName))
        toast({
          title: 'Copied!',
          description: `${sectionName} copied to clipboard`,
        })

        // Remove from copied set after 2 seconds
        setTimeout(() => {
          setCopiedSections((prev) => {
            const newSet = new Set(prev)
            newSet.delete(sectionName)
            return newSet
          })
        }, 2000)
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Copy failed',
          description: 'Failed to copy to clipboard',
        })
      }
    },
    [toast]
  )

  const copyFullStrategy = useCallback(async () => {
    if (!strategy) return
    const fullStrategyText = generateFullStrategyText(strategy)
    await copyToClipboard(fullStrategyText, 'Full strategy')
  }, [strategy, copyToClipboard])

  const copyKeyInsights = useCallback(() => {
    if (!strategy) return
    const insightsText = generateKeyInsightsText(strategy)
    if (insightsText) {
      copyToClipboard(insightsText, 'Key insights')
    }
  }, [strategy, copyToClipboard])

  const copyBlogContentPlan = useCallback(() => {
    if (!strategy) return
    const blogText = generateBlogContentPlanText(strategy)
    if (blogText) {
      copyToClipboard(blogText, 'Blog content plan')
    }
  }, [strategy, copyToClipboard])

  const copyMonetizationIdeas = useCallback(() => {
    if (!strategy) return
    const monetizationText = generateMonetizationIdeasText(strategy)
    if (monetizationText) {
      copyToClipboard(monetizationText, 'Monetization ideas')
    }
  }, [strategy, copyToClipboard])

  const copyCompetitiveAnalysis = useCallback(() => {
    if (!strategy) return
    const analysisText = generateCompetitiveAnalysisText(strategy)
    if (analysisText) {
      copyToClipboard(analysisText, 'Competitive analysis')
    }
  }, [strategy, copyToClipboard])

  return {
    copiedSections,
    copyFullStrategy,
    copyKeyInsights,
    copyBlogContentPlan,
    copyMonetizationIdeas,
    copyCompetitiveAnalysis,
  }
}
