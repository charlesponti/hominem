import { AlertTriangle } from 'lucide-react'

type AlertErrorProps = {
  error?: string
}
function AlertError({ error }: AlertErrorProps) {
  return (
    <div className="alert alert-error shadow-lg mb-8">
      <div>
        <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-400" />
        <span>
          <p>Something went wrong! {error}</p>
        </span>
      </div>
    </div>
  )
}

export default AlertError
