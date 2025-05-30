import { getAuth } from '@clerk/react-router/ssr.server'
import { motion } from 'framer-motion'
import { redirect } from 'react-router'
import { HeroSection } from '../components/home'
import type { Route } from './+types/home'

export function meta(args: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ]
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/chat')
  }

  return { userId }
}

export default function Home() {
  return (
    <div className="flex flex-col items-center relative overflow-hidden">
      {/* Floating abstract shapes */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary/10 backdrop-blur-xl"
          animate={{
            x: [0, 10, -10, 0],
            y: [0, -10, 10, 0],
          }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 20, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-40 right-20 w-96 h-96 rounded-full bg-secondary/10 backdrop-blur-xl"
          animate={{
            x: [0, -15, 15, 0],
            y: [0, 15, -15, 0],
          }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 25, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-accent/10 backdrop-blur-xl"
          animate={{
            x: [0, 20, -20, 0],
            y: [0, -20, 20, 0],
          }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 30, ease: 'easeInOut' }}
        />
      </div>

      <HeroSection />
    </div>
  )
}
