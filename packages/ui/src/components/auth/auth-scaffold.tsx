import { Lock } from 'lucide-react';

interface AuthScaffoldProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function AuthScaffold({ children, title, description, className }: AuthScaffoldProps) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-bg-base p-4 ${className ?? ''}`}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-bg-elevated border border-default mb-4">
            <Lock className="w-5 h-5 text-text-primary" />
          </div>
          <h1 className="heading-2 text-text-primary">{title}</h1>
          {description && <p className="body-3 text-text-secondary mt-2">{description}</p>}
        </div>

        <div className="bg-bg-surface border border-default rounded-lg p-6 shadow-low">{children}</div>
      </div>
    </div>
  );
}
