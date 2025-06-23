import type { Chat } from '@hominem/utils/schema'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Menu, MessageSquare, Plus, Search, Trash2, User } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet'
import { useChats } from '~/lib/hooks/use-chat-persistence'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'
import { cn } from '~/lib/utils'

interface AppSidebarProps {
  userId?: string
  onNewChat?: () => void
}

export function AppSidebar({ userId, onNewChat }: AppSidebarProps) {
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()
  const { chatId: currentChatId } = useParams()
  const { getUser, supabase } = useSupabaseAuth()

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const isLoggedIn = !isLoading && (user || userId)
  const effectiveUserId = userId || user?.id

  // Get chats if user is logged in
  const { chats, isLoading: isChatsLoading, deleteChat } = useChats(effectiveUserId || '')

  // Get user on mount if not provided via props
  useEffect(() => {
    if (!userId) {
      const loadUser = async () => {
        try {
          const currentUser = await getUser()
          setUser(currentUser)
        } catch (error) {
          console.error('Error loading user:', error)
        } finally {
          setIsLoading(false)
        }
      }
      loadUser()
    } else {
      setIsLoading(false)
    }
  }, [getUser, userId])

  // Check if mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const filteredChats = chats.filter((chat: Chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (window.confirm('Are you sure you want to delete this chat?')) {
      deleteChat(chatId)
      if (currentChatId === chatId) {
        navigate('/chat')
      }
    }
  }

  const handleNewChatClick = useCallback(() => {
    if (onNewChat) {
      onNewChat()
    } else {
      navigate('/chat')
    }
    setIsMobileSidebarOpen(false)
  }, [onNewChat, navigate])

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

  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()

    // Reset time to start of day for accurate comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffInMs = today.getTime() - chatDate.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return 'Today'
    }
    if (diffInDays === 1) {
      return 'Yesterday'
    }
    if (diffInDays > 0 && diffInDays < 7) {
      return `${diffInDays} days ago`
    }
    return date.toLocaleDateString()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Header with Logo */}
      <div className="p-4 border-b flex-shrink-0">
        <RouterLink to="/" className="flex items-center space-x-2 mb-4">
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
        {isLoggedIn && (
          <>
            {/* Search */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Chat List - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {isChatsLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading chats...</div>
              ) : filteredChats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? 'No chats found' : 'No chats yet'}
                </div>
              ) : (
                <div className="p-2">
                  {filteredChats.map((chat: Chat) => (
                    <RouterLink
                      key={chat.id}
                      to={`/chat/${chat.id}`}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`block p-3 rounded-lg mb-2 hover:bg-muted/50 transition-colors group ${
                        currentChatId === chat.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <h3 className="text-sm font-medium truncate">
                              {chat.title || 'Untitled Chat'}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatChatDate(chat.updatedAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </RouterLink>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Unauthenticated state - show navigation links */}
        {!isLoggedIn && !isLoading && (
          <div className="flex-1 p-4">
            <nav className="space-y-2">
              <RouterLink
                to="/"
                className={cn(
                  'block p-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted/50',
                  pathname === '/' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                )}
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                Home
              </RouterLink>
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Profile Section - Fixed */}
      <div className="p-4 border-t flex-shrink-0">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : isLoggedIn ? (
          <RouterLink
            to="/profile"
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => setIsMobileSidebarOpen(false)}
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

  if (!isMobile) {
    return (
      <div className="w-80 flex-shrink-0 border-r">
        <SidebarContent />
      </div>
    )
  }

  // Mobile version with hamburger menu
  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background border-b md:hidden">
        <div className="flex h-16 items-center px-4">
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <RouterLink to="/" className="flex items-center space-x-2 ml-4">
            <span className="text-2xl">💬</span>
            <span className="font-bold text-lg">Chat</span>
          </RouterLink>

          <div className="flex flex-1 items-center justify-end">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
            ) : isLoggedIn ? (
              <RouterLink to="/profile">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </RouterLink>
            ) : (
              <Button size="sm" onClick={handleSignIn} disabled={isSigningIn}>
                {isSigningIn ? 'Signing in...' : 'Sign In'}
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
