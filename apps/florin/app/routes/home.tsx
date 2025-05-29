import { SignUpButton, useUser } from '@clerk/react-router'
import { ArrowRight, BarChart2 } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import styles from './home.module.css'

export function meta() {
  return [
    { title: 'Florin - Personal Finance Made Simple' },
    {
      name: 'description',
      content:
        "Take control of your financial future with Florin's simple, powerful tools. Track all your accounts, categorize transactions automatically, and gain visual insights into your spending.",
    },
  ]
}

export default function Home() {
  const { user, isLoaded } = useUser()
  const navigate = useNavigate()

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isLoaded && user) {
      navigate('/finance', { replace: true })
    }
  }, [isLoaded, user, navigate])

  if (!isLoaded || (isLoaded && user)) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background gradient */}
      <div className={styles.heroGradient} />

      <main className="flex-grow flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-4xl w-full text-center">
          {/* Hero Section */}
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 tracking-tighter">
            Take control of <span className="text-green-600 italic">your money.</span>
          </h1>
          <h2 className="font-sans text-xl font-bold text-center mb-12 text-gray-500">
            Everything you need to understand, plan, and control your money
          </h2>

          {/* CTA Button */}
          <div className="mb-16">
            <SignUpButton>
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Get Started Free
                <ArrowRight className="inline-block ml-2 h-5 w-5" />
              </button>
            </SignUpButton>
            <p className="text-sm text-gray-500 mt-3">No credit card required</p>
          </div>

          {/* Dashboard Preview */}
          <div className={styles.heroImage}>
            <div className="text-white text-center">
              <BarChart2 className="h-16 w-16 mx-auto mb-4 opacity-80" />
              <p className="text-lg font-medium">Dashboard Preview</p>
              <p className="text-sm opacity-75">Coming Soon</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-gray-200">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between text-center md:text-left">
            <p className="text-sm text-gray-600 mb-4 md:mb-0">
              © {new Date().getFullYear()} Florin. All rights reserved.
            </p>
            <div className="flex gap-6 justify-center md:justify-end">
              <a href="/about" className="text-sm text-gray-600 hover:text-blue-600">
                About
              </a>
              <a href="/privacy" className="text-sm text-gray-600 hover:text-blue-600">
                Privacy
              </a>
              <a href="/terms" className="text-sm text-gray-600 hover:text-blue-600">
                Terms
              </a>
              <a href="/help" className="text-sm text-gray-600 hover:text-blue-600">
                Help
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
