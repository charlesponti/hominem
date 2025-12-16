import { AppLayout } from '@hominem/ui/components/layout/app-layout'
import { Toaster } from '@hominem/ui/components/ui/toaster'
import { useEffect } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router'
import { MainNavigation } from '~/components/main-navigation'
import { useToast } from '@hominem/ui/components/ui/use-toast'

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
    <>
      <AppLayout navigation={<MainNavigation />}>
        <Outlet />
      </AppLayout>
      <Toaster />
    </>
  )
}
