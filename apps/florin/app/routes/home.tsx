import { useSupabaseAuthContext } from '@hominem/ui'
import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'

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
  const { user, isLoading, supabase } = useSupabaseAuthContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/finance', { replace: true })
    }
  }, [isLoading, user, navigate])

  const handleSignIn = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`,
      },
    })
  }, [supabase.auth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="grow flex flex-col items-center justify-center px-6 py-16">
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
            <button
              type="button"
              onClick={handleSignIn}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Get Started Free
              <ArrowRight className="inline-block ml-2 h-5 w-5" />
            </button>
            <p className="text-sm text-gray-500 mt-3">No credit card required</p>
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
