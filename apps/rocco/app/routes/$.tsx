import { PageTitle } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { motion, type Variants } from 'framer-motion';
import { Home, ListIcon, MapPin, Search } from 'lucide-react';
import { Link } from 'react-router';

import ErrorBoundary from '~/components/ErrorBoundary';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4">
      <motion.div
        className="flex flex-col items-center text-center max-w-2xl w-full"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Large 404 Number */}
        <motion.div variants={scaleIn} className="mb-6">
          <h1 className="heading text-8xl sm:text-9xl lg:text-[12rem] text-primary/20 select-none">
            404
          </h1>
        </motion.div>

        {/* Main Message */}
        <motion.div variants={fadeIn} className="mb-4">
          <PageTitle title="Page Not Found" />
        </motion.div>

        {/* Description */}
        <motion.p
          variants={fadeIn}
          className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-md font-light leading-relaxed"
        >
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </motion.p>

        {/* Action Buttons */}
        <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button asChild size="lg" className="flex items-center gap-2">
            <Link to="/">
              <Home className="size-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex items-center gap-2">
            <Link to="/lists">
              <MapPin className="size-4" />
              Browse Lists
            </Link>
          </Button>
        </motion.div>

        {/* Helpful Links */}
        <motion.div variants={fadeIn} className="mt-12 pt-8 border-t border-border/50 w-full">
          <p className="text-sm text-muted-foreground mb-4 font-light">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <Link to="/" className="btn">
              <Search className="size-4" />
              Explore Places
            </Link>
            <Link to="/lists" className="btn">
              <ListIcon className="size-4" />
              My Lists
            </Link>
            <Link to="/trips" className="btn">
              <MapPin className="size-4" />
              Trips
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export { ErrorBoundary };
