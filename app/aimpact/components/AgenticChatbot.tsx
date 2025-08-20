'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Bot, Send, X, Minimize2, Maximize2, Loader2, 
  Sparkles, Database, Users, Briefcase, Ticket, 
  FileText, Mail, Phone, Brain, Command, ChevronLeft, ChevronRight, User, Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  actions?: any[]
  status?: 'thinking' | 'executing' | 'complete' | 'error'
  metadata?: {
    module?: string
    actionType?: string
    affectedEntities?: any[]
  }
}

interface AgenticChatbotProps {
  onNavigate?: (tab: string, data?: any) => void
  currentContext?: {
    module: string
    entityId?: string
    entityType?: string
  }
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export default function AgenticChatbot({ 
  onNavigate, 
  currentContext, 
  isCollapsed = false, 
  onCollapsedChange 
}: AgenticChatbotProps) {
  // Load messages from localStorage or use default
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus-chat-messages')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Convert timestamp strings back to Date objects
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        } catch (e) {
          console.error('Failed to parse saved messages:', e)
        }
      }
    }
    return [
      {
        id: '1',
        role: 'assistant',
        content: `Hello! I'm NEXUS, your AI assistant with full control over AImpact.

What would you like me to help you with today?`,
        timestamp: new Date(),
        status: 'complete'
      }
    ]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [personalContext, setPersonalContext] = useState<string>('')
  const [userName, setUserName] = useState<string>('Team Member')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus-chat-messages', JSON.stringify(messages))
    }
  }, [messages])

  // Load personalized context on mount
  useEffect(() => {
    const loadPersonalContext = async () => {
      try {
        const response = await fetch('/api/team-context')
        if (response.ok) {
          const data = await response.json()
          setPersonalContext(data.context)
          
          // Extract name from context if available
          const nameMatch = data.context.match(/^# (.+?) - Personal Context/m)
          if (nameMatch) {
            setUserName(nameMatch[1])
          }
          
          // Update initial message if not default context
          if (!data.isDefault) {
            setMessages([{
              id: '1',
              role: 'assistant',
              content: `Welcome back, ${nameMatch?.[1] || 'Team Member'}! 👋

I've loaded your personal context and I'm ready to help with your specific focus areas. Based on your profile, I understand your working preferences and current projects.

What would you like to work on today?`,
              timestamp: new Date(),
              status: 'complete'
            }])
          }
        }
      } catch (error) {
        console.error('Failed to load personal context:', error)
      }
    }
    
    loadPersonalContext()
  }, [])

  // Add keyboard shortcut for toggle (Cmd/Ctrl + /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        onCollapsedChange?.(!isCollapsed)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCollapsed, onCollapsedChange])

  // Example commands for quick actions
  const quickActions = [
    { label: 'Create new client', icon: Users, command: 'Create a new client' },
    { label: 'View open tickets', icon: Ticket, command: 'Show me all open tickets' },
    { label: 'Create project', icon: Briefcase, command: 'Create a new project' },
    { label: 'Generate report', icon: FileText, command: 'Generate weekly report' }
  ]

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Add thinking message
    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Analyzing your request...',
      timestamp: new Date(),
      status: 'thinking'
    }
    setMessages(prev => [...prev, thinkingMessage])

    try {
      const response = await fetch('/api/aimpact/agentic-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: currentContext,
          personalContext: personalContext,
          history: messages.slice(-10) // Send last 10 messages for context
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      // Remove thinking message and add actual response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingMessage.id)
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          status: 'complete',
          actions: data.actions,
          metadata: data.metadata
        }]
      })

      // Execute any navigation actions
      if (data.actions) {
        for (const action of data.actions) {
          if (action.type === 'navigate' && onNavigate) {
            onNavigate(action.target, action.data)
          }
        }
      }
    } catch (error) {
      console.error('Chatbot error:', error)
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingMessage.id)
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: 'I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
          status: 'error'
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (command: string) => {
    setInput(command)
    inputRef.current?.focus()
  }

  return (
    <>
      {/* Collapsed state - show button to open */}
      {isCollapsed && (
        <motion.div 
          initial={{ x: 100 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50"
        >
          <div className="relative group">
            {/* Tooltip */}
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Open AI Assistant (⌘/)
            </div>
            <Button
              onClick={() => onCollapsedChange?.(false)}
              className="rounded-l-lg rounded-r-none h-32 px-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-2xl border-0 transition-all hover:px-5 hover:shadow-purple-500/25"
              title="Open NEXUS AI Assistant (⌘/)"
            >
              <div className="flex flex-col items-center gap-2">
                <Bot className="h-6 w-6" />
                <span className="text-xs font-semibold">NEXUS</span>
                <ChevronLeft className="h-4 w-4 animate-pulse" />
              </div>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Right Sidebar - Wider on large screens */}
      <motion.div
        initial={{ x: 600 }}
        animate={{ x: isCollapsed ? 600 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 h-screen w-96 lg:w-[480px] xl:w-[560px] 2xl:w-[640px] bg-black/20 backdrop-blur-sm border-l z-40 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="h-5 w-5 text-purple-500" />
                <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">NEXUS AI</h3>
                <p className="text-xs text-muted-foreground">
                  {personalContext ? `Personalized for ${userName}` : 'Agentic Assistant'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-white/10 hover:bg-white/20 border-white/20 transition-all"
                onClick={() => {
                  const initialMessage = {
                    id: '1',
                    role: 'assistant' as const,
                    content: `Hello! I'm NEXUS, your AI assistant with full control over AImpact.\n\nWhat would you like me to help you with today?`,
                    timestamp: new Date(),
                    status: 'complete' as const
                  }
                  setMessages([initialMessage])
                  localStorage.removeItem('nexus-chat-messages')
                }}
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-white/10 hover:bg-white/20 border-white/20 transition-all"
                onClick={() => onCollapsedChange?.(true)}
                title="Collapse AI Assistant (⌘/)"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </Button>
            </div>
          </div>
        </div>

        {/* Context Badge */}
        {currentContext && (
          <div className="px-4 py-2 border-b bg-muted/50">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                Context: {currentContext.module}
              </Badge>
              {currentContext.entityType && (
                <Badge variant="outline" className="text-xs">
                  {currentContext.entityType}: {currentContext.entityId}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className={message.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'}>
                      {message.role === 'user' ? 'U' : 'N'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className={`rounded-lg px-3 py-2 ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : message.status === 'error'
                        ? 'bg-red-500/10 border border-red-500/50'
                        : 'bg-muted'
                    }`}>
                      {message.status === 'thinking' && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-sm">{message.content}</span>
                        </div>
                      )}
                      {message.status === 'executing' && (
                        <div className="flex items-center gap-2">
                          <Command className="h-3 w-3 animate-pulse" />
                          <span className="text-sm">{message.content}</span>
                        </div>
                      )}
                      {(message.status === 'complete' || message.status === 'error' || !message.status) && (
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>
                    
                    {/* Show executed actions */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.actions.map((action, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {action.type}: {action.description}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Metadata */}
                    {message.metadata?.module && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Module: {message.metadata.module} | Action: {message.metadata.actionType}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t">
          <div className="flex gap-1 overflow-x-auto">
            {quickActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap"
                onClick={() => handleQuickAction(action.command)}
              >
                <action.icon className="h-3 w-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything or give me a command..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-center space-y-1">
            <p>Powered by AImpact Nexus Orchestrator</p>
            <p className="opacity-50">Press ⌘/ to toggle</p>
          </div>
        </div>
      </motion.div>
    </>
  )
}