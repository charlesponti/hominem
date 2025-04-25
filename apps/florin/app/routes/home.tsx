import { useUser } from '@clerk/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const { user, isLoaded } = useUser()
  const navigate = useNavigate()
  const heroRef = useRef<HTMLDivElement | null>(null)
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const footerRef = useRef<HTMLDivElement | null>(null)

  // Redirect authenticated users
  useEffect(() => {
    if (isLoaded && user) {
      navigate('/finance', { replace: true })
    }
  }, [isLoaded, user, navigate])

  useEffect(() => {
    setIsVisible(true)
    const sections = [heroRef, ctaRef, footerRef]

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeIn', 'opacity-100')
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
    <div className="relative min-h-screen flex flex-col">
      {/* Hero section */}
      <section className="relative flex-grow flex items-center py-24 md:py-36">
        <div
          ref={heroRef}
          className={cn(
            'container mx-auto px-6 md:px-12 opacity-0 transition-opacity duration-1000',
            isVisible && 'opacity-100'
          )}
        >
          <div className="flex flex-col items-center mb-16 md:mb-24">
            <div className="flex items-center mb-6">
              <div className="h-[1px] w-12 bg-black dark:bg-white mr-4" />
              <span className="text-sm uppercase tracking-luxury">Hominem</span>
              <div className="h-[1px] w-12 bg-black dark:bg-white ml-4" />
            </div>
          </div>

          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-light mb-8 leading-tight tracking-tight animate-borderReveal">
              Our mission is to accelerate the useful and creative applications of AI.
            </h1>
            <Button className="mt-12 px-8 py-6 h-auto text-sm rounded-none bg-black hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 tracking-luxury transition-luxury">
              View all open roles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Image section */}
      <section className="w-full h-[70vh] overflow-hidden bg-gray-100 dark:bg-gray-800">
        <div className="relative h-full w-full">
          <div className="absolute inset-0 bg-black/10 dark:bg-black/30" />
          <img
            src="/office-image.jpg"
            alt="Modern office space with natural light"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div
          ref={ctaRef}
          className="container mx-auto px-6 md:px-12 opacity-0 transition-opacity duration-1000 delay-300"
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl md:text-4xl font-light mb-8 leading-luxury tracking-tight luxury-text-shadow">
              Join us in creating thoughtful, sophisticated tools that empower people to do their
              best work.
            </h2>
            <div className="mt-12">
              <Button className="px-8 py-6 h-auto text-sm rounded-none bg-black hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 tracking-luxury transition-luxury">
                Learn more about our approach
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 dark:border-gray-800">
        <div
          ref={footerRef}
          className="container mx-auto px-6 md:px-12 opacity-0 transition-opacity duration-1000 delay-500"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="mb-6 md:mb-0">
              <p className="text-sm tracking-luxury">
                © {new Date().getFullYear()} Hominem. All rights reserved.
              </p>
            </div>
            <div className="flex gap-8">
              <a
                href="/about"
                className="text-sm tracking-wider hover:opacity-70 transition-luxury"
              >
                About
              </a>
              <a
                href="/careers"
                className="text-sm tracking-wider hover:opacity-70 transition-luxury"
              >
                Careers
              </a>
              <a
                href="/privacy"
                className="text-sm tracking-wider hover:opacity-70 transition-luxury"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-sm tracking-wider hover:opacity-70 transition-luxury"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
