import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const earningsData = [
  { month: 'Jan', earnings: 1000 },
  { month: 'Feb', earnings: 1200 },
  { month: 'Mar', earnings: 1500 },
  { month: 'Apr', earnings: 1800 },
  { month: 'May', earnings: 2100 },
  { month: 'Jun', earnings: 2500 },
]

const incomeBreakdown = [
  { name: 'Freelance', value: 5000 },
  { name: 'Salaried', value: 7000 },
  { name: 'Investments', value: 2000 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28']

const CareerDashboard = () => {
  const totalEarnings = incomeBreakdown.reduce((acc, curr) => acc + curr.value, 0)
  const jobsCompleted = 45
  const avgEarningsPerJob = totalEarnings / jobsCompleted
  const careerGrowthRate =
    ((earningsData[earningsData.length - 1].earnings - earningsData[0].earnings) /
      earningsData[0].earnings) *
    100

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metrics Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Total Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">${totalEarnings.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jobs Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{jobsCompleted}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avg. Earnings per Job</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">${avgEarningsPerJob.toFixed(2)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Career Growth Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-bold ${
              careerGrowthRate >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {careerGrowthRate.toFixed(2)}%
          </p>
        </CardContent>
      </Card>

      {/* Line Chart */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Earnings Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={earningsData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="earnings" stroke="#8884d8" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Income Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={incomeBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {incomeBreakdown.map((entry, index) => (
                  <Cell
                    key={`cell-${crypto.getRandomValues(new Uint32Array(1))[0]}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default CareerDashboard
