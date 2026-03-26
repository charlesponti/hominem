import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, type HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface Source {
  href: string;
  title: string;
}

interface SourcesProps extends HTMLAttributes<HTMLDivElement> {
  sources?: Source[];
}

export function Sources({ sources, className, children, ...props }: SourcesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources?.length && !children) return null;

  return (
    <div className={cn('rounded-md border px-3', className)} {...props}>
      <Button
        variant="ghost"
        size="sm"
        className="flex w-full items-center justify-between py-2 text-muted-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="size-4" />
          <span className="text-sm font-medium">
            {sources?.length
              ? `${sources.length} source${sources.length > 1 ? 's' : ''}`
              : 'Sources'}
          </span>
        </div>
        {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </Button>

      {isOpen && (
        <div className="px-3 pb-3">
          {children || (
            <ul className="flex flex-col gap-2">
              {sources?.map((source, index) => (
                <li key={index}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground line-clamp-1"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

interface SourceProps extends HTMLAttributes<HTMLAnchorElement> {
  href: string;
  title: string;
}

export function Source({ href, title, className, ...props }: SourceProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('text-sm text-muted-foreground hover:text-foreground', className)}
      {...props}
    >
      {title}
    </a>
  );
}
