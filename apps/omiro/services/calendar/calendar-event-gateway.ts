import { E2E_TESTING } from '~/constants';
import OnDeviceAIModule, {
  type CalendarEvent,
  type CalendarEventPatch,
  type CalendarPermissionStatus,
  type CalendarRecurrenceScope,
  type OnDeviceAIResult,
} from '~/modules/on-device-ai';

import { timeFixtureGateway } from './calendar-event-gateway.fixture';

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

export const calendarEventGateway = E2E_TESTING
  ? timeFixtureGateway
  : productionCalendarEventGateway;
