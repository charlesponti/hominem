import { motion } from 'framer-motion'
import { Link, redirect } from 'react-router'
import { getServerSession } from '~/lib/supabase/server'
import type { Route } from './+types/home'

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'Hominem - Your AI Personal Assistant' },
    {
      name: 'description',
      content: 'Transform your productivity with an intelligent AI assistant that understands you.',
    },
  ]
}

export async function loader(args: Route.LoaderArgs) {
  const { user } = await getServerSession(args.request)

  if (user) {
    return redirect('/chat')
  }
}

export default function Home() {
  return (
    <div className="flex flex-col items-center relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20"
          >
            ✨ Your AI-Powered Personal Assistant
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight"
          >
            Meet{' '}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              Hominem
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-xl sm:text-2xl text-muted-foreground max-w-3xl leading-relaxed"
          >
            Transform your productivity with an intelligent AI assistant that understands your
            needs, anticipates your goals, and helps you achieve more every day.
          </motion.p>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12"
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="font-semibold">Intelligent</h3>
              <p className="text-sm text-muted-foreground text-center">
                Advanced AI that learns from your preferences
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground text-center">
                Instant responses and real-time assistance
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold">Secure</h3>
              <p className="text-sm text-muted-foreground text-center">
                Your privacy and data security come first
              </p>
            </div>
          </motion.div>

          {/* Call to Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12"
          >
            <Link
              to="/chat"
              className="inline-flex items-center px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Start Chatting
              <span className="ml-2">→</span>
            </Link>
          </motion.div>

          {/* Stats or Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 mt-16 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Always Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Constantly Learning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Personalized Experience</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Subtle scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
          className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            className="w-1 h-3 bg-muted-foreground/50 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
