import { env } from '../env.js'
import { getAuthToken } from '../utils/auth.utils.js'

export interface ContentItem {
  id: string
  type: 'note' | 'task' | 'timer' | 'journal' | 'document' | 'tweet'
  title?: string
  content: string
  tags: Array<{ value: string }>
  mentions: Array<{ id: string; name: string }>
  taskMetadata?: {
    status: 'todo' | 'in-progress' | 'done' | 'archived'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string | null
    startTime?: string
    firstStartTime?: string
    endTime?: string
    duration?: number
  }
  userId: string
  synced: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateContentData {
  type?: 'note' | 'task' | 'timer' | 'journal' | 'document' | 'tweet'
  title?: string
  content: string
  tags?: Array<{ value: string }>
  mentions?: Array<{ id: string; name: string }>
  taskMetadata?: {
    status?: 'todo' | 'in-progress' | 'done' | 'archived'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string | null
    startTime?: string
    firstStartTime?: string
    endTime?: string
    duration?: number
  }
}

export class ApiClient {
  private baseUrl: string
  private authToken?: string

  constructor(baseUrl?: string, authToken?: string) {
    this.baseUrl = baseUrl || env.API_URL

    // Try to get token from: 1) parameter, 2) env var, 3) config file
    if (authToken) {
      this.authToken = authToken
    } else if (env.AUTH_TOKEN) {
      this.authToken = env.AUTH_TOKEN
    } else {
      try {
        this.authToken = getAuthToken()
      } catch (error) {
        // No auth token available - API calls will fail for authenticated endpoints
        console.warn('No authentication token found. Run `hominem auth` to authenticate.')
      }
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    return response.json()
  }

  async createContent(data: CreateContentData): Promise<{ content: ContentItem }> {
    return this.request<{ content: ContentItem }>('/content', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async listContent(filters?: {
    types?: string[]
    query?: string
    tags?: string[]
    since?: string
  }): Promise<{ content: ContentItem[] }> {
    const params = new URLSearchParams()
    if (filters?.types) params.set('types', filters.types.join(','))
    if (filters?.query) params.set('query', filters.query)
    if (filters?.tags) params.set('tags', filters.tags.join(','))
    if (filters?.since) params.set('since', filters.since)

    const endpoint = `/content${params.toString() ? `?${params.toString()}` : ''}`
    return this.request<{ content: ContentItem[] }>(endpoint)
  }

  async getContent(id: string): Promise<{ content: ContentItem }> {
    return this.request<{ content: ContentItem }>(`/content/${id}`)
  }

  async updateContent(
    id: string,
    data: Partial<CreateContentData>
  ): Promise<{ content: ContentItem }> {
    return this.request<{ content: ContentItem }>(`/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteContent(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/content/${id}`, {
      method: 'DELETE',
    })
  }
}

// Create a default API client instance
export const apiClient = new ApiClient()
