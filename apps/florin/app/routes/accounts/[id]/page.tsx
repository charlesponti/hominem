import { useParams } from 'react-router'

export default function AccountDetailPage() {
  const { id } = useParams()

  return (
    <div>
      <h1>Account {id}</h1>
      <p>Account details coming soon...</p>
    </div>
  )
}



