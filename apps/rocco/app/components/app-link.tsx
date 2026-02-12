import type { PropsWithChildren } from 'react';

import { Link, useMatches } from 'react-router';

import { cn } from '~/lib/utils';

const AppLink = ({
  btn,
  to,
  className,
  children,
  ...props
}: PropsWithChildren<
  React.HTMLProps<HTMLAnchorElement> & {
    btn?: boolean;
    className?: string;
    to: string;
  }
>) => {
  const matches = useMatches();
  const isActive = matches.some((match) => match.pathname === to);

  if (btn) {
    return (
      <Link to={to} {...props}>
        <span
          className={cn('btn btn-primary text-white px-4 py-3 hover:', className)}
        >
          {children}
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      {...props}
      className={cn(
        'text-foreground ',
        isActive ? 'bg-accent text-foreground' : null,
        className,
      )}
    >
      {children}
    </Link>
  );
};

export default AppLink;
