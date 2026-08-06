import {
  listTripHistory,
  listUpcomingCalendarEvents,
  searchCalendarEvents,
} from '../../application/calendar.service';
import {
  calendarSearchInputSchema,
  calendarSearchOutputSchema,
  calendarUpcomingInputSchema,
  calendarUpcomingOutputSchema,
  tripHistoryInputSchema,
  tripHistoryOutputSchema,
} from '../../schemas/calendar.schema';
import { registerTool } from '../tools';

registerTool(
  {
    name: 'calendar_search',
    title: 'Search calendar events',
    description: 'Searches calendar events by title/description text, with optional date range.',
    inputSchema: calendarSearchInputSchema,
    outputSchema: calendarSearchOutputSchema,
    readOnly: true,
    scopes: ['calendar:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => searchCalendarEvents(ownerUserId, input),
);

registerTool(
  {
    name: 'calendar_upcoming',
    title: 'List upcoming calendar events',
    description:
      'Lists non-cancelled calendar events in a bounded window starting now (or a given date).',
    inputSchema: calendarUpcomingInputSchema,
    outputSchema: calendarUpcomingOutputSchema,
    readOnly: true,
    scopes: ['calendar:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => listUpcomingCalendarEvents(ownerUserId, input),
);

registerTool(
  {
    name: 'trip_history',
    title: 'Trip history',
    description: 'Lists past and upcoming trips, newest first, with attendee names.',
    inputSchema: tripHistoryInputSchema,
    outputSchema: tripHistoryOutputSchema,
    readOnly: true,
    scopes: ['travel:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => listTripHistory(ownerUserId, input),
);
