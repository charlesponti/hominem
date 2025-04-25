import { useUser } from '@clerk/react-router'
import { Activity, Calendar, HeartPulse, LineChart, Shield } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'

// Mock health data
const mockHealthData = [
  { id: 1, date: '2025-04-01', steps: 8432, sleep: 7.5, heartRate: 68, activity: 'Running' },
  { id: 2, date: '2025-04-02', steps: 6521, sleep: 6.8, heartRate: 72, activity: 'Walking' },
  { id: 3, date: '2025-04-03', steps: 9234, sleep: 8.2, heartRate: 65, activity: 'Cycling' },
  { id: 4, date: '2025-04-04', steps: 5120, sleep: 7.0, heartRate: 70, activity: 'Rest' },
]

export default function Health() {
  const { user, isLoaded } = useUser()
  const [activeTab, setActiveTab] = useState('overview')

  // For protected route pattern
  if (isLoaded && !user) {
    return <Navigate to="/sign-in" replace />
  }

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Health Dashboard</h1>

        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Connect Health App
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Daily Steps</CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,432</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sleep Quality</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7.5 hrs</div>
            <p className="text-xs text-muted-foreground">+0.7 hrs from average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resting Heart Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68 bpm</div>
            <p className="text-xs text-muted-foreground">Within optimal range</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="metrics">Health Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center bg-muted/20 rounded-md">
                <LineChart className="h-8 w-8 text-muted" />
                <span className="ml-2 text-muted-foreground">Chart visualization goes here</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockHealthData.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50"
                  >
                    <div>
                      <div className="font-medium">{entry.activity}</div>
                      <div className="text-sm text-muted-foreground">{entry.date}</div>
                    </div>
                    <div className="text-sm">
                      {entry.steps} steps | {entry.sleep} hrs sleep
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Detailed activity log will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Health Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Detailed health metrics will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
