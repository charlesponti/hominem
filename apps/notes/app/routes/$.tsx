import { Button } from '@hominem/ui/button'
import { Bot, Home, Lightbulb, StickyNote } from 'lucide-react'
import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4">
      <div className="flex flex-col items-center text-center max-w-2xl w-full">
        {/* Large 404 Number */}
        <div className="mb-6">
          <h1 className="text-8xl sm:text-9xl lg:text-[12rem] font-bold text-primary/20 select-none">
            404
          </h1>
        </div>

        {/* Main Message */}
        <div className="mb-4">
          <h2 className="text-3xl sm:text-4xl font-semibold mb-2">Page Not Found</h2>
        </div>

        {/* Description */}
        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-md font-light leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button asChild size="lg" className="flex items-center gap-2">
            <Link to="/">
              <Home className="size-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex items-center gap-2">
            <Link to="/notes">
              <StickyNote className="size-4" />
              Notes
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-border/50 w-full">
          <p className="text-sm text-muted-foreground mb-4 font-light">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              to="/notes"
              className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
            >
              <StickyNote className="size-3.5" />
              Notes
            </Link>
            <Link
              to="/chat"
              className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
            >
              <Bot className="size-3.5" />
              AI Assistant
            </Link>
            <Link
              to="/content-strategy"
              className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
            >
              <Lightbulb className="size-3.5" />
              Content Strategy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}




