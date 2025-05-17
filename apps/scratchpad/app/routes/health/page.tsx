'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useUserContext } from '@/context/user-context'
import { useHealth } from '@/lib/hooks/use-health'
import { format, subMonths } from 'date-fns'
import {
  Activity,
  AreaChart,
  BarChart3,
  CalendarDays,
  DumbbellIcon,
  FileSpreadsheet,
  HeartPulse,
  ListTodo,
  Moon,
  PersonStanding,
  Plus,
  Repeat,
  Salad,
  Scale,
  Weight,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Types
export interface HealthEntry {
  id: string
  userId?: string
  date: string
  activityType: string
  duration: number
  caloriesBurned: number
  notes: string
  createdAt: string
  updatedAt: string
  synced?: boolean
}

export interface HealthEntryInput {
  date: Date
  activityType: string
  duration: number
  caloriesBurned: number
  notes: string
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

const DEFAULT_FORM_DATA: HealthEntryInput = {
  date: new Date(),
  activityType: '',
  duration: 0,
  caloriesBurned: 0,
  notes: '',
}

const RunEmoji = ({ className }: { className: string }) => (
  <span role="img" aria-label="Running" className={className}>
    🏃‍♂️
  </span>
)

export default function HealthPage() {
  const { auth } = useUserContext()
  const isLoggedIn = !!auth?.userId
  const [activeTab, setActiveTab] = useState('activities')

  // State for filters
  const [filters, setFilters] = useState({
    startDate: subMonths(new Date(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    activityType: '',
  })

  // Use consolidated health hook
  const {
    healthData: sortedData,
    isLoading,
    formData,
    setFormData,
    isFormOpen,
    setIsFormOpen,
    editingId,
    setEditingId,
    handleSubmit,
    handleDelete,
  } = useHealth({
    isLoggedIn,
    userId: auth?.userId ?? undefined,
    filters,
  })

  const handleEdit = (entry: HealthEntry) => {
    setFormData({
      date: new Date(entry.date),
      activityType: entry.activityType,
      duration: entry.duration,
      caloriesBurned: entry.caloriesBurned,
      notes: entry.notes,
    })
    setEditingId(entry.id)
    setIsFormOpen(true)
  }

  // Form handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
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

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSubmit(formData)
  }

  // Summary statistics
  const stats = useMemo(() => {
    const totalDuration = sortedData.reduce((sum, item) => sum + item.duration, 0)
    const totalCalories = sortedData.reduce((sum, item) => sum + item.caloriesBurned, 0)
    const avgDuration = sortedData.length > 0 ? totalDuration / sortedData.length : 0
    const avgCalories = sortedData.length > 0 ? totalCalories / sortedData.length : 0

    // Get unique activity types and count
    const activityCounts: Record<string, number> = {}
    for (const entry of sortedData) {
      activityCounts[entry.activityType] = (activityCounts[entry.activityType] || 0) + 1
    }

    // Get most frequent activity
    let mostFrequentActivity = ''
    let maxCount = 0
    for (const [activity, count] of Object.entries(activityCounts)) {
      if (count > maxCount) {
        mostFrequentActivity = activity
        maxCount = count
      }
    }

    return {
      totalEntries: sortedData.length,
      totalDuration,
      totalCalories,
      avgDuration: avgDuration.toFixed(0),
      avgCalories: avgCalories.toFixed(0),
      mostFrequentActivity,
    }
  }, [sortedData])

  // Chart data preparation
  const chartData = useMemo(() => {
    // Group data by date
    const dataByDate: Record<string, { calories: number; duration: number; count: number }> = {}

    for (const entry of sortedData) {
      const date = entry.date
      if (!dataByDate[date]) {
        dataByDate[date] = { calories: 0, duration: 0, count: 0 }
      }
      dataByDate[date].calories += entry.caloriesBurned
      dataByDate[date].duration += entry.duration
      dataByDate[date].count += 1
    }

    // Convert to array format for chart
    return Object.entries(dataByDate)
      .map(([date, data]) => ({
        date,
        displayDate: format(new Date(date), 'MMM dd'),
        calories: data.calories,
        duration: data.duration,
        activities: data.count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [sortedData])

  // Stats by activity type
  const activityStats = useMemo(() => {
    const stats: Record<string, { count: number; duration: number; calories: number }> = {}

    for (const entry of sortedData) {
      const { activityType, duration, caloriesBurned } = entry
      if (!stats[activityType]) {
        stats[activityType] = { count: 0, duration: 0, calories: 0 }
      }
      stats[activityType].count += 1
      stats[activityType].duration += duration
      stats[activityType].calories += caloriesBurned
    }

    return Object.entries(stats).map(([type, data]) => ({
      type,
      count: data.count,
      duration: data.duration,
      calories: data.calories,
      avgDuration: (data.duration / data.count).toFixed(0),
      avgCalories: (data.calories / data.count).toFixed(0),
    }))
  }, [sortedData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Health & Fitness</h1>
          <p className="text-muted-foreground">Track your activities and monitor your progress</p>
        </div>
        <div className="flex gap-2">
          {!isLoggedIn && sortedData.length > 0 && (
            <div className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-sm px-3 py-1 rounded-md flex items-center">
              <Weight className="w-4 h-4 mr-2" />
              Data stored locally
            </div>
          )}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setFormData(DEFAULT_FORM_DATA)
                  setEditingId(null)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Activity' : 'New Activity'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFormSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="date" className="text-sm font-medium">
                      Date
                    </label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date.toISOString().split('T')[0]}
                      onChange={handleDateChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="activityType" className="text-sm font-medium">
                      Activity Type
                    </label>
                    <Select
                      value={formData.activityType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, activityType: value }))
                      }
                      required
                    >
                      <SelectTrigger id="activityType">
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
                    <label htmlFor="duration" className="text-sm font-medium">
                      Duration (minutes)
                    </label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      value={formData.duration}
                      onChange={handleInputChange}
                      min={1}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="caloriesBurned" className="text-sm font-medium">
                      Calories Burned
                    </label>
                    <Input
                      id="caloriesBurned"
                      name="caloriesBurned"
                      type="number"
                      value={formData.caloriesBurned}
                      onChange={handleInputChange}
                      min={0}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">
                      Notes
                    </label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="How did it go? Any challenges or achievements?"
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingId ? 'Update' : 'Save'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="w-4 h-4 mr-2 text-primary" />
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            {stats.mostFrequentActivity && (
              <p className="text-xs text-muted-foreground">
                Most frequent: {stats.mostFrequentActivity}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Repeat className="w-4 h-4 mr-2 text-primary" />
              Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDuration} mins</div>
            <p className="text-xs text-muted-foreground">
              Avg: {stats.avgDuration} mins per activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <HeartPulse className="w-4 h-4 mr-2 text-primary" />
              Calories Burned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalories}</div>
            <p className="text-xs text-muted-foreground">Avg: {stats.avgCalories} per activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Filter Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start Date
              </label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm font-medium">
                End Date
              </label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="activityTypeFilter" className="text-sm font-medium">
                Activity Type
              </label>
              <Select
                value={filters.activityType}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, activityType: value }))}
              >
                <SelectTrigger id="activityTypeFilter">
                  <SelectValue placeholder="All Activities" />
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

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities" className="flex items-center">
            <ListTodo className="w-4 h-4 mr-2" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center">
            <AreaChart className="w-4 h-4 mr-2" />
            Activity Summary
          </TabsTrigger>
        </TabsList>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          {sortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <PersonStanding className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No activities found</h3>
              <p className="text-muted-foreground">
                {filters.activityType || filters.startDate || filters.endDate
                  ? 'Try adjusting your filters to see more results'
                  : 'Start tracking your fitness journey by adding your first activity'}
              </p>
              <Button
                onClick={() => {
                  setFormData(DEFAULT_FORM_DATA)
                  setEditingId(null)
                  setIsFormOpen(true)
                }}
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Activity
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedData.map((entry) => (
                <Card key={entry.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center p-4 border-b">
                    <div className="bg-primary/10 p-2 rounded-full mr-4">
                      {entry.activityType === 'Running' && (
                        <RunEmoji className="w-5 h-5 text-primary" />
                      )}
                      {entry.activityType === 'Weight Training' && (
                        <DumbbellIcon className="w-5 h-5 text-primary" />
                      )}
                      {entry.activityType === 'Yoga' && (
                        <Activity className="w-5 h-5 text-primary" />
                      )}
                      {!['Running', 'Weight Training', 'Yoga'].includes(entry.activityType) && (
                        <Activity className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{entry.activityType}</h3>
                        <div className="flex items-center">
                          <CalendarDays className="w-4 h-4 text-muted-foreground mr-1" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(entry.date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center mt-1 text-sm">
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 mr-2">
                          {entry.duration} mins
                        </span>
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5">
                          {entry.caloriesBurned} calories
                        </span>
                      </div>
                    </div>
                    <div className="flex">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {entry.notes && (
                    <CardContent className="pt-3 pb-2">
                      <p className="text-sm text-muted-foreground">{entry.notes}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Add more activities to see your progress charts
                  </p>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <XAxis dataKey="displayDate" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="duration"
                        name="Duration (mins)"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="calories"
                        name="Calories"
                        stroke="#82ca9d"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {activityStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityStats.map((stat) => (
                      <div key={stat.type} className="flex items-center">
                        <div className="w-1/3 font-medium truncate">{stat.type}</div>
                        <div className="w-2/3">
                          <div className="h-2 bg-primary/20 rounded-full">
                            <div
                              className="h-2 bg-primary rounded-full"
                              style={{
                                width: `${Math.min(100, (stat.count / stats.totalEntries) * 100)}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{stat.count} times</span>
                            <span>{Math.round((stat.count / stats.totalEntries) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Calorie Burn Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {activityStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <HeartPulse className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityStats
                      .sort((a, b) => b.calories - a.calories)
                      .map((stat) => (
                        <div key={stat.type} className="flex items-center">
                          <div className="w-1/3 font-medium truncate">{stat.type}</div>
                          <div className="w-2/3">
                            <div className="h-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                              <div
                                className="h-2 bg-green-500 rounded-full"
                                style={{
                                  width: `${Math.min(100, (stat.calories / stats.totalCalories) * 100)}%`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>{stat.calories} cal total</span>
                              <span>{stat.avgCalories} cal/activity</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {activityStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No activities to summarize</p>
                </div>
              ) : (
                <div className="divide-y">
                  {activityStats.map((stat) => (
                    <div key={stat.type} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center mb-2">
                        {stat.type === 'Running' && (
                          <RunEmoji className="w-5 h-5 text-primary mr-2" />
                        )}
                        {stat.type === 'Weight Training' && (
                          <DumbbellIcon className="w-5 h-5 text-primary mr-2" />
                        )}
                        {stat.type === 'Yoga' && <Activity className="w-5 h-5 text-primary mr-2" />}
                        {stat.type === 'Swimming' && (
                          <Activity className="w-5 h-5 text-primary mr-2" />
                        )}
                        {!['Running', 'Weight Training', 'Yoga', 'Swimming'].includes(
                          stat.type
                        ) && <Activity className="w-5 h-5 text-primary mr-2" />}
                        <h3 className="font-medium">{stat.type}</h3>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Activities</p>
                          <p className="font-medium">{stat.count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Duration</p>
                          <p className="font-medium">{stat.duration} mins</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Calories</p>
                          <p className="font-medium">{stat.calories}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg. Duration</p>
                          <p className="font-medium">{stat.avgDuration} mins</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Salad className="w-4 h-4 mr-2 text-primary" />
                  Nutrition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center py-4">
                  <Button variant="outline" className="text-sm">
                    Link Nutrition Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Scale className="w-4 h-4 mr-2 text-primary" />
                  Weight Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center py-4">
                  <Button variant="outline" className="text-sm">
                    Add Weight Data
                  </Button>
                </div>
              </CardContent>
            </Card>
            <ConnectSleepTracking />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ConnectSleepTracking() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Moon className="w-4 h-4 mr-2 text-primary" />
          Sleep Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center py-4">
          <Button variant="outline" className="text-sm">
            Connect Sleep Data
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
