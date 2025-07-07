import { Plus, User } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router'
import { Button } from '~/components/ui/button'
import { ChatList } from '~/components/chat/ChatList'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'
import { cn } from '~/lib/utils'

interface AppSidebarProps {
  userId?: string
  onNewChat?: () => void
  isMobile?: boolean
  onClose?: () => void
}

export function AppSidebar({ userId, onNewChat, isMobile = false, onClose }: AppSidebarProps) {
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()
  const { supabase } = useSupabaseAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)

  const isLoggedIn = !!userId

  const handleNewChatClick = useCallback(() => {
    if (onNewChat) {
      onNewChat()
    } else {
      navigate('/chat')
    }
    if (isMobile && onClose) {
      onClose()
    }
  }, [onNewChat, navigate, isMobile, onClose])

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Sign in failed:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleNavigation = () => {
    if (isMobile && onClose) {
      onClose()
    }
  }

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Header with Logo */}
      <div className="p-4 border-b flex-shrink-0">
        <RouterLink to="/" className="flex items-center space-x-2 mb-4" onClick={handleNavigation}>
          <span className="text-2xl">💬</span>
          <span className="font-bold text-lg">Chat</span>
        </RouterLink>

        {isLoggedIn && (
          <Button
            onClick={handleNewChatClick}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        )}
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat functionality - only show if logged in */}
        {isLoggedIn && userId && (
          <ChatList userId={userId} onChatSelect={handleNavigation} showSearch={true} />
        )}

        {/* Unauthenticated state - show navigation links */}
        {!isLoggedIn && (
          <div className="flex-1 p-4">
            <nav className="space-y-2">
              <RouterLink
                to="/"
                className={cn(
                  'block p-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted/50',
                  pathname === '/' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                )}
                onClick={handleNavigation}
              >
                Home
              </RouterLink>
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Profile Section - Fixed */}
      <div className="p-4 border-t flex-shrink-0">
        {isLoggedIn ? (
          <RouterLink
            to="/profile"
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            onClick={handleNavigation}
          >
            <User className="h-5 w-5" />
            <span className="text-sm font-medium">Profile</span>
          </RouterLink>
        ) : (
          <Button onClick={handleSignIn} disabled={isSigningIn} className="w-full">
            {isSigningIn ? 'Signing in...' : 'Sign In'}
          </Button>
        )}
      </div>
    </div>
  )
}
