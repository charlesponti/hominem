import { Button } from '@hominem/ui/button'
import { Home, TrendingUp, Wallet } from 'lucide-react'
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
            <Link to="/finance">
              <Wallet className="size-4" />
              Finance
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-border/50 w-full">
          <p className="text-sm text-muted-foreground mb-4 font-light">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <Link to="/finance" className="btn">
              <Wallet className="size-4" />
              Finance
            </Link>
            <Link to="/analytics" className="btn">
              <TrendingUp className="size-4" />
              Analytics
            </Link>
            <Link to="/accounts" className="btn">
              <Wallet className="size-4" />
              Accounts
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
