import { AlertTriangle } from 'lucide-react';

type AlertErrorProps = {
  error?: string;
};
function AlertError({ error }: AlertErrorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start gap-3 p-4 border-2 border-destructive/50 text-destructive">
        <AlertTriangle className="size-6 shrink-0 text-destructive/70" />
        <span className="text-sm">
          <p>Something went wrong! {error}</p>
        </span>
      </div>
    </div>
  );
}

export default AlertError;
