import { ActiveFiltersBar, FilterSelect } from '@hominem/ui/filters'
import { useSort, useUrlFilters } from '@hominem/ui/hooks'
import { useEffect, useMemo, useState } from 'react'
import { data, useNavigate } from 'react-router'
import { getServerSession } from '~/lib/auth.server'
import i18n from '~/lib/i18n'
import type { RouterInput } from '~/lib/trpc'
import { createServerTRPCClient } from '~/lib/trpc/server'
import EventForm from '../components/events/EventForm'
import EventList from '../components/events/EventList'
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

type EventFilters = {
  type: string
  companion: string
  source: string
  sortBy: string
}

export default function EventsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate()
  const [showAddForm, setShowAddForm] = useState(false)

  const { sync, syncStatus, isSyncing } = useGoogleCalendarSync()

  // Use shared hooks for filter management with URL sync
  const { filters, updateFilter } = useUrlFilters<EventFilters>({
    initialFilters: {
      type: '',
      companion: '',
      source: '',
      sortBy: 'date-desc',
    },
    paramMapping: {
      type: 'type',
      companion: 'companion',
      source: 'source',
      sortBy: 'sortBy',
    },
  })

  // Convert sortBy string to SortOption format for useSort
  const sortOptionFromString = (sortBy: string): { field: string; direction: 'asc' | 'desc' } => {
    if (sortBy === 'date-asc') {
      return { field: 'date', direction: 'asc' }
    }
    if (sortBy === 'date-desc') {
      return { field: 'date', direction: 'desc' }
    }
    if (sortBy === 'summary') {
      return { field: 'summary', direction: 'asc' }
    }
    return { field: 'date', direction: 'desc' }
  }

  const { sortOptions, addSortOption } = useSort({
    initialSortOptions: [sortOptionFromString(filters.sortBy)],
    singleSort: true,
    urlParamName: 'sortBy',
  })

  // Update sortBy filter when sortOptions change (but not on initial mount to avoid loops)
  useEffect(() => {
    if (sortOptions.length > 0) {
      const sort = sortOptions[0]
      if (!sort) {
        return
      }
      let newSortBy = 'date-desc'
      if (sort.field === 'date' && sort.direction === 'asc') {
        newSortBy = 'date-asc'
      } else if (sort.field === 'date' && sort.direction === 'desc') {
        newSortBy = 'date-desc'
      } else if (sort.field === 'summary') {
        newSortBy = 'summary'
      }

      if (newSortBy !== filters.sortBy) {
        updateFilter('sortBy', newSortBy)
      }
    }
  }, [sortOptions]) // Only depend on sortOptions to avoid loops

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
        if (name) {
          allCompanions.add(name)
        }
      })
    })
    return Array.from(allCompanions).sort()
  }, [activities])

  // Prepare active filters for display
  const activeFilters = useMemo(() => {
    const filtersList = []
    if (filters.type) {
      filtersList.push({
        id: 'type',
        label: `Type: ${filters.type}`,
        onRemove: () => updateFilter('type', ''),
      })
    }
    if (filters.companion) {
      filtersList.push({
        id: 'companion',
        label: `Companion: ${filters.companion}`,
        onRemove: () => updateFilter('companion', ''),
      })
    }
    if (filters.source) {
      filtersList.push({
        id: 'source',
        label: `Source: ${filters.source}`,
        onRemove: () => updateFilter('source', ''),
      })
    }
    if (filters.sortBy && filters.sortBy !== 'date-desc') {
      const sortLabels: Record<string, string> = {
        'date-asc': 'Date (Oldest First)',
        'date-desc': 'Date (Newest First)',
        summary: 'Title (A-Z)',
      }
      filtersList.push({
        id: 'sortBy',
        label: `Sort: ${sortLabels[filters.sortBy] || filters.sortBy}`,
        onRemove: () => updateFilter('sortBy', 'date-desc'),
      })
    }
    return filtersList
  }, [filters, updateFilter])

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
          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-4">
              <div className="flex items-end gap-3 flex-1">
                <FilterSelect
                  label="Type"
                  value={filters.type}
                  options={[
                    { value: 'Events', label: 'Events' },
                    { value: 'Movies', label: 'Movies' },
                    { value: 'Reading', label: 'Reading' },
                    { value: 'Dates', label: 'Dates' },
                    { value: 'Birthdays', label: 'Birthdays' },
                    { value: 'Anniversaries', label: 'Anniversaries' },
                  ]}
                  onChange={(value) => updateFilter('type', value)}
                  placeholder="All Types"
                />
                <FilterSelect
                  label="Companion"
                  value={filters.companion}
                  options={companions.map((c) => ({ value: c, label: c }))}
                  onChange={(value) => updateFilter('companion', value)}
                  placeholder="All People"
                />
                <FilterSelect
                  label="Source"
                  value={filters.source}
                  options={[
                    { value: 'manual', label: 'Manual' },
                    { value: 'google_calendar', label: 'Google Calendar' },
                  ]}
                  onChange={(value) => updateFilter('source', value)}
                  placeholder="All Sources"
                />
                <FilterSelect
                  label="Sort By"
                  value={filters.sortBy}
                  options={[
                    { value: 'date-desc', label: 'Date (Newest First)' },
                    { value: 'date-asc', label: 'Date (Oldest First)' },
                    { value: 'summary', label: 'Title (A-Z)' },
                  ]}
                  onChange={(value) => {
                    updateFilter('sortBy', value)
                    const sortOption = sortOptionFromString(value)
                    addSortOption(sortOption)
                  }}
                  placeholder="Sort By"
                />
              </div>

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
            {activeFilters.length > 0 && (
              <ActiveFiltersBar filters={activeFilters} label="Active filters:" />
            )}
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
