import type React from 'react'

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
}

interface StatsDisplayProps {
  activities: Activity[]
  loading: boolean
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ activities, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['total', 'month', 'people', 'tags'].map((type) => (
          <div key={`skeleton-${type}`} className="h-20 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  const totalEvents = activities.length
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const thisMonthEvents = activities.filter((activity) => {
    if (!activity.date) return false
    const eventDate = new Date(activity.date)
    return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear
  }).length

  const uniquePeople = new Set(
    activities.flatMap((activity) => activity.people || []).map((person) => person.id)
  ).size

  const uniqueTags = new Set(
    activities.flatMap((activity) => activity.tags || []).filter((tag) => tag.trim())
  ).size

  const stats = [
    {
      label: 'Total Events',
      value: totalEvents,
      icon: '📅',
    },
    {
      label: 'This Month',
      value: thisMonthEvents,
      icon: '📆',
    },
    {
      label: 'People',
      value: uniquePeople,
      icon: '👥',
    },
    {
      label: 'Tags',
      value: uniqueTags,
      icon: '🏷️',
    },
  ]

  return (
    <>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-5 rounded-lg border backdrop-blur-sm bg-card border-border"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xl opacity-80">{stat.icon}</span>
            <span className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</span>
          </div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {stat.label}
          </div>
        </div>
      ))}
    </>
  )
}

export default StatsDisplay
