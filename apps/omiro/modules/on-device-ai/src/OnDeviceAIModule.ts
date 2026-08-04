import { requireNativeModule } from 'expo';

// Must stay in sync with the `code` values thrown by OnDeviceAIException in
// OnDeviceAIModule.swift — that's the only place these strings are otherwise
// defined, so a typo on either side would silently break routing.
export const OnDeviceAIErrorCode = {
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  MISSING_PERMISSION: 'MISSING_PERMISSION',
  GENERATION_FAILED: 'GENERATION_FAILED',
  INVALID_RECURRENCE_RULE: 'INVALID_RECURRENCE_RULE',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  CALENDAR_UNAVAILABLE: 'CALENDAR_UNAVAILABLE',
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  EVENT_READ_ONLY: 'EVENT_READ_ONLY',
} as const;

export type OnDeviceAIAvailability = 'available' | 'unavailable' | 'unsupported';

export type CalendarPermissionStatus = 'authorized' | 'denied' | 'notDetermined';

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  location: string | null;
  calendarTitle: string | null;
  notes: string | null;
  participants: string[];
  recurrenceDescription: string | null;
  isEditable: boolean;
}

export type CalendarEventPatch = {
  title?: string;
  startDate?: string;
  endDate?: string;
  location?: string | null;
  notes?: string | null;
};

export type CalendarRecurrenceScope = 'thisEvent' | 'futureEvents';

export interface OnDeviceAIResult {
  text: string;
  isOnDevice: true;
}

// Emitted throughout `askCalendar` — session start, prompt send, tool calls
// and results, and the final response — so the JS side can render the
// on-device processing steps as they happen instead of only the final text.
export interface OnDeviceAILogEvent {
  type: string;
  message: string;
  timestamp: number;
  durationMs?: number;
}

export type OnDeviceAIModuleType = {
  getAvailability(): Promise<OnDeviceAIAvailability>;
  getCalendarPermissions(): Promise<CalendarPermissionStatus>;
  requestCalendarPermissions(): Promise<CalendarPermissionStatus>;
  getCalendarEvents(startDate: string, endDate: string): Promise<CalendarEvent[]>;
  createCalendarEvent(
    title: string,
    startDate: string,
    endDate: string,
    location: string | null,
    recurrenceRule?: string | null,
  ): Promise<CalendarEvent>;
  getCalendarEvent(id: string): Promise<CalendarEvent>;
  updateCalendarEvent(
    id: string,
    patch: CalendarEventPatch,
    recurrenceScope: CalendarRecurrenceScope,
  ): Promise<CalendarEvent>;
  deleteCalendarEvent(id: string, recurrenceScope: CalendarRecurrenceScope): Promise<void>;
  askCalendar(prompt: string): Promise<OnDeviceAIResult>;
  addListener(
    eventName: 'onDeviceAILog',
    listener: (event: OnDeviceAILogEvent) => void,
  ): { remove: () => void };
};

export default requireNativeModule<OnDeviceAIModuleType>('OnDeviceAI');
