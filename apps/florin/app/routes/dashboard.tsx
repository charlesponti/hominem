import { CreateTransactionForm } from '~/components/finance/create-transaction-form'
import { FinanceDashboard } from '~/components/finance/finance-dashboard'

export default function DashboardPage() {
  return (
    <div>
      <CreateTransactionForm />
      <FinanceDashboard />
    </div>
  )
}
