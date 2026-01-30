import * as activity from './activity.schema';
import * as auth from './auth.schema';
import * as bookmarks from './bookmarks.schema';
import * as calendar from './calendar.schema';
import * as career from './career.schema';
import * as categories from './categories.schema';
import * as chats from './chats.schema';
import * as company from './company.schema';
import * as contacts from './contacts.schema';
import * as content from './content.schema';
import * as documents from './documents.schema';
import * as finance from './finance.schema';
import * as goals from './goals.schema';
import * as health from './health.schema';
import * as interviews from './interviews.schema';
import * as items from './items.schema';
import * as lists from './lists.schema';
import * as movies from './movies.schema';
import * as music from './music.schema';
import * as networking_events from './networking_events.schema';
import * as notes from './notes.schema';
import * as places from './places.schema';
import * as possessions from './possessions.schema';
import * as shared from './shared.schema';
import * as skills from './skills.schema';
import * as surveys from './surveys.schema';
import * as tags from './tags.schema';
import * as travel from './travel.schema';
import * as trip_items from './trip_items.schema';
import * as trips from './trips.schema';
import * as users from './users.schema';
import * as vector_documents from './vector-documents.schema';

export const schema = {
  ...activity,
  ...auth,
  ...bookmarks,
  ...calendar,
  ...career,
  ...categories,
  ...chats,
  ...company,
  ...contacts,
  ...content,
  ...documents,
  ...finance,
  ...goals,
  ...health,
  ...interviews,
  ...items,
  ...lists,
  ...movies,
  ...music,
  ...networking_events,
  ...notes,
  ...places,
  ...possessions,
  ...shared,
  ...skills,
  ...surveys,
  ...tags,
  ...travel,
  ...trip_items,
  ...trips,
  ...users,
  ...vector_documents,
};

export default schema;
