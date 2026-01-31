import type { PeopleListOutput } from '@hominem/hono-rpc/types';
import type React from 'react';

import { List } from '@hominem/ui/list';

import EventCard from './EventCard';

type Person = PeopleListOutput[number];

export interface Activity {
  id: string;
  date?: string | undefined;
  time?: string | undefined;
  title: string;
  description?: string | undefined;
  location?: string | undefined;
  people?: Person[] | undefined;
  tags?: string[] | undefined;
  source?: 'manual' | 'google_calendar' | undefined;
}

interface EventListProps {
  activities: Activity[];
  loading: boolean;
  onEditEvent: (activity: Activity) => void;
}

const EventList: React.FC<EventListProps> = ({ activities, loading, onEditEvent }) => {
  if (activities.length === 0 && !loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-medium mb-2">No events yet</h3>
        <p className="text-sm">Start adding events to track your life's memorable moments!</p>
      </div>
    );
  }

  return (
    <List isLoading={loading} loadingSize="lg">
      {activities.map((activity) => (
        <li key={activity.id} className="px-2">
          <EventCard activity={activity} onEditEvent={onEditEvent} />
        </li>
      ))}
    </List>
  );
};

export default EventList;
