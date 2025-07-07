import { MessageSquare, Search, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useDeleteChat } from '~/lib/hooks/use-delete-chat'
import { trpc } from '~/lib/trpc-client'
import { formatChatDate } from '~/lib/utils/date-utils'

interface ChatListProps {
  userId: string
  onChatSelect?: () => void
  showSearch?: boolean
}

export function ChatList({ userId, onChatSelect, showSearch = false }: ChatListProps) {
  const navigate = useNavigate()
  const { chatId: currentChatId } = useParams()
  const [searchQuery, setSearchQuery] = useState('')

  // Get chats for the user
  const chatsQuery = trpc.chats.getUserChats.useQuery(
    { limit: 50 },
    {
      enabled: !!userId && userId !== 'anonymous',
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  )
  const { deleteChat } = useDeleteChat(userId)

  const chats = chatsQuery.data || []
  const isChatsLoading = chatsQuery.isLoading

  // Filter chats based on search query if search is enabled
  const filteredChats =
    showSearch && searchQuery
      ? chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : chats

  const handleDeleteChat = useCallback(
    async (chatId: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (window.confirm('Are you sure you want to delete this chat?')) {
        deleteChat({ chatId })
        if (currentChatId === chatId) {
          navigate('/chat')
        }
      }
    },
    [deleteChat, currentChatId, navigate]
  )

  const handleChatSelect = useCallback(() => {
    onChatSelect?.()
  }, [onChatSelect])

  const renderChatList = () => {
    if (isChatsLoading) {
      return <div className="p-4 text-center text-muted-foreground">Loading chats...</div>
    }

    if (filteredChats.length === 0) {
      const message = showSearch && searchQuery ? 'No chats found' : 'No chats yet'
      return <div className="p-4 text-center text-muted-foreground">{message}</div>
    }

    return (
      <div className="p-2">
        {filteredChats.map((chat) => (
          <RouterLink
            key={chat.id}
            to={`/chat/${chat.id}`}
            onClick={handleChatSelect}
            className={`block p-3 rounded-lg mb-2 hover:bg-muted/50 transition-colors group ${
              currentChatId === chat.id ? 'bg-muted' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <h3 className="text-sm font-medium truncate">{chat.title || 'Untitled Chat'}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{formatChatDate(chat.updatedAt)}</p>
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
    )
  }

  if (!showSearch) {
    return <div className="flex-1 overflow-y-auto">{renderChatList()}</div>
  }

  return (
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
      <div className="flex-1 overflow-y-auto">{renderChatList()}</div>
    </>
  )
}
