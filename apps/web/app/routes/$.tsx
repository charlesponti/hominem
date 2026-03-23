import { Button } from '@hominem/ui/button';
import { Bot, Home } from 'lucide-react';
import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4">
      <div className="flex flex-col items-center text-center max-w-2xl w-full">
        {/* Large 404 Number */}
        <div className="mb-6">
          <h1 className="display-1 text-primary/20 select-none">404</h1>
        </div>

        {/* Main Message */}
        <div className="mb-4">
          <h2 className="heading-2 mb-2">Page Not Found</h2>
        </div>

        {/* Description */}
        <p className="body-1 text-muted-foreground mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button asChild size="lg" className="flex items-center gap-2">
            <Link to="/home">
              <Home className="size-4" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-border/50 w-full">
          <p className="body-2 text-muted-foreground mb-4 italic">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <Link to="/chat" className="btn">
              <Bot className="size-4" />
              Chat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
