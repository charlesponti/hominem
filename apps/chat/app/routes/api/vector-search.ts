import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { HominemVectorStore } from '~/lib/services/vector.server'
import { jsonResponse } from '~/lib/utils/json-response'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const query = url.searchParams.get('query')
  const userId = url.searchParams.get('userId') // TODO: Get from authenticated session
  const limit = Number(url.searchParams.get('limit')) || 10
  const threshold = Number(url.searchParams.get('threshold')) || 0.7

  if (!query) {
    return jsonResponse({ error: 'Query parameter is required' }, { status: 400 })
  }

  try {
    const results = await HominemVectorStore.searchDocuments(
      query,
      userId || undefined,
      limit,
      threshold
    )

    return jsonResponse({
      success: true,
      query,
      results: results.results,
      count: results.results.length,
    })
  } catch (error) {
    console.error('Vector search error:', error)
    return jsonResponse(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const body = await request.json()
    const { content, userId, metadata = {}, title, source, sourceType } = body

    // TODO: Get userId from authenticated session instead of request body
    if (!content || !userId) {
      return jsonResponse({ error: 'Content and userId are required' }, { status: 400 })
    }

    // Add document to vector store
    const result = await HominemVectorStore.addDocument(content, userId, metadata, {
      title,
      source,
      sourceType,
    })

    if (result.success) {
      return jsonResponse({
        success: true,
        id: result.id,
        message: 'Document added to vector store',
      })
    }

    return jsonResponse({ error: 'Failed to add document to vector store' }, { status: 500 })
  } catch (error) {
    console.error('Add document error:', error)
    return jsonResponse(
      {
        error: 'Failed to add document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
