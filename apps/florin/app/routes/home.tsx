import { useUser } from '@clerk/react-router'
import {
  ArrowRight,
  BarChart2,
  CreditCard,
  LineChart,
  PlusCircle,
  Upload,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import styles from './home.module.css'

export function meta() {
  return [
    { title: 'Florin - Get Started with Personal Finance' },
    {
      name: 'description',
      content: "Take control of your financial future with Florin's simple, powerful tools.",
    },
  ]
}

export default function Home() {
  const { user, isLoaded } = useUser()
  const navigate = useNavigate()
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isLoaded && user) {
      navigate('/finance', { replace: true })
    }
  }, [isLoaded, user, navigate])

  if (!isLoaded || (isLoaded && user)) {
    return null
  }

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option)
  }

  const handleGetStarted = () => {
    if (selectedOption) {
      navigate('/login', { state: { onboardingOption: selectedOption } })
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-3">
            How would you like to get started?
          </h1>
          <p className="text-gray-600 text-center mb-12 md:text-lg">
            Choose an option to customize your experience
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {/* Option 1: Manual setup */}
            <button
              type="button"
              className={`${styles.onboardingCard} ${selectedOption === 'manual' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => handleOptionSelect('manual')}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <PlusCircle className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start from scratch</h3>
              <p className="text-gray-600 text-sm">Manually add your accounts and transactions</p>
            </button>

            {/* Option 2: Upload data */}
            <button
              type="button"
              className={`${styles.onboardingCard} ${selectedOption === 'upload' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => handleOptionSelect('upload')}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Upload className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload statements</h3>
              <p className="text-gray-600 text-sm">
                Import CSV files from your bank or credit card
              </p>
            </button>

            {/* Option 3: Demo data */}
            <button
              type="button"
              className={`${styles.onboardingCard} ${selectedOption === 'demo' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => handleOptionSelect('demo')}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <BarChart2 className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Try a demo</h3>
              <p className="text-gray-600 text-sm">
                Explore with sample data to see how Florin works
              </p>
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleGetStarted}
              className={`py-3 px-8 rounded-md font-medium text-white transition-all ${selectedOption ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
              disabled={!selectedOption}
            >
              Get Started
              <ArrowRight className="inline-block ml-2 h-4 w-4" />
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-center mb-6">Why people love Florin</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <Wallet className="text-blue-600 h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">All accounts in one place</h3>
                <p className="text-gray-600 text-sm">
                  Track checking, savings, credit cards, and investments
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="text-blue-600 h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">Automatic categorization</h3>
                <p className="text-gray-600 text-sm">
                  We sort your transactions so you don't have to
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <LineChart className="text-blue-600 h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">Visual insights</h3>
                <p className="text-gray-600 text-sm">
                  See where your money goes with clear charts and reports
                </p>
              </div>
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
