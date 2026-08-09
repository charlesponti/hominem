import { Button } from '@ponti-studios/ui/primitives';
import { Home } from 'lucide-react';
import type { MetaFunction } from 'react-router';
import { Link } from 'react-router';

export const meta: MetaFunction = () => [
  { title: 'Page Not Found | career' },
  {
    name: 'description',
    content: 'The page you are looking for does not exist or has been moved.',
  },
];

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <h1 className="text-6xl font-bold tracking-tight text-foreground/10 select-none">404</h1>
      <h2 className="heading-3 mt-4 text-foreground">Page Not Found</h2>
      <p className="body-3 mt-2 max-w-md text-center text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">
          <Home className="size-4" />
          Go Home
        </Link>
      </Button>
    </div>
  );
}
