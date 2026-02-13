import { ValidationError, InternalError } from '@hominem/services';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  score?: number;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  summary?: string;
  error?: string;
}

const searchSchema = z.object({
  query: z.string(),
  maxResults: z.number().optional().default(10),
});

async function performWebSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    // Simple implementation using DuckDuckGo's search results
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'ChatApp/1.0 (Educational Purpose)',
      },
    });

    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      Abstract: string;
      AbstractURL: string;
      Heading: string;
      RelatedTopics: {
        Text: string;
        FirstURL: string;
      }[];
    };

    const results: SearchResult[] = [];

    // Add instant answer if available
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Instant Answer',
        url: data.AbstractURL || '#',
        snippet: data.Abstract,
        score: 1.0,
      });
    }

    // Add related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      interface Topic {
        Text?: string;
        FirstURL?: string;
      }

      const topicsToProcess = data.RelatedTopics.slice(0, maxResults - results.length);
      for (const topic of topicsToProcess as Topic[]) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            url: topic.FirstURL,
            snippet: topic.Text,
            score: 0.8,
          });
        }
      }
    }

    // If we don't have enough results, add some fallback search results
    if (results.length === 0) {
      return getFallbackSearchResults(query);
    }

    return results.slice(0, maxResults);
  } catch (err) {
    console.warn('DuckDuckGo search failed, using fallback:', err);
    return getFallbackSearchResults(query);
  }
}

function getFallbackSearchResults(query: string): SearchResult[] {
  return [
    {
      title: `Search results for "${query}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      snippet: `I apologize, but I'm unable to perform a web search at the moment. You can search for "${query}" using the link above.`,
      score: 0.5,
    },
  ];
}

function generateSearchSummary(results: SearchResult[]) {
  if (results.length === 0) {
    return 'No search results found.';
  }

  const topResults = results.slice(0, 3);
  const snippets = topResults.map((result) => result.snippet).join(' ');

  return `Found ${results.length} search results. Key information: ${snippets.substring(0, 300)}${snippets.length > 300 ? '...' : ''}`;
}

export const searchRoutes = new Hono<AppContext>()
  // Web search
  .post('/', authMiddleware, async (c) => {
    try {
      const body = await c.req.json();
      const parsed = searchSchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError(parsed.error?.issues[0]?.message ?? 'Validation failed');
      }

      const { query, maxResults } = parsed.data;

      if (!query || typeof query !== 'string') {
        throw new ValidationError('Search query is required');
      }

      const searchResults = await performWebSearch(query, maxResults);

      return c.json({
        success: true,
        query,
        results: searchResults,
        summary: generateSearchSummary(searchResults),
      } as SearchResponse);
    } catch (err) {
      console.error('[search] error:', err);
      throw new InternalError(err instanceof Error ? err.message : 'Search failed');
    }
  });
