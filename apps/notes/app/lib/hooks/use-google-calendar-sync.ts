import { useState } from 'react'

export interface CalendarSyncOptions {
  accessToken: string
  refreshToken?: string
  userId: string
  calendarId?: string
  timeMin?: string
  timeMax?: string
}

export interface CalendarSyncResult {
  success: boolean
  syncedEvents: number
  totalEvents: number
  events: unknown[]
  error?: string
}

export function useGoogleCalendarSync() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CalendarSyncResult | null>(null)

  const syncCalendar = async (options: CalendarSyncOptions) => {
    setIsLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('accessToken', options.accessToken)
    if (options.refreshToken) {
      formData.append('refreshToken', options.refreshToken)
    }
    formData.append('userId', options.userId)
    if (options.calendarId) {
      formData.append('calendarId', options.calendarId)
    }
    if (options.timeMin) {
      formData.append('timeMin', options.timeMin)
    }
    if (options.timeMax) {
      formData.append('timeMax', options.timeMax)
    }

    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          syncedEvents: data.syncedEvents,
          totalEvents: data.totalEvents,
          events: data.events,
        })
      }

      setResult({
        success: false,
        syncedEvents: 0,
        totalEvents: 0,
        events: [],
        error: data.error || 'Sync failed',
      })
    } catch (error) {
      setResult({
        success: false,
        syncedEvents: 0,
        totalEvents: 0,
        events: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getCalendars = async (accessToken: string, refreshToken?: string) => {
    const params = new URLSearchParams({ accessToken })
    if (refreshToken) {
      params.append('refreshToken', refreshToken)
    }

    try {
      const response = await fetch(`/api/calendar/sync?${params}`)
      const data = await response.json()

      if (response.ok) {
        return data.calendars
      }

      throw new Error(data.error || 'Failed to fetch calendars')
    } catch (error) {
      console.error('Error fetching calendars:', error)
      throw error
    }
  }

  return {
    syncCalendar,
    getCalendars,
    isLoading,
    result,
  }
}
