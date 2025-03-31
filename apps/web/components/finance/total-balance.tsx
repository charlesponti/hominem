interface TotalBalanceProps {
  balance: string
}

export function TotalBalance({ balance }: TotalBalanceProps) {
  return (
    <div className="text-xl font-semibold">
      Total Balance:{' '}
      <span className={Number.parseFloat(balance) >= 0 ? 'text-green-600' : 'text-red-600'}>
        ${Number.parseFloat(balance).toLocaleString()}
      </span>
    </div>
  )
}
