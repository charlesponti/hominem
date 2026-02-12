import { Button } from '@hominem/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card';
import { Label } from '@hominem/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';
import { Input } from '@hominem/ui/input';
import { AlertCircle, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { useGoogleCalendarSync } from '~/lib/hooks/use-google-calendar-sync';

interface CalendarSyncProps {
  userId: string;
  hasGoogleAccount: boolean;
}

export function CalendarSync({ userId, hasGoogleAccount }: CalendarSyncProps) {
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [calendars, setCalendars] = useState<Array<{ id: string; summary: string }>>([]);
  const [timeRange, setTimeRange] = useState({
    start: '',
    end: '',
  });
  const startDateId = useId();
  const endDateId = useId();
  const hasLoadedCalendars = useRef(false);

  const { syncCalendar, getCalendars, isLoading, syncResult, syncError } = useGoogleCalendarSync();

  const loadCalendars = useCallback(async () => {
    if (hasLoadedCalendars.current) {
      return;
    }
    try {
      hasLoadedCalendars.current = true;
      const calendarList = await getCalendars();
      setCalendars(Array.isArray(calendarList) ? calendarList : []);
    } catch (error) {
      console.error('Error loading calendars:', error);
      hasLoadedCalendars.current = false;
    }
  }, [getCalendars]);

  // Load available calendars when component mounts or when Google account is connected
  useEffect(() => {
    if (hasGoogleAccount) {
      if (!hasLoadedCalendars.current) {
        loadCalendars();
      }
    } else {
      // Reset when Google account is disconnected
      hasLoadedCalendars.current = false;
      setCalendars([]);
    }
  }, [hasGoogleAccount, loadCalendars]);

  const handleSync = async () => {
    if (!(hasGoogleAccount && userId)) {
      return;
    }

    await syncCalendar({
      calendarId: selectedCalendar,
      timeMin: timeRange.start || undefined,
      timeMax: timeRange.end || undefined,
    });
  };

  const setDefaultTimeRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setTimeRange({
      start: startOfMonth.toISOString().split('T')[0] ?? '',
      end: endOfMonth.toISOString().split('T')[0] ?? '',
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-5" />
          Google Calendar Sync
        </CardTitle>
        <CardDescription>Sync Google Calendar events to your calendar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasGoogleAccount ? (
          <div className="text-center py-8">
            <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Connect Google to enable calendar sync.</p>
            <Button
              className="mt-4"
              onClick={() => {
                window.location.href = `/auth/google?return_to=${encodeURIComponent(
                  window.location.pathname,
                )}`;
              }}
            >
              CONNECT GOOGLE
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
                  <Label htmlFor={startDateId}>Start Date</Label>
                  <Input
                    id={startDateId}
                    type="date"
                    value={timeRange.start}
                    onChange={(e) => setTimeRange((prev) => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor={endDateId}>End Date</Label>
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
                  THIS MONTH
                </Button>
                <Button
                  variant={!(timeRange.start || timeRange.end) ? 'default' : 'outline'}
                  onClick={() => setTimeRange({ start: '', end: '' })}
                >
                  ALL TIME
                </Button>
              </div>
            </div>

            <Button onClick={handleSync} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4" />
                  SYNCING
                </>
              ) : (
                <>
                  <Calendar className="mr-2 size-4" />
                  SYNC CALENDAR
                </>
              )}
            </Button>

            {syncResult || syncError ? (
              <div
                className="p-4 bg-muted border border-border"
              >
                <div className="flex items-center gap-2">
                  {syncResult && !syncError ? (
                    <CheckCircle className="size-5 text-foreground" />
                  ) : (
                    <AlertCircle className="size-5 text-muted-foreground" />
                  )}
                  <span
                    className="font-medium text-foreground"
                  >
                    {syncResult && !syncError ? 'SYNC COMPLETE' : 'SYNC FAILED'}
                  </span>
                </div>
                {syncResult && !syncError ? (
                  <p className="text-muted-foreground mt-1">{syncResult.message}</p>
                ) : (
                  <p className="text-muted-foreground mt-1">{syncError}</p>
                )}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
