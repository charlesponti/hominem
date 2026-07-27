import type {
  CalendarEvent,
  CalendarEventPatch,
  CalendarPermissionStatus,
  CalendarRecurrenceScope,
  OnDeviceAIResult,
} from '~/modules/on-device-ai';

import type { TimeEventGateway } from './time-event-gateway';

export type TimeFixtureScenario = 'authorized' | 'denied' | 'error' | 'loading' | 'notDetermined';

const fixtureEvents: CalendarEvent[] = [
  {
    calendarTitle: 'Omiro test calendar',
    endDate: '2026-07-28T10:00:00.000Z',
    id: 'time-fixture-editable',
    isAllDay: false,
    isEditable: true,
    location: 'Studio',
    notes: null,
    participants: ['Avery'],
    recurrenceDescription: null,
    startDate: '2026-07-28T09:00:00.000Z',
    title: 'Fixture planning',
  },
  {
    calendarTitle: 'Read-only calendar',
    endDate: '2026-07-29T14:00:00.000Z',
    id: 'time-fixture-read-only',
    isAllDay: false,
    isEditable: false,
    location: null,
    notes: 'Managed by another account',
    participants: [],
    recurrenceDescription: 'Every week',
    startDate: '2026-07-29T13:00:00.000Z',
    title: 'Fixture recurring read-only',
  },
];

let scenario: TimeFixtureScenario = 'authorized';

export function setTimeFixtureScenario(nextScenario: TimeFixtureScenario) {
  scenario = nextScenario;
}

function permission(): CalendarPermissionStatus {
  if (scenario === 'denied') return 'denied';
  if (scenario === 'notDetermined') return 'notDetermined';
  return 'authorized';
}

async function maybeFail() {
  if (scenario === 'error') throw new Error('Fixture Calendar request failed.');
  if (scenario === 'loading') await new Promise((resolve) => setTimeout(resolve, 750));
}

export const timeFixtureGateway: TimeEventGateway = {
  askSchedule: async (prompt): Promise<OnDeviceAIResult> => {
    await maybeFail();
    return { isOnDevice: true, text: `Fixture answer for ${prompt}` };
  },
  createEvent: async (title, startDate, endDate, location): Promise<CalendarEvent> => {
    await maybeFail();
    const created = {
      ...fixtureEvents[0],
      endDate,
      id: `time-fixture-created-${fixtureEvents.length}`,
      location,
      startDate,
      title,
    };
    fixtureEvents.push(created);
    return created;
  },
  deleteEvent: async (id: string, _scope: CalendarRecurrenceScope): Promise<void> => {
    await maybeFail();
    const index = fixtureEvents.findIndex((event) => event.id === id);
    if (index >= 0) fixtureEvents.splice(index, 1);
  },
  getEvent: async (id: string): Promise<CalendarEvent> => {
    await maybeFail();
    const event = fixtureEvents.find((candidate) => candidate.id === id);
    if (!event) throw new Error('Fixture event not found.');
    return event;
  },
  getPermission: async () => permission(),
  listEvents: async (startDate: string, endDate: string): Promise<CalendarEvent[]> => {
    await maybeFail();
    return fixtureEvents.filter((event) => event.startDate < endDate && event.endDate > startDate);
  },
  requestPermission: async () => {
    scenario = 'authorized';
    return permission();
  },
  updateEvent: async (
    id: string,
    patch: CalendarEventPatch,
    _scope: CalendarRecurrenceScope,
  ): Promise<CalendarEvent> => {
    await maybeFail();
    const index = fixtureEvents.findIndex((event) => event.id === id);
    if (index < 0) throw new Error('Fixture event not found.');
    fixtureEvents[index] = { ...fixtureEvents[index], ...patch };
    return fixtureEvents[index];
  },
};
