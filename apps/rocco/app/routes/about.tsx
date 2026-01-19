import { motion, type Variants } from 'framer-motion';
import { BookmarkCheck, MapPin, Share2, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import ErrorBoundary from '~/components/ErrorBoundary';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeInOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export default function AboutPage() {
  return (
    <div className="text-gray-900">
      <motion.section
        className="relative py-24 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-8"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 tracking-tight leading-[1.1] max-w-4xl">
            Your places.
            <br />
            Your stories.
          </h1>
          <p className="mt-8 text-xl sm:text-2xl text-gray-600 max-w-2xl leading-relaxed font-light">
            Stop losing track of places you want to visit. Organize them into lists, share with
            friends, and actually go.
          </p>
        </div>
      </motion.section>

      {/* Problem/Solution Section */}
      <motion.section
        className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-gray-100"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={staggerContainer}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeIn} className="mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6">
              You know this feeling
            </h2>
            <p className="text-xl text-gray-600 font-light leading-relaxed">
              Your friend texts you a restaurant recommendation. You save it... somewhere. Three
              months later, you're in that neighborhood and can't remember the name.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-16">
            <motion.div variants={fadeIn}>
              <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center mb-5">
                <BookmarkCheck className="text-white" size={20} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-medium mb-3">Never lose a place</h3>
              <p className="text-gray-600 leading-relaxed font-light">
                Save restaurants, bars, parks, and more in organized lists you can actually find
                later.
              </p>
            </motion.div>

            <motion.div variants={fadeIn}>
              <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center mb-5">
                <MapPin className="text-white" size={20} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-medium mb-3">See it on a map</h3>
              <p className="text-gray-600 leading-relaxed font-light">
                Visualize your saved places. Plan your day based on what's nearby, not what you
                remember.
              </p>
            </motion.div>

            <motion.div variants={fadeIn}>
              <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center mb-5">
                <Share2 className="text-white" size={20} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-medium mb-3">Share with anyone</h3>
              <p className="text-gray-600 leading-relaxed font-light">
                Collaborate on lists with friends. Perfect for trip planning or neighborhood guides.
              </p>
            </motion.div>

            <motion.div variants={fadeIn}>
              <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center mb-5">
                <Sparkles className="text-white" size={20} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-medium mb-3">Beautiful & simple</h3>
              <p className="text-gray-600 leading-relaxed font-light">
                No clutter. No learning curve. Just a clean interface that gets out of your way.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Origin Story Section */}
      <motion.section
        className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gray-50"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeIn}
      >
        <div>
          <h2 className="text-3xl sm:text-4xl font-semibold mb-10">How it started</h2>
          <div className="space-y-6 text-lg text-gray-600 leading-relaxed font-light">
            <p>
              We built Rocco because we were frustrated. Scattered notes. Random screenshots. Pins
              on maps that meant nothing weeks later.
            </p>
            <p>
              There had to be a better way to remember the coffee shop your colleague mentioned, or
              organize that list of date night ideas, or share your favorite spots with visiting
              friends.
            </p>
            <p className="text-gray-900">
              So we built the tool we wished existed: simple enough to use every day, powerful
              enough to replace all those other systems.
            </p>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 max-w-2xl">
            Start organizing your world
          </h2>
          <p className="text-xl text-gray-600 mb-10 font-light max-w-xl">
            Free to use. No credit card needed. Create your first list in under a minute.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white py-3.5 px-8 bg-gray-900 rounded-lg font-medium text-base hover:bg-gray-800 transition-colors"
          >
            Get Started
          </Link>
        </motion.div>
      </section>
    </div>
  );
}

export { ErrorBoundary };
