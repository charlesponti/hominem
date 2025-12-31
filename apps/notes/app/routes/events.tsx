import { useMemo, useState } from 'react'
import { data, useNavigate } from 'react-router'
import { getServerSession } from '~/lib/auth.server'
import i18n from '~/lib/i18n'
import type { RouterInput } from '~/lib/trpc'
import { createServerTRPCClient } from '~/lib/trpc/server'
import EventForm from '../components/events/EventForm'
import EventList from '../components/events/EventList'
import FiltersSection from '../components/events/FiltersSection'
import StatsDisplay from '../components/events/StatsDisplay'
import SyncButton from '../components/events/SyncButton'
import SyncStatus from '../components/events/SyncStatus'
import { useGoogleCalendarSync } from '../hooks/useGoogleCalendarSync'
import type { Route } from './+types/events'

interface EventPerson {
  id: string
  firstName?: string
  lastName?: string
}

interface EventActivity {
  id: string
  date?: string
  time?: string
  title: string
  description?: string
  location?: string
  people?: EventPerson[]
  tags?: string[]
}

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

  const [events, people] = await Promise.all([
    trpc.events.list.query({
      tagNames: type ? [type] : undefined,
      companion: companion || undefined,
      sortBy,
    }),
    trpc.people.list.query(),
  ])

  return data({ events, people }, { headers })
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const eventData: Partial<RouterInput['events']['create']> = {}

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
  const createInput = {
    title: eventData.title ?? '',
    description: eventData.description,
    date: eventData.date,
    type: eventData.type,
    tags: eventData.tags,
    people: eventData.people,
  }
  const event = await trpc.events.create.mutate(createInput)
  return { success: true, event }
}

export default function EventsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState('')
  const [filterCompanion, setFilterCompanion] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [showAddForm, setShowAddForm] = useState(false)

  const { sync, syncStatus, isSyncing } = useGoogleCalendarSync()

  const activities = useMemo(
    () =>
      ((loaderData.events ?? []) as EventActivity[]).map((activity) => ({
        ...activity,
        description: activity.description ?? undefined,
        people: activity.people?.map((person) => ({
          ...person,
          firstName: person.firstName ?? undefined,
          lastName: person.lastName ?? undefined,
        })),
      })),
    [loaderData.events]
  )

  const people = useMemo(
    () =>
      ((loaderData.people ?? []) as EventPerson[]).map((person) => ({
        ...person,
        firstName: person.firstName ?? undefined,
        lastName: person.lastName ?? undefined,
      })),
    [loaderData.people]
  )

  const companions = useMemo(() => {
    const allCompanions = new Set<string>()
    activities.forEach((activity) => {
      activity.people?.forEach((person) => {
        const name = `${person.firstName || ''} ${person.lastName || ''}`.trim()
        if (name) allCompanions.add(name)
      })
    })
    return Array.from(allCompanions).sort()
  }, [activities])

  const handleFilterChange = () => {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterCompanion) params.set('companion', filterCompanion)
    if (filterSource) params.set('source', filterSource)
    if (sortBy) params.set('sortBy', sortBy)

    navigate(`/events?${params.toString()}`)
  }

  const handleSync = async () => {
    await sync({})
  }

  const handleToggleEventForm = () => {
    setShowAddForm(!showAddForm)
  }

  const editEvent = (activity: EventActivity) => {
    navigate(`/events/edit/${activity.id}`)
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="pt-12 pb-8 relative bg-card">
        <div className="max-w-6xl mx-auto px-8">
          {/* Title and Actions Row */}
          <div className="flex items-start justify-between mb-10">
            <div className="space-y-2">
              <h1 className="heading-1 text-foreground">Events</h1>
              <p className="body-1 text-muted-foreground">
                Track and organize your life&apos;s memorable moments
              </p>
            </div>

            {/* Primary Actions - Prominent placement */}
            <div className="flex items-center gap-3">
              <SyncButton onSync={handleSync} disabled={isSyncing} />
              <button
                type="button"
                onClick={handleToggleEventForm}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 bg-primary text-primary-foreground"
              >
                <span className="text-lg">+</span>
                <span>{showAddForm ? 'Cancel' : 'Add Event'}</span>
              </button>
            </div>
          </div>

          {/* Stats - More compact and integrated */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatsDisplay activities={activities} loading={false} />
          </div>

          {/* Sync Status */}
          {syncStatus && (
            <div className="mt-4">
              <SyncStatus
                lastSyncedAt={syncStatus.lastSyncedAt}
                syncError={syncStatus.syncError}
                eventCount={syncStatus.eventCount}
                connected={syncStatus.connected}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Event Form - Show/hide with smooth transition */}
        {showAddForm && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="rounded-xl p-6 shadow-sm bg-card border border-border">
              <EventForm
                showAddForm={showAddForm}
                people={people}
                onToggleForm={handleToggleEventForm}
              />
            </div>
          </div>
        )}

        {/* Filters and Secondary Actions */}
        <div className="mb-8 p-5 rounded-xl bg-card">
          <div className="flex items-end gap-4">
            <FiltersSection
              filterType={filterType}
              filterCompanion={filterCompanion}
              filterSource={filterSource}
              sortBy={sortBy}
              companions={companions}
              onFilterTypeChange={setFilterType}
              onFilterCompanionChange={setFilterCompanion}
              onFilterSourceChange={setFilterSource}
              onSortByChange={setSortBy}
              onFilterChange={handleFilterChange}
            />

            {/* Secondary action - less prominent */}
            <button
              type="button"
              onClick={() => navigate('/events/people')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <span>👥</span>
              <span>Manage People</span>
              <span className="text-xs opacity-60">({people.length})</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-5 px-1">
            <h2 className="heading-2 text-foreground">Your Events</h2>
            <div className="body-1 text-muted-foreground">
              {i18n.t('event_count', { count: activities.length })}
            </div>
          </div>

          <EventList activities={activities} loading={false} onEditEvent={editEvent} />
        </div>
      </div>
    </div>
  )
}
