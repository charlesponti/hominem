import type { SearchResponse, SearchResult } from './types.js'

export async function performWebSearch(query: string): Promise<SearchResponse> {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults: 5 }),
    })

    const result = (await response.json()) as SearchResponse

    if (result.success) {
      const context = `Search results for "${result.query}":\n${result.results
        .map((r: SearchResult, i: number) => `${i + 1}. ${r.title}: ${r.snippet}`)
        .join('\n')}`

      return {
        success: true,
        query: result.query,
        results: result.results,
        context,
      }
    }

    return result
  } catch (error) {
    return {
      success: false,
      query,
      results: [],
      error: error instanceof Error ? error.message : 'Search failed',
    }
  }
}
