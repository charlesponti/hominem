import { useParams } from 'react-router'

export default function MonthlyAnalyticsPage() {
  const { month } = useParams()

  return (
    <div>
      <h1>Monthly Analytics - {month}</h1>
      <p>Monthly analytics for {month} coming soon...</p>
    </div>
  )
}







