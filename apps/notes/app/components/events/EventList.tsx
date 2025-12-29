import type React from 'react'
import EventCard from './EventCard'

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

interface EventListProps {
  activities: Activity[]
  loading: boolean
  onEditEvent: (activity: Activity) => void
}

const EventList: React.FC<EventListProps> = ({ activities, loading, onEditEvent }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-muted animate-pulse rounded"
          />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-medium mb-2">No events yet</h3>
        <p className="text-sm">Start adding events to track your life's memorable moments!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <EventCard key={activity.id} activity={activity} onEditEvent={onEditEvent} />
      ))}
    </div>
  )
}

export default EventList
