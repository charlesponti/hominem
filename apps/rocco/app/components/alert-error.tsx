import { AlertTriangle } from 'lucide-react';

type AlertErrorProps = {
  error?: string;
};
function AlertError({ error }: AlertErrorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start gap-3 p-4 rounded-xl backdrop-blur-md border border-red-200 bg-red-50 text-red-800 animate-fade-in">
        <AlertTriangle className="size-6 shrink-0 text-red-400" />
        <span className="text-sm">
          <p>Something went wrong! {error}</p>
        </span>
      </div>
    </div>
  );
}

export default AlertError;
