'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateHealthData,
  useDeleteHealthData,
  useHealth,
  useUpdateHealthData,
} from '@/hooks/use-health'
import { format } from 'date-fns'
import { useState, type FormEvent } from 'react'

const DEFAULT_FORM_DATA = {
  userId: '',
  date: new Date(),
  activityType: '',
  duration: 0,
  caloriesBurned: 0,
  notes: '',
}

const ACTIVITY_TYPES = [
  'Running',
  'Walking',
  'Cycling',
  'Swimming',
  'Weight Training',
  'Yoga',
  'HIIT',
  'Pilates',
  'Hiking',
  'Other',
]

export default function HealthPage() {
  const [filters, setFilters] = useState<{
    startDate: Date | undefined
    endDate: Date | undefined
    activityType: string
  }>({
    startDate: undefined,
    endDate: undefined,
    activityType: '',
  })
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Use React Query hooks for health data
  const { deleteHealthData } = useDeleteHealthData()
  const { updateHealthData } = useUpdateHealthData()
  const { createHealthData } = useCreateHealthData()
  const { data, isLoading } = useHealth({
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    activityType: filters.activityType,
  })

  // Form handling
  const handleInputChange = ({ target }: { target: { name: string; value: string | number } }) => {
    const { name, value } = target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration' || name === 'caloriesBurned' ? Number(value) : value,
    }))
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      date: new Date(e.target.value),
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (editingId) {
      await updateHealthData.mutateAsync({
        id: editingId,
        ...formData,
      })
    } else {
      await createHealthData.mutateAsync({
        ...formData,
        userId: formData.userId || 'current-user', // Replace with actual auth user ID
      })
    }

    setIsFormOpen(false)
    setFormData(DEFAULT_FORM_DATA)
    setEditingId(null)
  }

  const handleEdit = (item: {
    userId: string
    date: string
    activityType: string
    duration: number
    caloriesBurned: number
    notes: string | null
    id: number
  }) => {
    setFormData({
      userId: item.userId,
      date: new Date(item.date),
      activityType: item.activityType,
      duration: item.duration,
      caloriesBurned: item.caloriesBurned,
      notes: item.notes || '',
    })
    setEditingId(item.id)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      await deleteHealthData.mutateAsync(id)
    }
  }

  const handleFilterChange = (e: { target: { name: string; value: string | Date } }) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value ? (name.includes('Date') ? new Date(value) : value) : null,
    }))
  }

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  // Sort data
  const sortedData = data
    ? [...data].sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      })
    : []

  // Calculate total stats
  const totalDuration = sortedData.reduce((sum, item) => sum + item.duration, 0)
  const totalCalories = sortedData.reduce((sum, item) => sum + item.caloriesBurned, 0)

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Health and Fitness Tracker</h1>
        <Button
          onClick={() => {
            setFormData(DEFAULT_FORM_DATA)
            setEditingId(null)
            setIsFormOpen(true)
          }}
          className="bg-primary"
        >
          Add New Entry
        </Button>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">{sortedData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">{totalDuration} minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Calories Burned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">{totalCalories} calories</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="filter-start-date" className="block text-sm mb-1">
                Start Date
              </label>
              <Input
                id="filter-start-date"
                type="date"
                name="startDate"
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label htmlFor="filter-end-date" className="block text-sm mb-1">
                End Date
              </label>
              <Input
                id="filter-end-date"
                type="date"
                name="endDate"
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label htmlFor="filter-activity-type" className="block text-sm mb-1">
                Activity Type
              </label>
              <Select
                name="activityType"
                value={filters.activityType}
                onValueChange={(value) => {
                  handleFilterChange({ target: { name: 'activityType', value } })
                }}
              >
                <SelectTrigger id="filter-activity-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Activity History</CardTitle>
          <Button onClick={toggleSortOrder} variant="link" className="text-sm">
            Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </Button>
        </CardHeader>
        <CardContent>
          {sortedData.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-gray-500">No health data available. Add your first activity!</p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedData.map((item) => (
                <div key={item.id} className="py-4 hover:bg-accent/5 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{item.activityType}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.date), 'PPP')}
                      </p>
                      <div className="mt-1">
                        <span className="text-sm bg-primary/20 text-primary px-2 py-1 rounded-md mr-2">
                          {item.duration} mins
                        </span>
                        <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-md">
                          {item.caloriesBurned} calories
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleEdit(item)}
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="form-date" className="text-sm font-medium">
                  Date
                </label>
                <Input
                  id="form-date"
                  type="date"
                  value={formData.date ? format(formData.date, 'yyyy-MM-dd') : ''}
                  onChange={handleDateChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="form-activity-type" className="text-sm font-medium">
                  Activity Type
                </label>
                <Select
                  name="activityType"
                  value={formData.activityType}
                  onValueChange={(value) => {
                    handleInputChange({ target: { name: 'activityType', value } })
                  }}
                  required
                >
                  <SelectTrigger id="form-activity-type">
                    <SelectValue placeholder="Select an activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="form-duration" className="text-sm font-medium">
                  Duration (minutes)
                </label>
                <Input
                  id="form-duration"
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="form-calories" className="text-sm font-medium">
                  Calories Burned
                </label>
                <Input
                  id="form-calories"
                  type="number"
                  name="caloriesBurned"
                  value={formData.caloriesBurned}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="form-notes" className="text-sm font-medium">
                  Notes (optional)
                </label>
                <Textarea
                  id="form-notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? 'Save Changes' : 'Add Activity'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
