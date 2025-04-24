'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import {
  ArrowRight,
  BarChart3,
  BookText,
  Briefcase,
  Calendar,
  MessageSquare,
  PlaneTakeoff,
  Star,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function Page() {
  const [isVisible, setIsVisible] = useState(false)
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const heroRef = useRef<HTMLDivElement | null>(null)
  const featuresRef = useRef<HTMLDivElement | null>(null)
  const howItWorksRef = useRef<HTMLDivElement | null>(null)
  const testimonialRef = useRef<HTMLDivElement | null>(null)

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && user) {
      router.push('/dashboard')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    setIsVisible(true)
    const sections = [ctaRef, heroRef, featuresRef, howItWorksRef, testimonialRef]

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeInUp', 'opacity-100')
          }
        }
      },
      { threshold: 0.1 }
    )

    for (const ref of sections) {
      if (ref.current) observer.observe(ref.current)
    }

    return () => {
      for (const ref of sections) {
        if (ref.current) observer.unobserve(ref.current)
      }
    }
  }, [])

  if (!isLoaded || (isLoaded && user)) {
    return null
  }

  return (
    <div className="relative max-w-[100vw] space-y-8">
      {/* Hero section */}
      <section className="relative py-20 md:py-32">
        <div
          ref={heroRef}
          className={cn(
            'container mx-auto px-4 text-center opacity-0',
            isVisible && 'animate-fadeInUp opacity-100'
          )}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400">
              Your Life, Organized
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
            The all-in-one platform to organize, track, and optimize your personal and professional
            life.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Button
              size="lg"
              className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-semibold"
            >
              Get Started Free
              <div className="absolute right-0 -mt-12 h-32 w-8 transform translate-x-12 rotate-12 bg-white opacity-10 transition-transform duration-700 ease-in-out group-hover:-translate-x-40" />
            </Button>
            <Button size="lg" variant="outline" className="group">
              Take the Tour
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* App screenshot mockup */}
          <div className="relative mx-auto max-w-5xl">
            <div className="rounded-xl shadow-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="h-8 bg-gray-100 dark:bg-gray-700 flex items-center px-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-5 h-[400px]">
                <div className="col-span-1 border-r border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="h-8 w-full bg-gray-100 dark:bg-gray-700 rounded-md" />
                    <div className="h-6 w-4/5 bg-gray-100 dark:bg-gray-700 rounded-md" />
                    <div className="h-6 w-4/5 bg-gray-100 dark:bg-gray-700 rounded-md" />
                    <div className="h-6 w-4/5 bg-gray-100 dark:bg-gray-700 rounded-md" />
                    <div className="h-6 w-4/5 bg-gray-100 dark:bg-gray-700 rounded-md" />
                    <div className="mt-4 h-0.5 w-full bg-gray-100 dark:bg-gray-700" />
                    <div className="h-6 w-4/5 bg-gray-100 dark:bg-gray-700 rounded-md" />
                    <div className="h-6 w-4/5 bg-gray-100 dark:bg-gray-700 rounded-md" />
                  </div>
                </div>
                <div className="col-span-4 p-4">
                  <div className="flex justify-between mb-6">
                    <div className="h-8 w-48 bg-gray-100 dark:bg-gray-700 rounded-md" />
                    <div className="h-8 w-24 bg-blue-500 rounded-md" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[...Array(6)].map(() => (
                      <div
                        key={crypto.getRandomValues(new Uint32Array(1))[0]}
                        className="h-40 bg-gray-100 dark:bg-gray-700 rounded-lg p-4"
                      >
                        <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-600 rounded-md mb-2" />
                        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-600 rounded-md mb-4" />
                        <div className="h-16 w-full bg-gray-200 dark:bg-gray-600 rounded-md" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div ref={featuresRef} className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Organize Every Aspect of Your Life
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Powerful tools to help you track, manage, and optimize your personal and professional
              journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Briefcase className="h-6 w-6" />,
                title: 'Career Tracking',
                description:
                  'Track job applications, interviews, and networking opportunities in one place.',
              },
              {
                icon: <Calendar className="h-6 w-6" />,
                title: 'Smart Calendar',
                description:
                  'Manage your schedule with AI-powered time optimization and reminders.',
              },
              {
                icon: <PlaneTakeoff className="h-6 w-6" />,
                title: 'Travel Planning',
                description: 'Plan trips, track expenses, and discover new destinations with ease.',
              },
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: 'Finance Dashboard',
                description: 'Track expenses, manage budgets, and optimize your financial health.',
              },
              {
                icon: <BookText className="h-6 w-6" />,
                title: 'Knowledge Base',
                description: 'Save and organize articles, notes, and documents for easy reference.',
              },
              {
                icon: <MessageSquare className="h-6 w-6" />,
                title: 'AI Assistant',
                description: 'Get personalized recommendations and insights to improve your life.',
              },
            ].map((feature) => (
              <div
                key={crypto.getRandomValues(new Uint32Array(1))[0]}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div ref={testimonialRef} className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Join thousands of people who have transformed their productivity and organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Alex Johnson',
                role: 'Marketing Manager',
                content:
                  'This app completely transformed how I track my job applications. I landed my dream job after just 3 weeks of using it!',
              },
              {
                name: 'Sarah Williams',
                role: 'Freelance Designer',
                content:
                  'The finance tools helped me understand where my money was going and increase my savings by 30% in just two months.',
              },
              {
                name: 'Michael Chen',
                role: 'Software Engineer',
                content:
                  'As someone who travels frequently, the trip planning features are game-changing. Everything I need in one place!',
              },
            ].map((testimonial) => (
              <div
                key={crypto.getRandomValues(new Uint32Array(1))[0]}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold">
                    {testimonial.name[0]}
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 italic">
                  &quot;{testimonial.content}&quot;
                </p>
                <div className="mt-4 flex text-yellow-400">
                  {[...Array(5)].map(() => (
                    <Star
                      size={20}
                      key={crypto.getRandomValues(new Uint32Array(1))[0]}
                      className="mr-1"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div ref={ctaRef} className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-3xl p-10 md:p-16 text-white text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to transform your life?</h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
              Join thousands of users who have already improved their productivity, organization,
              and peace of mind.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <h3 className="text-lg font-bold mb-4">Hominem</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your all-in-one platform for personal and professional management.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Testimonials', 'FAQ', 'Privacy Policy'].map((item) => (
                  <li key={crypto.getRandomValues(new Uint32Array(1))[0]}>
                    <a
                      href="/meow"
                      className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                {['Blog', 'Help Center', 'Guides', 'API Docs', 'Community'].map((item) => (
                  <li key={crypto.getRandomValues(new Uint32Array(1))[0]}>
                    <a
                      href="/meow"
                      className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                {['About Us', 'Careers', 'Contact', 'Press', 'Partners'].map((item) => (
                  <li key={crypto.getRandomValues(new Uint32Array(1))[0]}>
                    <a
                      href="/meow"
                      className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 text-center text-gray-500 dark:text-gray-400">
            <p>© {new Date().getFullYear()} Hominem. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
