import { events } from './schema/calendar.schema';
import { type InferSelectModel } from 'drizzle-orm';

type Event = InferSelectModel<typeof events>;

// This function checks if properties exist on the type
function checkEvent(e: Event) {
  const c: string = e.createdAt;
  const u: string = e.updatedAt;
  return c + u;
}
