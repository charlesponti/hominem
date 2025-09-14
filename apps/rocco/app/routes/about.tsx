import { motion } from 'framer-motion'
import { Building, Compass, Heart, Users } from 'lucide-react'
import { Link } from 'react-router'
import styles from './about.module.css'

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
}

export default function AboutPage() {
  return (
    <div className="bg-white text-gray-800">
      {/* Hero Section */}
      <motion.section
        className={`relative text-center py-24 px-4 sm:px-6 lg:px-8 ${styles.heroGradient}`}
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <div className="absolute inset-0 bg-black opacity-10" />
        <div className="relative max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
            We're building the future of personal discovery.
          </h1>
          <p className="mt-6 text-xl text-gray-700 max-w-2xl mx-auto">
            Rocco is more than just a map. It's a new way to experience your world, remember your
            journeys, and plan your next adventure with the people you care about.
          </p>
        </div>
      </motion.section>

      {/* Our Story Section */}
      <motion.section
        className="py-20 px-4 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Story
          </motion.h2>
          <motion.div variants={fadeIn} className="prose prose-lg max-w-none text-gray-600">
            <p>
              It all started with a simple problem: a long list of saved places in a notes app, a
              cluttered map with hundreds of pins, and no easy way to share them. We wanted a
              beautiful, intuitive tool to not only track our favorite spots but to weave them into
              stories and share them with friends.
            </p>
            <p>
              We realized that memories are tied to places, and sharing those places is a way of
              sharing experiences. That's why we built Rocco—to be the canvas for your life's map.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Core Values Section */}
      <motion.section
        className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="max-w-5xl mx-auto">
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Core Values
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div variants={fadeIn} className="text-center p-6">
              <Compass size={40} className="mx-auto text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Fuel Discovery</h3>
              <p className="text-gray-600">
                Inspire curiosity and make it easy to explore the world around you.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="text-center p-6">
              <Heart size={40} className="mx-auto text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Design with Heart</h3>
              <p className="text-gray-600">
                Craft beautiful, intuitive experiences that are a joy to use.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="text-center p-6">
              <Users size={40} className="mx-auto text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Connect People</h3>
              <p className="text-gray-600">
                Build tools that help people share experiences and create memories.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="text-center p-6">
              <Building size={40} className="mx-auto text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Build to Last</h3>
              <p className="text-gray-600">
                Create a sustainable company that will serve our community for years to come.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to start your journey?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Create your first list for free. No credit card required.
          </p>
          <Link
            to="/"
            className="inline-block text-white py-4 px-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
          >
            Explore the Map
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
