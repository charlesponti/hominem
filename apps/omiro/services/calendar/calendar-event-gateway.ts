import { E2E_TESTING } from '~/constants';
import OnDeviceAIModule, {
  type CalendarEvent,
  type CalendarEventPatch,
  type CalendarPermissionStatus,
  type CalendarRecurrenceScope,
  type OnDeviceAIResult,
} from '~/modules/on-device-ai';

export interface CalendarEventGateway {
  askSchedule: (prompt: string) => Promise<OnDeviceAIResult>;
  createEvent: (
    title: string,
    startDate: string,
    endDate: string,
    location: string | null,
    recurrenceRule?: string | null,
  ) => Promise<CalendarEvent>;
  deleteEvent: (id: string, recurrenceScope: CalendarRecurrenceScope) => Promise<void>;
  getEvent: (id: string) => Promise<CalendarEvent>;
  getPermission: () => Promise<CalendarPermissionStatus>;
  listEvents: (startDate: string, endDate: string) => Promise<CalendarEvent[]>;
  requestPermission: () => Promise<CalendarPermissionStatus>;
  updateEvent: (
    id: string,
    patch: CalendarEventPatch,
    recurrenceScope: CalendarRecurrenceScope,
  ) => Promise<CalendarEvent>;
}

const productionCalendarEventGateway: CalendarEventGateway = {
  askSchedule: (prompt) => OnDeviceAIModule.askCalendar(prompt),
  createEvent: (title, startDate, endDate, location, recurrenceRule) =>
    OnDeviceAIModule.createCalendarEvent(title, startDate, endDate, location, recurrenceRule),
  deleteEvent: (id, recurrenceScope) => OnDeviceAIModule.deleteCalendarEvent(id, recurrenceScope),
  getEvent: (id) => OnDeviceAIModule.getCalendarEvent(id),
  getPermission: () => OnDeviceAIModule.getCalendarPermissions(),
  listEvents: (startDate, endDate) => OnDeviceAIModule.getCalendarEvents(startDate, endDate),
  requestPermission: () => OnDeviceAIModule.requestCalendarPermissions(),
  updateEvent: (id, patch, recurrenceScope) =>
    OnDeviceAIModule.updateCalendarEvent(id, patch, recurrenceScope),
};

let resolvedGateway: CalendarEventGateway | null = null;

// E2E_TESTING only flips true in e2e builds; keep the ~125-line mock-data
// fixture out of the production bundle by loading it lazily instead of
// importing it statically at module scope.
async function resolveGateway(): Promise<CalendarEventGateway> {
  if (resolvedGateway) return resolvedGateway;
  if (E2E_TESTING) {
    const { timeFixtureGateway } = await import('./calendar-event-gateway.fixture');
    resolvedGateway = timeFixtureGateway;
  } else {
    resolvedGateway = productionCalendarEventGateway;
  }
  return resolvedGateway;
}

export const calendarEventGateway: CalendarEventGateway = {
  askSchedule: async (prompt) => (await resolveGateway()).askSchedule(prompt),
  createEvent: async (title, startDate, endDate, location, recurrenceRule) =>
    (await resolveGateway()).createEvent(title, startDate, endDate, location, recurrenceRule),
  deleteEvent: async (id, recurrenceScope) =>
    (await resolveGateway()).deleteEvent(id, recurrenceScope),
  getEvent: async (id) => (await resolveGateway()).getEvent(id),
  getPermission: async () => (await resolveGateway()).getPermission(),
  listEvents: async (startDate, endDate) => (await resolveGateway()).listEvents(startDate, endDate),
  requestPermission: async () => (await resolveGateway()).requestPermission(),
  updateEvent: async (id, patch, recurrenceScope) =>
    (await resolveGateway()).updateEvent(id, patch, recurrenceScope),
};
