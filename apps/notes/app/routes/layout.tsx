import { Outlet, useLocation, useSearchParams } from 'react-router'
import { useEffect } from 'react'
import { MainNavigation } from '~/components/main-navigation'
import { Toaster } from '~/components/ui/toaster'
import { useToast } from '~/components/ui/use-toast'

export default function Layout() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const error = searchParams.get('error')
    const description = searchParams.get('description') || searchParams.get('error_description')

    // Show toast for errors from URL params
    if (error) {
      toast({
        variant: 'destructive',
        title: error,
        description: description ?? undefined,
      })

      // Clear the error params from URL without refreshing
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('error')
      newParams.delete('description')
      newParams.delete('error_description')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, location.pathname, toast, setSearchParams])

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <MainNavigation />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
