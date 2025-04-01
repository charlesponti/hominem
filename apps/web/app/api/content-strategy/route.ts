import { google } from '@ai-sdk/google'
import { contentTools } from '@ponti/ai'
import { generateText } from 'ai'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { topic, audience, platforms } = body

    if (!topic) {
      return Response.json({ error: 'Missing required topic parameter' }, { status: 400 })
    }

    const result = await generateText({
      model: google('gemini-1.5-pro-latest'),
      tools: {
        content_generator: contentTools.content_generator,
      },
      system:
        'You are a professional content strategist who helps create comprehensive content plans tailored to specific topics and audiences.',
      messages: [
        {
          role: 'user',
          content: `Create a comprehensive content strategy for the topic "${topic}" targeting the audience "${audience}". Include the following elements:
          
          1. Key insights about the topic and audience.
          2. A detailed content plan including:
             - Blog post ideas with titles, outlines, word counts, SEO keywords, and CTAs.
             - Social media content ideas for platforms like ${platforms.join(', ')}.
             - Visual content ideas such as infographics and image search terms.
          3. Monetization ideas and competitive analysis.
          
          Ensure all content ideas are tailored to both the topic and audience.`,
        },
      ],
      maxSteps: 5,
    })

    const toolCall = result.response.messages.find((message) => message.role === 'tool')
    return Response.json(toolCall?.content[0].result)
  } catch (error) {
    console.error('Content Strategy API error:', error)
    return Response.json({ error: 'Failed to generate content strategy' }, { status: 500 })
  }
}
