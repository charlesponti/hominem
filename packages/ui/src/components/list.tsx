import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib/utils';
import { Loading } from './ui/loading';

type LoadingSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

type ListProps = HTMLAttributes<HTMLUListElement> & {
  isLoading?: boolean;
  loadingSize?: LoadingSize;
};

const List = forwardRef<HTMLUListElement, ListProps>(
  ({ className, isLoading, loadingSize = 'md', children, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        className={cn(
          'list-none bg-muted divide-y divide-border border border-border overflow-hidden',
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <li className="flex items-center justify-center py-8">
            <Loading size={loadingSize} />
          </li>
        ) : (
          children
        )}
      </ul>
    );
  },
);

List.displayName = 'List';

export { List };
