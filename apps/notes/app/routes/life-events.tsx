import { getServerSession } from '@hominem/auth/server'
import { useEffect, useState } from 'react'
import { data, useNavigate } from 'react-router'
import type { RouterInput } from '~/lib/trpc'
import { createServerTRPCClient } from '~/lib/trpc/server'
import EventForm from '../components/life-events/EventForm'
import EventList from '../components/life-events/EventList'
import FiltersSection from '../components/life-events/FiltersSection'
import StatsDisplay from '../components/life-events/StatsDisplay'
import type { Route } from './+types/life-events'

interface LifeEventPerson {
  id: string
  firstName?: string
  lastName?: string
}

interface LifeEventActivity {
  id: string
  date?: string
  time?: string
  title: string
  description?: string
  location?: string
  people?: LifeEventPerson[]
  tags?: string[]
}

type LoaderData = Awaited<ReturnType<typeof loader>>

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type') || undefined
  const companion = url.searchParams.get('companion') || undefined
  type SortBy = 'date-asc' | 'date-desc' | 'summary'
  const sortParam = url.searchParams.get('sortBy')
  const sortBy: SortBy =
    sortParam === 'date-asc' || sortParam === 'summary' ? sortParam : 'date-desc'

  const { session, headers } = await getServerSession(request)
  const trpc = createServerTRPCClient(session?.access_token)

  const listInput: RouterInput['lifeEvents']['list'] = {
    tagNames: type ? [type] : undefined,
    companion: companion || undefined,
    sortBy,
  }

  const [events, people] = await Promise.all([
    trpc.lifeEvents.list.query(listInput),
    trpc.lifeEvents.people.list.query(),
  ])

  return data({ events, people }, { headers })
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const eventData: Partial<RouterInput['lifeEvents']['create']> = {}

  for (const [key, value] of formData.entries()) {
    if (key === 'people') {
      if (!eventData.people) {
        eventData.people = []
      }
      eventData.people.push(value as string)
      continue
    }
    if (key === 'tags') {
      const tagsValue = value as string
      eventData.tags = tagsValue.split(',').map((tag) => tag.trim())
      continue
    }
    if (key === 'title' || key === 'description' || key === 'date' || key === 'type') {
      eventData[key] = value as string
    }
  }

  if (eventData.date) {
    eventData.date = new Date(eventData.date).toISOString()
  }

  const { session } = await getServerSession(request)
  const trpc = createServerTRPCClient(session?.access_token)
  const createInput: RouterInput['lifeEvents']['create'] = {
    title: eventData.title ?? '',
    description: eventData.description,
    date: eventData.date,
    type: eventData.type,
    tags: eventData.tags,
    people: eventData.people,
  }
  const event = await trpc.lifeEvents.create.mutate(createInput)
  return { success: true, event }
}

export default function LifeEventsPage({
  loaderData,
}: Route.ComponentProps & { loaderData: LoaderData }) {
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState('')
  const [filterCompanion, setFilterCompanion] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [showAddForm, setShowAddForm] = useState(false)
  const [companions, setCompanions] = useState<string[]>([])

  const activities = ((loaderData?.events ?? []) as LifeEventActivity[]).map((activity) => ({
    ...activity,
    description: activity.description ?? undefined,
    people: activity.people?.map((person) => ({
      ...person,
      firstName: person.firstName ?? undefined,
      lastName: person.lastName ?? undefined,
    })),
  }))
  const people = ((loaderData?.people ?? []) as LifeEventPerson[]).map((person) => ({
    ...person,
    firstName: person.firstName ?? undefined,
    lastName: person.lastName ?? undefined,
  }))

  useEffect(() => {
    // Update companions list from activities data
    const allCompanions = new Set<string>()
    activities.forEach((activity) => {
      activity.people?.forEach((person) => {
        const name = `${person.firstName || ''} ${person.lastName || ''}`.trim()
        if (name) allCompanions.add(name)
      })
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

  const editEvent = (activity: LifeEventActivity) => {
    navigate(`/life-events/edit/${activity.id}`)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-notion-bg-secondary)' }}>
      {/* Header - Cleaner, more spacious */}
      <div
        className="pt-12 pb-8 relative"
        style={{
          backgroundColor: 'var(--color-notion-bg)',
        }}
      >
        <div className="max-w-6xl mx-auto px-8">
          {/* Title and Actions Row */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1
                className="text-5xl font-bold tracking-tight mb-3"
                style={{ color: 'var(--color-notion-text)' }}
              >
                Life Events
              </h1>
              <p className="text-lg" style={{ color: 'var(--color-notion-text-secondary)' }}>
                Track and organize your life's memorable moments
              </p>
            </div>

            {/* Primary Action - Prominent placement */}
            <button
              type="button"
              onClick={handleToggleEventForm}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--color-notion-text)',
                color: 'var(--color-notion-bg)',
              }}
            >
              <span className="text-lg">+</span>
              <span>{showAddForm ? 'Cancel' : 'Add Event'}</span>
            </button>
          </div>

          {/* Stats - More compact and integrated */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatsDisplay activities={activities} loading={false} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Event Form - Show/hide with smooth transition */}
        {showAddForm && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div
              className="rounded-xl p-6 shadow-sm"
              style={{
                backgroundColor: 'var(--color-notion-bg)',
                border: '1px solid var(--color-notion-border)',
              }}
            >
              <EventForm
                showAddForm={showAddForm}
                people={people}
                onToggleForm={handleToggleEventForm}
              />
            </div>
          </div>
        )}

        {/* Filters and Secondary Actions */}
        <div
          className="mb-8 p-5 rounded-xl"
          style={{
            backgroundColor: 'var(--color-notion-bg)',
          }}
        >
          <div className="flex items-end gap-4">
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

            {/* Secondary action - less prominent */}
            <button
              type="button"
              onClick={() => navigate('/life-events/people')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--color-notion-bg-secondary)',
                color: 'var(--color-notion-text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-notion-hover)'
                e.currentTarget.style.color = 'var(--color-notion-text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-notion-bg-secondary)'
                e.currentTarget.style.color = 'var(--color-notion-text-secondary)'
              }}
            >
              <span>👥</span>
              <span>Manage People</span>
              <span className="text-xs opacity-60">({people.length})</span>
            </button>
          </div>
        </div>

        {/* Events List - Cleaner header */}
        <div>
          <div className="flex items-baseline justify-between mb-5 px-1">
            <h2
              className="text-2xl font-semibold tracking-tight"
              style={{ color: 'var(--color-notion-text)' }}
            >
              Your Events
            </h2>
            <div
              className="text-sm font-medium"
              style={{ color: 'var(--color-notion-text-tertiary)' }}
            >
              {activities.length} {activities.length === 1 ? 'event' : 'events'}
            </div>
          </div>

          <EventList activities={activities} loading={false} onEditEvent={editEvent} />
        </div>
      </div>
    </div>
  )
}
