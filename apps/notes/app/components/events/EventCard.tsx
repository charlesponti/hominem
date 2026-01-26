import type { Person } from '@hominem/hono-rpc/types';
import type React from 'react';

import { Button } from '@hominem/ui/components/ui/button';
import { MapPinIcon, PencilIcon, UsersIcon } from 'lucide-react';
import { useMemo } from 'react';

import SourceBadge from './SourceBadge';

interface Activity {
  id: string;
  date?: string;
  time?: string;
  title: string;
  description?: string;
  location?: string;
  people?: Person[];
  tags?: string[];
  source?: 'manual' | 'google_calendar';
}

interface EventCardProps {
  activity: Activity;
  onEditEvent: (activity: Activity) => void;
}

const EventCard: React.FC<EventCardProps> = ({ activity, onEditEvent }) => {
  const peopleNames = useMemo(
    () =>
      activity.people
        ?.map((p) => `${p.firstName} ${p.lastName}`)
        .join(', ')
        .trim(),
    [activity.people],
  );
  const tags = useMemo(
    () => activity.tags?.filter((tag) => tag.trim()).slice(0, 3),
    [activity.tags],
  );
  const tagCount = useMemo(() => tags?.length ?? 0, [tags]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEditEvent = () => {
    onEditEvent(activity);
  };

  return (
    <div
      className="grid grid-cols-[1fr_80px_50px] md:grid-cols-[100px_80px_1fr_120px_100px_50px] lg:grid-cols-[120px_100px_1fr_150px_120px_60px] gap-0 p-0 min-h-[60px] items-center group cursor-pointer hover:bg-gray-50"
      onClick={handleEditEvent}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleEditEvent();
        }
      }}
    >
      {/* Date Column */}
      <div className="event-table-cell event-col-date">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{formatDate(activity.date)}</span>
          {activity.time && <span className="text-xs text-muted-foreground">{activity.time}</span>}
        </div>
      </div>

      {/* Type Column */}
      <div className="event-table-cell event-col-type">
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-transform duration-150 group-hover:scale-105">
          Event
        </span>
      </div>

      {/* Event Title Column */}
      <div className="event-table-cell event-col-title">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug text-foreground">{activity.title}</h3>
            {activity.source && <SourceBadge source={activity.source} />}
          </div>

          {activity.description ? (
            <p className="text-xs leading-relaxed mt-1 line-clamp-2 text-muted-foreground">
              {activity.description}
            </p>
          ) : null}

          {/* Tags */}
          {tagCount > 0 && tags ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              )) || null}
              {tagCount > 3 && (
                <span className="text-xs text-muted-foreground">+{tagCount - 3}</span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Location Column */}
      <div className="event-table-cell event-col-location hidden md:flex">
        {activity.location && (
          <p className="flex items-center gap-1">
            <MapPinIcon className="size-4" />
            <span className="text-xs truncate text-muted-foreground" title={activity.location}>
              {activity.location}
            </span>
          </p>
        )}
      </div>

      {/* People Column */}
      <div className="event-table-cell event-col-people hidden md:flex">
        {peopleNames && (
          <div className="flex items-center gap-1">
            <UsersIcon className="size-4" />
            <span className="text-xs truncate" title={peopleNames}>
              {peopleNames}
            </span>
          </div>
        )}
      </div>

      {/* Actions Column */}
      <div className="event-table-cell event-col-actions">
        <Button variant="ghost" size="icon" onClick={handleEditEvent} aria-label="Edit event">
          <PencilIcon className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};

export default EventCard;
