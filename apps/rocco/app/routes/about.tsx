import { BookmarkCheck, MapPin, Share2, Sparkles } from 'lucide-react';
import { Link } from 'react-router';

import ErrorBoundary from '~/components/ErrorBoundary';

export default function AboutPage() {
  return (
    <div className="text-foreground">
      <section className="relative py-24 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-foreground tracking-tight leading-[1.1] max-w-4xl">
            Your places.
            <br />
            Your stories.
          </h1>
          <p className="mt-8 text-xl sm:text-2xl text-muted-foreground max-w-2xl leading-relaxed font-light">
            Stop losing track of places you want to visit. Organize them into lists, share with
            friends, and actually go.
          </p>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6">
              You know this feeling
            </h2>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">
              Your friend texts you a restaurant recommendation. You save it... somewhere. Three
              months later, you're in that neighborhood and can't remember the name.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-16">
            <div>
              <div className="w-10 h-10 border border-primary flex items-center justify-center mb-5">
                <BookmarkCheck className="text-primary" size={20} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-medium mb-3">Never lose a place</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                Save restaurants, bars, parks, and more in organized lists you can actually find
                later.
              </p>
            </div>

            <div>
              <div className="w-10 h-10 border border-primary flex items-center justify-center mb-5">
                <MapPin className="text-primary" size={20} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-medium mb-3">See it on a map</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                Visualize your saved places. Plan your day based on what's nearby, not what you
                remember.
              </p>
            </div>

            <div>
              <div className="w-10 h-10 border border-primary flex items-center justify-center mb-5">
                <Share2 className="text-primary" size={20} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-medium mb-3">Share with anyone</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                Collaborate on lists with friends. Perfect for trip planning or neighborhood guides.
              </p>
            </div>

            <div>
              <div className="w-10 h-10 border border-primary flex items-center justify-center mb-5">
                <Sparkles className="text-primary" size={20} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-medium mb-3">Beautiful & simple</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                No clutter. No learning curve. Just a clean interface that gets out of your way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Origin Story Section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-b border-border">
        <div>
          <h2 className="text-3xl sm:text-4xl font-semibold mb-10">How it started</h2>
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed font-light">
            <p>
              We built Rocco because we were frustrated. Scattered notes. Random screenshots. Pins
              on maps that meant nothing weeks later.
            </p>
            <p>
              There had to be a better way to remember the coffee shop your colleague mentioned, or
              organize that list of date night ideas, or share your favorite spots with visiting
              friends.
            </p>
            <p className="text-foreground">
              So we built the tool we wished existed: simple enough to use every day, powerful
              enough to replace all those other systems.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 max-w-2xl">
            Start organizing your world
          </h2>
          <p className="text-xl text-muted-foreground mb-10 font-light max-w-xl">
            Free to use. No credit card needed. Create your first list in under a minute.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary py-3.5 px-8 border border-primary font-medium text-base"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}

export { ErrorBoundary };
