import { Button } from '@hominem/ui/button';
import { Home } from 'lucide-react';
import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <h1 className="text-6xl font-bold tracking-tight text-foreground/10 select-none">404</h1>
      <h2 className="mt-4 text-lg font-semibold text-foreground">Page Not Found</h2>
      <p className="mt-2 max-w-md text-center text-sm text-text-secondary">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-8 gap-2">
        <Link to="/">
          <Home className="size-4" />
          Go Home
        </Link>
      </Button>
    </div>
  );
}
