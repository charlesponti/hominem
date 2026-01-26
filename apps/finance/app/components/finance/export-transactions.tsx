import { toast } from '@hominem/ui';
import { Button } from '@hominem/ui/button';

import { useFinanceAccountsWithMap, useFinanceTransactions } from '~/lib/hooks/use-finance-data';

export function ExportTransactions() {
  const { accountsMap } = useFinanceAccountsWithMap();
  const { transactions: rawTransactions } = useFinanceTransactions();
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];

  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: 'No Transactions',
        description: 'There are no transactions to export.',
        variant: 'default',
      });
      return;
    }

    const headers = ['Date', 'Description', 'Amount', 'Category', 'Type', 'Account'];
    const csvRows = [
      headers.join(','),
      ...transactions.map(
        (tx) => {
          const account = accountsMap.get(tx.accountId);
          return [
            tx.date,
            `"${tx.description?.replace(/"/g, '""') || ''}"`,
            String(tx.amount),
            tx.category || 'Other',
            tx.type || 'expense',
            account?.name || 'Unknown',
          ].join(',');
        },
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];

    a.href = url;
    a.download = `transactions-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: 'Your transactions have been exported as a CSV file.',
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-md">
      <div>
        <h3 className="text-md font-semibold">Export Transactions</h3>
        <p className="text-sm text-muted-foreground">
          Download all your transactions as a CSV file.
        </p>
      </div>
      <Button variant="outline" onClick={handleExport} className="mt-2 sm:mt-0">
        Export CSV
      </Button>
    </div>
  );
}
