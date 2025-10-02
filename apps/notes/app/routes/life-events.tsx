import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getServerSession } from '~/lib/supabase/server'
import { createServerTRPCClient } from '~/lib/trpc-server'
import EventForm from '../components/life-events/EventForm'
import EventList from '../components/life-events/EventList'
import FiltersSection from '../components/life-events/FiltersSection'
import StatsDisplay from '../components/life-events/StatsDisplay'
import type { Route } from './+types/life-events'

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

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type') || undefined
  const companion = url.searchParams.get('companion') || undefined
  const sortBy =
    (url.searchParams.get('sortBy') as 'date-asc' | 'date-desc' | 'summary') || 'date-desc'

  const { session } = await getServerSession(request)
  const client = createServerTRPCClient(session?.access_token)

  const [events, people] = await Promise.all([
    client.lifeEvents.list.query({
      tagNames: type ? [type] : undefined,
      companion,
      sortBy,
    }),
    client.lifeEvents.people.list.query(),
  ])

  return { events, people }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const eventData: any = {}
  for (const [key, value] of formData.entries()) {
    if (key === 'people') {
      ;(eventData.people ||= []).push(value as string)
      continue
    }
    eventData[key] = value
  }
  if (typeof eventData.tags === 'string') {
    eventData.tags = eventData.tags.split(',').map((tag: string) => tag.trim())
  }
  if (eventData.date) {
    eventData.date = new Date(eventData.date)
  }

  const { session } = await getServerSession(request)
  const client = createServerTRPCClient(session?.access_token)
  const event = await client.lifeEvents.create.mutate(eventData)
  return { success: true, event }
}

export default function LifeEventsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState('')
  const [filterCompanion, setFilterCompanion] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [showAddForm, setShowAddForm] = useState(false)
  const [companions, setCompanions] = useState<string[]>([])

  const activities = loaderData?.events || []
  const people = loaderData?.people || []

  useEffect(() => {
    // Update companions list from activities data
    const allCompanions = new Set<string>()
    activities.forEach((activity: Activity) => {
      if (activity.people) {
        activity.people.forEach((person: Person) => {
          const name = `${person.firstName || ''} ${person.lastName || ''}`.trim()
          if (name) allCompanions.add(name)
        })
      }
    })
    setCompanions(Array.from(allCompanions).sort())
  }, [activities])

  const handleFilterChange = () => {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterCompanion) params.set('companion', filterCompanion)
    if (sortBy) params.set('sortBy', sortBy)

    navigate(`/life-events?${params.toString()}`)
  }

  const handleToggleEventForm = () => {
    setShowAddForm(!showAddForm)
  }

  const editEvent = (activity: Activity) => {
    navigate(`/life-events/edit/${activity.id}`)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-notion-bg-secondary)' }}>
      {/* Header */}
      <div
        className="py-16 relative border-b"
        style={{
          backgroundColor: 'var(--color-notion-bg)',
          borderColor: 'var(--color-notion-border)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1
              className="text-4xl font-bold leading-tight mb-4"
              style={{ color: 'var(--color-notion-text)' }}
            >
              Life Events
            </h1>
            <p className="text-base" style={{ color: 'var(--color-notion-text-secondary)' }}>
              Track and organize your life's memorable moments
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsDisplay activities={activities} loading={false} />
          </div>
        </div>
        {/* Gradient border */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--color-notion-border), transparent)',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Filters */}
        <div className="mb-8">
          <FiltersSection
            filterType={filterType}
            filterCompanion={filterCompanion}
            sortBy={sortBy}
            companions={companions}
            onFilterTypeChange={setFilterType}
            onFilterCompanionChange={setFilterCompanion}
            onSortByChange={setSortBy}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/life-events/people')}
              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border transition-all duration-150 hover:-translate-y-px"
              style={{
                backgroundColor: 'var(--color-notion-bg)',
                color: 'var(--color-notion-text)',
                borderColor: 'var(--color-notion-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-notion-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-notion-bg)'
              }}
            >
              👥 Manage People
            </button>
            <div className="text-xs" style={{ color: 'var(--color-notion-text-tertiary)' }}>
              {people.length} people in database
            </div>
          </div>
        </div>

        {/* Event Form */}
        <div className="mb-8">
          <EventForm
            showAddForm={showAddForm}
            people={people}
            onToggleForm={handleToggleEventForm}
          />
        </div>

        {/* Events List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-lg font-semibold leading-snug"
              style={{ color: 'var(--color-notion-text)' }}
            >
              Recent Events
            </h2>
            <div className="text-xs" style={{ color: 'var(--color-notion-text-tertiary)' }}>
              {activities.length} events
            </div>
          </div>
          <EventList activities={activities} loading={false} onEditEvent={editEvent} />
        </div>
      </div>
    </div>
  )
}
