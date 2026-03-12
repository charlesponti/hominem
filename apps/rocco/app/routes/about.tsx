import { LandingPage } from '@hominem/ui/components/layout/landing-page';
import { BookmarkCheck, MapPin, Share2, History } from 'lucide-react';

import ErrorBoundary from '~/components/ErrorBoundary';

export default function AboutPage() {
  return (
    <LandingPage
      kicker="Places"
      headline={
        <>
          Save places.{'\n'}
          Share lists.{'\n'}
          Actually go.
        </>
      }
      sub="Stop losing track of places worth remembering. Rocco turns scattered notes and screenshots into organized lists you'll use."
      ctaPrimary={{ label: 'Start your first list', href: '/auth' }}
      ctaSecondary={{ label: 'Sign in', href: '/auth' }}
      problem="Your friend texts you a great restaurant. You screenshot it, save it in notes, maybe drop a pin. Six months later you're in that neighborhood. You can't find it. You eat somewhere mediocre. This is a solved problem."
      features={[
        {
          icon: BookmarkCheck,
          title: 'Lists',
          description:
            'Organize saved places into named collections. Date night spots, neighborhood guides, trip planning — all in one place.',
        },
        {
          icon: MapPin,
          title: 'Map view',
          description:
            "See everything on a map. Plan your day around what's actually nearby instead of what you vaguely remember.",
        },
        {
          icon: Share2,
          title: 'Collaboration',
          description:
            "Invite friends to a list. Build it together, use it together. No more 'I'll send you the spreadsheet.'",
        },
        {
          icon: History,
          title: 'Visit log',
          description:
            "Mark when you've been somewhere and log a note. Build a personal record of everywhere you've gone.",
        },
      ]}
      steps={[
        {
          label: 'Save a place',
          description:
            'Search by name or paste a link. Rocco pulls in the details — address, type, hours — automatically.',
        },
        {
          label: 'Organize into lists',
          description: 'Create a list for any occasion. Add places, reorder them, share the link.',
        },
        {
          label: 'Go there',
          description: "Open the map. See what's nearby. Tap for directions. Actually go.",
        },
      ]}
      trustSignal="Free to use. No credit card."
    />
  );
}

export { ErrorBoundary };
