import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface CalculationResult {
  poundsToLose: number
  daysUntilTarget: number
  dailyCaloriesToBurn: number
  isHealthyRate: boolean
  dateWithFixedDeficit: string
  daysWithFixedDeficit: number
}

const WeightGoalCalculator = () => {
  const [startWeight, setStartWeight] = useState<string>('')
  const [goalWeight, setGoalWeight] = useState<string>('')
  const [targetDate, setTargetDate] = useState<string>('')
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState<string>('')

  // Function to calculate days between two dates
  const calculateDaysDifference = (date1Str: string, date2Str: string): number => {
    const date1 = new Date(date1Str)
    const date2 = new Date(date2Str)
    const diffTime = Math.abs(date2.getTime() - date1.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Get today's date in YYYY-MM-DD format for min attribute
  const getTodayString = (): string => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Format date as MM/DD/YYYY
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
  }

  // Calculate date after adding days to a date
  const addDaysToDate = (dateStr: string, days: number): string => {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + days)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const calculateGoal = (): void => {
    // Clear previous results
    setError('')
    setResult(null)

    // Validate inputs
    if (!startWeight || !goalWeight || !targetDate) {
      setError('Please fill in all fields')
      return
    }

    const startWeightNum = Number.parseFloat(startWeight)
    const goalWeightNum = Number.parseFloat(goalWeight)

    if (Number.isNaN(startWeightNum) || Number.isNaN(goalWeightNum)) {
      setError('Please enter valid numbers for weights')
      return
    }

    if (goalWeightNum >= startWeightNum) {
      setError('Goal weight must be less than starting weight for weight loss')
      return
    }

    const today = getTodayString()
    const daysUntilTarget = calculateDaysDifference(today, targetDate)

    if (daysUntilTarget <= 0) {
      setError('Target date must be in the future')
      return
    }

    // Calculate weight to lose
    const poundsToLose = startWeightNum - goalWeightNum

    // Calculate daily calorie deficit (3500 calories = 1 pound of fat)
    const totalCaloriesToBurn = poundsToLose * 3500
    const dailyCaloriesToBurn = Math.round(totalCaloriesToBurn / daysUntilTarget)

    // Calculate date with fixed 1700 calorie deficit
    const daysWithFixedDeficit = Math.ceil(totalCaloriesToBurn / 1700)
    const dateWithFixedDeficit = addDaysToDate(today, daysWithFixedDeficit)

    // Check if the goal is healthy (no more than 2 pounds per week is generally recommended)
    const maxHealthyWeeklyLoss = 2
    const maxHealthyDailyCalorieDeficit = (maxHealthyWeeklyLoss * 3500) / 7
    const isHealthyRate = dailyCaloriesToBurn <= maxHealthyDailyCalorieDeficit

    setResult({
      poundsToLose,
      daysUntilTarget,
      dailyCaloriesToBurn,
      isHealthyRate,
      dateWithFixedDeficit,
      daysWithFixedDeficit,
    })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Weight Loss Goal Calculator</CardTitle>
        <CardDescription>
          Calculate your daily calorie deficit to reach your target weight
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="startWeight">Current Weight (lbs)</Label>
          <Input
            id="startWeight"
            type="number"
            min="0"
            placeholder="Enter your current weight"
            value={startWeight}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartWeight(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="goalWeight">Goal Weight (lbs)</Label>
          <Input
            id="goalWeight"
            type="number"
            min="0"
            placeholder="Enter your target weight"
            value={goalWeight}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalWeight(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetDate">Target Date</Label>
          <Input
            id="targetDate"
            type="date"
            min={getTodayString()}
            value={targetDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetDate(e.target.value)}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4 mt-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Your Goal Summary</AlertTitle>
              <AlertDescription className="mt-2">
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    Weight to lose: <strong>{result.poundsToLose.toFixed(1)} lbs</strong>
                  </li>
                  <li>
                    Time frame: <strong>{result.daysUntilTarget} days</strong>
                  </li>
                  <li>
                    Required daily calorie deficit:{' '}
                    <strong>{result.dailyCaloriesToBurn} calories</strong>
                  </li>
                  <li>
                    With 1700 calorie daily deficit:{' '}
                    <strong>{formatDate(result.dateWithFixedDeficit)}</strong> (
                    {result.daysWithFixedDeficit} days)
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {!result.isHealthyRate && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Health Warning</AlertTitle>
                <AlertDescription>
                  This goal requires losing more than 2 pounds per week, which may not be healthy.
                  Consider extending your timeline or consulting a healthcare professional.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={calculateGoal} className="w-full">
          Calculate
        </Button>
      </CardFooter>
    </Card>
  )
}

export default WeightGoalCalculator
