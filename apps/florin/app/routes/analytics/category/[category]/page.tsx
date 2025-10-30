import { useParams } from 'react-router'

export default function CategoryAnalyticsPage() {
  const { category } = useParams()

  return (
    <div>
      <h1>Category Analytics - {category}</h1>
      <p>Category analytics for {category} coming soon...</p>
    </div>
  )
}







