import type React from 'react'
import SourceBadge from './SourceBadge'

interface Person {
  id: string
  firstName?: string
  lastName?: string
}

interface Activity {
  id: string
  date?: string
  time?: string
  title: string
  description?: string
  location?: string
  people?: Person[]
  tags?: string[]
  source?: 'manual' | 'google_calendar'
}

interface EventCardProps {
  activity: Activity
  onEditEvent: (activity: Activity) => void
}

const EventCard: React.FC<EventCardProps> = ({ activity, onEditEvent }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleEditEvent = () => {
    onEditEvent(activity)
  }

  return (
    <div
      className="grid grid-cols-[1fr_80px_50px] md:grid-cols-[100px_80px_1fr_120px_100px_50px] lg:grid-cols-[120px_100px_1fr_150px_120px_60px] gap-0 p-0 min-h-[60px] items-center group cursor-pointer transition-all duration-150 hover:bg-gray-50 animate-fade-in bg-card border-border"
      onClick={handleEditEvent}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleEditEvent()
        }
      }}
    >
      {/* Date Column */}
      <div className="event-table-cell event-col-date">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {formatDate(activity.date)}
          </span>
          {activity.time && (
            <span className="text-xs text-muted-foreground">
              {activity.time}
            </span>
          )}
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
            <h3
              className="text-sm font-semibold leading-snug text-foreground"
            >
              {activity.title}
            </h3>
            {activity.source && <SourceBadge source={activity.source} />}
          </div>
          {activity.description && activity.description !== activity.title && (
            <p
              className="text-xs leading-relaxed mt-1 line-clamp-2 text-muted-foreground"
            >
              {activity.description}
            </p>
          )}
          {/* Tags */}
          {activity.tags && activity.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {activity.tags
                .filter((tag) => tag.trim())
                .slice(0, 3)
                .map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              {activity.tags.filter((tag) => tag.trim()).length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{activity.tags.filter((tag) => tag.trim()).length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Location Column */}
      <div className="event-table-cell event-col-location hidden md:flex">
        {activity.location && (
          <div className="flex items-center gap-1">
            <span className="text-xs">📍</span>
            <span
              className="text-xs truncate text-muted-foreground"
              title={activity.location}
            >
              {activity.location}
            </span>
          </div>
        )}
      </div>

      {/* People Column */}
      <div className="event-table-cell event-col-people hidden md:flex">
        {activity.people && activity.people.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs">👥</span>
            <span
              className="text-xs truncate text-muted-foreground"
              title={activity.people
                .map((p) => `${p.firstName || ''} ${p.lastName || ''}`.trim())
                .join(', ')}
            >
              {activity.people.length === 1 && activity.people[0]
                ? `${activity.people[0].firstName || ''} ${activity.people[0].lastName || ''}`.trim()
                : `${activity.people.length} people`}
            </span>
          </div>
        )}
      </div>

      {/* Actions Column */}
      <div className="event-table-cell event-col-actions">
        <button
          type="button"
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-gray-100 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            handleEditEvent()
          }}
          aria-label="Edit event"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default EventCard
