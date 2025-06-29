import type { SearchResponse, SearchResult } from './types'

export async function performWebSearch(query: string): Promise<SearchResponse> {
  try {
    // Using tRPC HTTP format for utility functions
    const response = await fetch('/api/trpc/searchOperations.search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: { query, maxResults: 5 },
      }),
    })

    if (!response.ok) {
      throw new Error(`Search request failed: ${response.status}`)
    }

    const result = await response.json()

    // Handle tRPC response format
    if (result.result?.data) {
      const searchData = result.result.data as SearchResponse

      if (searchData.success && searchData.results) {
        const context = `Search results for "${searchData.query}":\n${searchData.results
          .map((r: SearchResult, i: number) => `${i + 1}. ${r.title}: ${r.snippet}`)
          .join('\n')}`

        return {
          success: true,
          query: searchData.query,
          results: searchData.results,
          context,
        }
      }

      return searchData
    }

    throw new Error('Invalid search response format')
  } catch (error) {
    return {
      success: false,
      query,
      results: [],
      error: error instanceof Error ? error.message : 'Search failed',
    }
  }
}
