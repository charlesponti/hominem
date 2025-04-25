import { useUser } from '@clerk/nextjs'
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Send,
  User as UserIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
}

export default function ChatPage() {
  const { userId, isLoaded, user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([
    {
      id: '1',
      title: 'Project Planning Discussion',
      lastMessage: 'What are the next steps for the project?',
      timestamp: new Date('2025-04-20T10:30:00'),
    },
    {
      id: '2',
      title: 'Research on Machine Learning',
      lastMessage: 'Can you explain how transformers work?',
      timestamp: new Date('2025-04-18T14:15:00'),
    },
  ])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // For protected route pattern
  if (isLoaded && !userId) {
    navigate('/sign-in', { replace: true })
    return null
  }

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `This is a simulated response to: "${inputValue}"`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }

  const createNewChat = () => {
    const newChatId = Date.now().toString()
    const newChat: ChatHistory = {
      id: newChatId,
      title: 'New Conversation',
      lastMessage: '',
      timestamp: new Date(),
    }

    setChatHistories((prev) => [newChat, ...prev])
    setActiveChatId(newChatId)
    setMessages([])
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] pb-8">
      {/* Chat sidebar */}
      <div className="w-64 border-r h-full flex flex-col">
        <div className="p-4">
          <Button
            variant="outline"
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {chatHistories.map((chat) => (
              <Button
                key={chat.id}
                variant={chat.id === activeChatId ? 'secondary' : 'ghost'}
                className="w-full justify-start text-sm overflow-hidden"
                onClick={() => setActiveChatId(chat.id)}
              >
                <div className="truncate">
                  <span className="font-medium">{chat.title}</span>
                  <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Messages area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  Ask me anything - from complex technical questions to creative brainstorming.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-8 max-w-2xl">
                  <Card className="p-4 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-start">
                      <BookOpen className="h-4 w-4 mr-2 mt-1 text-primary" />
                      <div>
                        <h3 className="text-sm font-medium">Research question</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          "Can you explain how transformers work in machine learning?"
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-start">
                      <FileText className="h-4 w-4 mr-2 mt-1 text-primary" />
                      <div>
                        <h3 className="text-sm font-medium">Document summary</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          "Summarize the main points from my last meeting notes"
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'assistant' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`flex max-w-[80%] ${
                      message.role === 'assistant'
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-primary text-primary-foreground'
                    } rounded-lg px-4 py-2`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {message.role === 'assistant' ? (
                          <Bot className="h-3 w-3" />
                        ) : (
                          <UserIcon className="h-3 w-3" />
                        )}
                        <span className="text-xs font-medium">
                          {message.role === 'assistant' ? 'AI Assistant' : user?.fullName || 'You'}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
