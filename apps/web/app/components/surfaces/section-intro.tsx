import type { ReactNode } from 'react';

interface SectionIntroProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function SectionIntro({ title, description, actions }: SectionIntroProps) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className="space-y-3">
          <h1 className="text-title-2 font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-body-3 text-text-secondary">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
