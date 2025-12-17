import { Button } from '@hominem/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card'
import { Input } from '@hominem/ui/input'
import { Label } from '@hominem/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select'
import { AlertCircle, Calendar, CheckCircle, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { useGoogleCalendarSync } from '~/lib/hooks/use-google-calendar-sync'

interface CalendarSyncProps {
  userId: string
  googleTokens?: { access_token: string; refresh_token: string }[]
}

export function CalendarSync({ userId, googleTokens }: CalendarSyncProps) {
  const googleToken = googleTokens?.[0]
  const accessToken = googleToken?.access_token || ''
  const refreshToken = googleToken?.refresh_token || ''

  const [selectedCalendar, setSelectedCalendar] = useState('primary')
  const [calendars, setCalendars] = useState<Array<{ id: string; summary: string }>>([])
  const [timeRange, setTimeRange] = useState({
    start: '',
    end: '',
  })
  const startDateId = useId()
  const endDateId = useId()

  const { syncCalendar, getCalendars, isLoading, result } = useGoogleCalendarSync()

  const loadCalendars = useCallback(async () => {
    try {
      const calendarList = await getCalendars(accessToken, refreshToken)
      setCalendars(calendarList)
    } catch (error) {
      console.error('Error loading calendars:', error)
    }
  }, [accessToken, refreshToken, getCalendars])

  // Load available calendars when access token is available
  useEffect(() => {
    if (accessToken) {
      loadCalendars()
    }
  }, [accessToken, loadCalendars])

  const handleSync = async () => {
    if (!accessToken || !userId) {
      return
    }

    await syncCalendar({
      accessToken,
      refreshToken,
      userId,
      calendarId: selectedCalendar,
      timeMin: timeRange.start || undefined,
      timeMax: timeRange.end || undefined,
    })
  }

  const setDefaultTimeRange = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setTimeRange({
      start: startOfMonth.toISOString().split('T')[0],
      end: endOfMonth.toISOString().split('T')[0],
    })
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Sync
        </CardTitle>
        <CardDescription>
          Sync your Google Calendar events to your personal calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!accessToken ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Please connect your Google account first to sync calendar events.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                window.location.href = `/auth/google?return_to=${encodeURIComponent(
                  window.location.pathname
                )}`
              }}
            >
              Connect Google Account
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="calendar">Select Calendar</Label>
                <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.summary}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={startDateId}>Start Date (Optional)</Label>
                  <Input
                    id={startDateId}
                    type="date"
                    value={timeRange.start}
                    onChange={(e) => setTimeRange((prev) => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor={endDateId}>End Date (Optional)</Label>
                  <Input
                    id={endDateId}
                    type="date"
                    value={timeRange.end}
                    onChange={(e) => setTimeRange((prev) => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={
                    timeRange.start &&
                    timeRange.end &&
                    timeRange.start ===
                      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        .toISOString()
                        .split('T')[0] &&
                    timeRange.end ===
                      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
                        .toISOString()
                        .split('T')[0]
                      ? 'default'
                      : 'outline'
                  }
                  onClick={setDefaultTimeRange}
                >
                  This Month
                </Button>
                <Button
                  variant={!timeRange.start && !timeRange.end ? 'default' : 'outline'}
                  onClick={() => setTimeRange({ start: '', end: '' })}
                >
                  All Time
                </Button>
              </div>
            </div>

            <Button onClick={handleSync} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Sync Calendar
                </>
              )}
            </Button>

            {result && (
              <div
                className={`p-4 rounded-lg ${
                  result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}
                  >
                    {result.success ? 'Sync Successful!' : 'Sync Failed'}
                  </span>
                </div>
                {result.success ? (
                  <p className="text-green-700 mt-1">
                    Synced {result.syncedEvents} of {result.totalEvents} events
                  </p>
                ) : (
                  <p className="text-red-700 mt-1">{result.error}</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
