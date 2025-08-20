'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Bot, Send, X, Minimize2, Maximize2, Loader2, 
  Sparkles, Database, Users, Briefcase, Ticket, 
  FileText, Mail, Phone, Brain, Command, ChevronLeft, ChevronRight, User, GripVertical, Trash2,
  Volume2, VolumeX, AlertCircle, CheckCircle, XCircle, Eye, Paperclip, Image
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface PendingAction {
  id: string
  type: string
  parameters: any
  confirmationType: 'preview' | 'confirm' | 'draft'
  details: any
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  actions?: any[]
  pendingActions?: PendingAction[]
  status?: 'thinking' | 'executing' | 'complete' | 'error' | 'pending_confirmation'
  metadata?: {
    module?: string
    actionType?: string
    affectedEntities?: any[]
  }
}

interface ResizableAgenticChatbotProps {
  onNavigate?: (tab: string, data?: any) => void
  onOpenFloating?: (type: 'phone' | 'sms', data?: any) => void
  currentContext?: {
    module: string
    entityId?: string
    entityType?: string
  }
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  width?: number
  onWidthChange?: (width: number) => void
  className?: string
  defaultSize?: number
  hideResize?: boolean
  mobileOptimized?: boolean
}

function ResizableAgenticChatbotComponent({ 
  onNavigate,
  onOpenFloating,
  currentContext, 
  isCollapsed = false, 
  onCollapsedChange,
  width = 480,
  onWidthChange,
  className = '',
  defaultSize,
  hideResize = false,
  mobileOptimized = false
}: ResizableAgenticChatbotProps) {
  // Load messages from localStorage or use default
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus-resizable-chat-messages')
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
        content: `Hello! I'm NEXUS, your AI assistant with full control over AImpact and access to the complete Instant AI Agency knowledge base. I can:

• 📚 **AI Agency Knowledge** - Answer questions from the Instant AI Agency book
• 👥 **Create & Manage Clients** - Add leads, update contacts, convert to customers
• 📇 **Process Business Cards** - Upload an image using the 📷 button or paste contact details
• 📁 **Handle Projects** - Create projects, assign tasks, update milestones
• 🎫 **Process Tickets** - Create, assign, resolve, and close support tickets
• 💰 **Generate Quotes** - Create and send quotes, convert to projects
• 📊 **Analyze Data** - Query any information about clients, projects, or performance
• ⚡ **Automate Workflows** - Execute complex multi-step operations
• 📅 **Calendar Management** - View calendar events and create appointments

**🔍 NEW! Market Research & Intelligence:**
• 🌐 **Deep Website Analysis** - Analyze any website for technology, contacts, opportunities
• 🎯 **Competitor Discovery** - Find and analyze competitors using Google Search
• ⭐ **Online Presence** - Check reviews, social profiles, directory listings
• 📰 **News & Mentions** - Track recent news and media coverage
• 💻 **Tech Stack Detection** - Identify CMS, frameworks, analytics tools
• 📈 **Lead Scoring** - AI potential, tech readiness, online presence scores
• 💡 **Opportunity Analysis** - Find gaps and opportunities for AI automation

Try: "Analyze thefortaiagency.com" or "Research microsoft.com with competitors"

Ask me about AI agency strategies, business models, or let me help you manage your platform!`,
        timestamp: new Date(),
        status: 'complete'
      }
    ]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [personalContext, setPersonalContext] = useState<string>('')
  const [userName, setUserName] = useState<string>('Team Member')
  const [isResizing, setIsResizing] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [emailDraft, setEmailDraft] = useState({ to: '', subject: '', body: '' })
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus-resizable-chat-messages', JSON.stringify(messages))
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

  // Handle resize
  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= 320 && newWidth <= 800) {
      onWidthChange?.(newWidth)
    }
  }, [isResizing, onWidthChange])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

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

  const handleConfirmAction = async (action: PendingAction, confirmed: boolean) => {
    if (!confirmed) {
      setShowConfirmDialog(false)
      setPendingAction(null)
      
      // Add cancellation message
      const cancelMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `❌ Action cancelled: ${action.type}`,
        timestamp: new Date(),
        status: 'complete'
      }
      setMessages(prev => [...prev, cancelMessage])
      return
    }

    // For email drafts, allow editing
    if (action.type === 'send_email' && action.confirmationType === 'draft') {
      // Update the action with edited content
      action.parameters.to = emailDraft.to
      action.parameters.subject = emailDraft.subject
      action.parameters.body = emailDraft.body
    }

    setShowConfirmDialog(false)
    setIsLoading(true)

    // Execute the confirmed action
    try {
      const response = await fetch('/api/aimpact/agentic-chat/execute-confirmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()
      
      // Check if response was successful
      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || 'Failed to execute action')
      }
      
      const resultMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message || `✅ ${action.type} executed successfully!`,
        timestamp: new Date(),
        status: 'complete',
        actions: data.type ? [data] : undefined  // The response itself is the action result
      }
      
      setMessages(prev => [...prev, resultMessage])
      
      // Handle special action types that open UI elements
      if (data.open_floating) {
        // This would trigger opening the appropriate floating UI
        // For now, just log it
        console.log('Should open floating UI:', data.open_floating, data)
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Failed to execute ${action.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        status: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setPendingAction(null)
    }
  }

  const getConfirmationType = (actionType: string): 'preview' | 'confirm' | 'draft' => {
    switch (actionType) {
      case 'send_email':
        return 'draft'
      case 'create_meeting':
      case 'create_appointment':
        return 'preview'
      default:
        return 'confirm'
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }
      
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setSelectedImage(base64String)
        setImagePreview(base64String)
        
        // Automatically send message with business card context
        const businessCardText = `Process this business card`
        setInput(businessCardText)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return

    let messageContent = input
    let imageData = null
    
    // If there's an image selected, prepare it for processing
    if (selectedImage) {
      imageData = selectedImage.split(',')[1] // Remove the data:image/jpeg;base64, prefix
      if (!input.includes('business card')) {
        messageContent = `Process this business card: ${input || 'Please extract contact information'}`
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSelectedImage(null)
    setImagePreview(null)
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
      const requestBody: any = {
        message: voiceEnabled ? `${messageContent}\n\nPlease use voice for your responses right now - provide natural, conversational responses suitable for text-to-speech.` : messageContent,
        context: currentContext,
        personalContext: personalContext,
        history: messages.slice(-10) // Send last 10 messages for context
      }
      
      // Add image data if processing a business card
      if (imageData && messageContent.includes('business card')) {
        requestBody.imageBase64 = imageData
      }
      
      const response = await fetch('/api/aimpact/agentic-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      // Remove thinking message
      setMessages(prev => prev.filter(m => m.id !== thinkingMessage.id))

      // Check for pending confirmations
      const pendingActions = data.actions?.filter((action: any) => 
        ['send_email', 'send_sms', 'create_meeting', 'create_appointment', 'delete_project'].includes(action.type)
      ) || []

      const immediateActions = data.actions?.filter((action: any) => 
        !['send_email', 'send_sms', 'create_meeting', 'create_appointment', 'delete_project'].includes(action.type)
      ) || []

      // Create response message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        status: pendingActions.length > 0 ? 'pending_confirmation' : 'complete',
        actions: immediateActions,
        pendingActions: pendingActions.map((action: any) => ({
          id: Date.now().toString() + Math.random(),
          type: action.type,
          parameters: action.parameters,
          confirmationType: getConfirmationType(action.type),
          details: action.parameters
        })),
        metadata: data.metadata
      }

      setMessages(prev => [...prev, assistantMessage])

      // Trigger speech for assistant response if voice is enabled
      if (voiceEnabled && data.message) {
        setTimeout(() => speakText(data.message), 500)
      }

      // If there are pending actions, show them
      if (pendingActions.length > 0) {
        // Show confirmation for first pending action
        const firstPending = pendingActions[0]
        setPendingAction({
          id: Date.now().toString(),
          type: firstPending.type,
          parameters: firstPending.parameters,
          confirmationType: getConfirmationType(firstPending.type),
          details: firstPending.parameters
        })
        
        if (firstPending.type === 'send_email') {
          setEmailDraft({
            to: firstPending.parameters.to || '',
            subject: firstPending.parameters.subject || '',
            body: firstPending.parameters.body || firstPending.parameters.message || ''
          })
        }
        
        setShowConfirmDialog(true)
      }

      // Execute any navigation or UI actions from the response
      if (data.actions) {
        for (const action of data.actions) {
          // Handle navigation
          if (action.navigate_to && onNavigate) {
            // Special handling for video calls - pass video parameters in URL
            if (action.type === 'start_video_call' || action.type === 'join_video_call') {
              // Update the URL with video call parameters
              const url = new URL(window.location.href)
              url.searchParams.set('video', action.meeting_id)
              if (action.video_params?.name) {
                url.searchParams.set('name', action.video_params.name)
              }
              window.history.pushState({}, '', url.toString())
              onNavigate('video', action.data)
            } else {
              onNavigate(action.navigate_to, action.data)
            }
          }
          // Handle floating windows
          if (action.open_floating && onOpenFloating) {
            onOpenFloating(action.open_floating, {
              phone_number: action.phone_number,
              message: action.message
            })
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

  // Convert markdown to speech-friendly text
  const convertTextForSpeech = (text: string): string => {
    // Remove markdown formatting for natural speech
    let speechText = text
      // Remove asterisks for bold/italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Convert bullet points to natural pauses
      .replace(/^[\*\-•] /gm, '')
      .replace(/^\d+\. /gm, '')
      // Remove markdown links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove code blocks and inline code
      .replace(/```[^`]*```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove headers
      .replace(/^#{1,6} /gm, '')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Convert common emojis to words for better speech
      .replace(/📅/g, '')
      .replace(/📧/g, '')
      .replace(/📋/g, '')
      .replace(/✅/g, '')
      .replace(/🔥/g, '')
      .replace(/💪/g, '')
      .replace(/🚀/g, '')
      .replace(/⚠️/g, 'warning')
      .replace(/❌/g, 'no')
      // Clean up weather emojis - just remove them
      .replace(/☀️|🌤️|⛅|☁️|🌫️|🌦️|🌧️|🌨️|❄️|⛈️/g, '')
      // Fix spacing around punctuation
      .replace(/\s+([.,!?])/g, '$1')
      // Convert multiple newlines to periods for natural pauses
      .replace(/\n\n+/g, '. ')
      .replace(/\n/g, '. ')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Remove any remaining leading/trailing whitespace
      .trim()
    
    // Make sure sentences end properly
    if (speechText && !speechText.match(/[.!?]$/)) {
      speechText += '.'
    }
    
    return speechText
  }

  // Text-to-speech function using ElevenLabs
  const speakText = async (text: string) => {
    if (!voiceEnabled || isPlaying) return

    try {
      setIsPlaying(true)
      
      // Convert markdown to speech-friendly format
      const speechText = convertTextForSpeech(text)
      
      // Call ElevenLabs API for text-to-speech
      const response = await fetch('/api/elevenlabs/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: speechText,
          voice_id: 'usJS0op4Rf6sDk8KmIQ1', // Your actual NEXUS voice ID
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.75,
            style: 0.2
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.onerror = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      await audio.play()
    } catch (error) {
      console.error('Error playing speech:', error)
      setIsPlaying(false)
    }
  }

  const renderConfirmationDialog = () => {
    if (!pendingAction) return null

    return (
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Confirmation Required
            </DialogTitle>
            <DialogDescription>
              Please review and confirm this action before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {pendingAction.type === 'send_email' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">To:</label>
                  <Input 
                    value={emailDraft.to}
                    onChange={(e) => setEmailDraft(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="recipient@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Subject:</label>
                  <Input 
                    value={emailDraft.subject}
                    onChange={(e) => setEmailDraft(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Email subject"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message:</label>
                  <Textarea 
                    value={emailDraft.body}
                    onChange={(e) => setEmailDraft(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="Email body"
                    rows={8}
                  />
                </div>
              </div>
            )}

            {pendingAction.type === 'send_sms' && pendingAction.details && (
              <Alert>
                <Phone className="h-4 w-4" />
                <AlertTitle>SMS Message</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    <p><strong>To:</strong> {pendingAction.details.phone_number || 'Unknown number'}</p>
                    <p><strong>Message:</strong></p>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                      {pendingAction.details.message || 'No message content'}
                    </div>
                    <p className="text-sm text-yellow-600">⚠️ Standard SMS rates may apply</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {(pendingAction.type === 'create_meeting' || pendingAction.type === 'create_appointment') && pendingAction.details && (
              <Alert>
                <AlertTitle>📅 Meeting Details</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    <p><strong>Title:</strong> {pendingAction.details.title || 'Untitled Meeting'}</p>
                    <p><strong>Date:</strong> {pendingAction.details.date || 'Not specified'}</p>
                    <p><strong>Time:</strong> {pendingAction.details.time || 'Not specified'}</p>
                    <p><strong>Duration:</strong> {pendingAction.details.duration || '1 hour'}</p>
                    {pendingAction.details.attendees && pendingAction.details.attendees.length > 0 && (
                      <p><strong>Attendees:</strong> {pendingAction.details.attendees.join(', ')}</p>
                    )}
                    {pendingAction.details.send_invites !== false && (
                      <p className="text-sm text-yellow-600">⚠️ Meeting invites will be sent to all attendees</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {pendingAction.type === 'delete_project' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>⚠️ Confirm Deletion</AlertTitle>
                <AlertDescription>
                  <p className="mt-2">
                    This will permanently delete the project and all associated data. 
                    This action cannot be undone!
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleConfirmAction(pendingAction, false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => handleConfirmAction(pendingAction, true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {pendingAction.confirmationType === 'draft' ? 'Send' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (isCollapsed) {
    return null // Don't show anything when collapsed, the toggle is now in the top nav
  }

  return (
    <>
      <div 
      className={`h-full bg-black/20 backdrop-blur-sm ${!mobileOptimized ? 'border-l' : ''} flex flex-col relative ${className}`}
      style={{ width: mobileOptimized ? '100%' : `${width}px` }}
    >
      {/* Resize Handle */}
      {!hideResize && !mobileOptimized && (
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-blue-500/50 cursor-col-resize transition-all z-10 flex items-center justify-center"
        >
          <div className="w-4 h-8 rounded bg-muted/50 opacity-0 hover:opacity-100 flex items-center justify-center">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`${mobileOptimized ? 'p-3' : 'p-4'} border-b bg-gradient-to-r from-purple-500/10 to-blue-500/10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bot className={`${mobileOptimized ? 'h-4 w-4' : 'h-5 w-5'} text-purple-500`} />
              <Sparkles className={`${mobileOptimized ? 'h-2 w-2' : 'h-3 w-3'} text-yellow-500 absolute -top-1 -right-1`} />
            </div>
            <div>
              <h3 className={`${mobileOptimized ? 'text-xs' : 'text-sm'} font-semibold`}>NEXUS AI Personal Assistant</h3>
              {!mobileOptimized && (
                <p className="text-xs text-muted-foreground">
                  {personalContext ? `Personalized for ${userName}` : 'Your AI Co-Founder'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className={`h-8 w-8 border-white/20 transition-all ${
                voiceEnabled 
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              } ${isPlaying ? 'animate-pulse' : ''}`}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title={voiceEnabled ? "Disable NEXUS Voice" : "Enable NEXUS Voice"}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-white/10 hover:bg-white/20 border-white/20 transition-all"
              onClick={() => {
                const initialMessage = {
                  id: '1',
                  role: 'assistant' as const,
                  content: `Hello! I'm NEXUS, your AI assistant with full control over AImpact.`,
                  timestamp: new Date(),
                  status: 'complete' as const
                }
                setMessages([initialMessage])
                localStorage.removeItem('nexus-resizable-chat-messages')
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
                  <AvatarFallback className={message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-r from-purple-500 to-blue-500'}>
                    {message.role === 'user' ? 'U' : (
                      <img 
                        src="/impactlogotransparent.png" 
                        alt="NEXUS" 
                        className="h-4 w-4 object-contain"
                      />
                    )}
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
                      <div className="text-sm prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            a: ({ node, ...props }) => (
                              <a 
                                {...props} 
                                className="text-blue-600 hover:text-blue-800 underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            ),
                            p: ({ node, ...props }) => (
                              <p {...props} className="mb-2" />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul {...props} className="list-disc ml-4 my-2" />
                            ),
                            li: ({ node, ...props }) => (
                              <li {...props} className="mb-1" />
                            )
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {/* Show if book knowledge was used */}
                  {message.metadata?.bookSearched && message.metadata?.bookFound && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Using Instant AI Agency Book Knowledge
                      </Badge>
                    </div>
                  )}
                  
                  {/* Show executed actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.actions.map((action, idx) => {
                        // Special rendering for website analysis
                        if (action.type === 'analyze_website' && action.success && action.detailed_results) {
                          const results = action.detailed_results;
                          return (
                            <div key={idx} className="mt-3 p-3 bg-background/50 rounded-lg border space-y-3">
                              <div className="font-semibold text-sm flex items-center gap-2">
                                <Brain className="h-4 w-4 text-purple-500" />
                                Website Intelligence Report
                              </div>
                              
                              {/* Company Info */}
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Company</div>
                                <div className="text-sm">{results.company.name}</div>
                                <div className="text-xs text-muted-foreground">{results.company.domain}</div>
                                {results.company.description && (
                                  <div className="text-xs italic">{results.company.description}</div>
                                )}
                              </div>
                              
                              {/* Scoring */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-muted rounded">
                                  <div className="text-xs text-muted-foreground">Lead Score</div>
                                  <div className="text-lg font-bold text-green-600">{results.scoring.leadScore}/100</div>
                                </div>
                                <div className="p-2 bg-muted rounded">
                                  <div className="text-xs text-muted-foreground">AI Potential</div>
                                  <div className="text-lg font-bold text-blue-600">{results.scoring.aiPotential}/100</div>
                                </div>
                              </div>
                              
                              {/* Technology Stack */}
                              {results.technology && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Technology</div>
                                  {results.technology.cms && (
                                    <Badge variant="secondary" className="text-xs mr-1">{results.technology.cms}</Badge>
                                  )}
                                  {results.technology.frameworks?.map((fw: string) => (
                                    <Badge key={fw} variant="outline" className="text-xs mr-1">{fw}</Badge>
                                  ))}
                                </div>
                              )}
                              
                              {/* Opportunities */}
                              {results.opportunities && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Top Opportunities</div>
                                  <div className="space-y-1">
                                    {results.opportunities.aiAutomation?.slice(0, 2).map((opp: string, i: number) => (
                                      <div key={i} className="text-xs flex items-start gap-1">
                                        <span className="text-green-500">•</span>
                                        <span>{opp}</span>
                                      </div>
                                    ))}
                                    {results.opportunities.technical?.slice(0, 2).map((opp: string, i: number) => (
                                      <div key={i} className="text-xs flex items-start gap-1">
                                        <span className="text-blue-500">•</span>
                                        <span>{opp}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Individual Contacts */}
                              {results.contact?.individuals && results.contact.individuals.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Key Contacts</div>
                                  <div className="space-y-2">
                                    {results.contact.individuals.slice(0, 5).map((person: any, i: number) => (
                                      <div key={i} className="p-2 bg-muted/30 rounded space-y-1">
                                        <div className="flex items-center justify-between">
                                          <div className="font-medium text-xs">{person.name}</div>
                                          {person.title && (
                                            <Badge variant="secondary" className="text-xs">
                                              {person.title}
                                            </Badge>
                                          )}
                                          {person.source === 'LinkedIn Search' && (
                                            <Badge variant="outline" className="text-xs">
                                              via LinkedIn
                                            </Badge>
                                          )}
                                        </div>
                                        {person.email && (
                                          <div className="text-xs flex items-center gap-1 text-blue-500">
                                            <Mail className="h-3 w-3" />
                                            <span>{person.email}</span>
                                          </div>
                                        )}
                                        {!person.email && person.potentialEmails && (
                                          <div className="text-xs text-muted-foreground">
                                            <span className="font-medium">Potential emails:</span>
                                            <div className="mt-1 space-y-0.5">
                                              {person.potentialEmails.slice(0, 2).map((email: string, j: number) => (
                                                <div key={j} className="flex items-center gap-1">
                                                  <Mail className="h-3 w-3" />
                                                  <span className="text-blue-400">{email}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {person.linkedIn && (
                                          <div className="text-xs text-muted-foreground">
                                            <a href={person.linkedIn} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
                                              LinkedIn Profile →
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* General Contact Info */}
                              {results.contact && (results.contact.emails?.length > 0 || results.contact.phones?.length > 0) && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">General Contact</div>
                                  {results.contact.emails?.slice(0, 2).map((email: string) => (
                                    <div key={email} className="text-xs flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      <span>{email}</span>
                                    </div>
                                  ))}
                                  {results.contact.phones?.slice(0, 2).map((phone: string) => (
                                    <div key={phone} className="text-xs flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      <span>{phone}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Competitors */}
                              {results.market?.competitors && results.market.competitors.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Competitors Identified</div>
                                  <div className="flex flex-wrap gap-1">
                                    {results.market.competitors.map((competitor: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs capitalize">
                                        {competitor}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Online Presence */}
                              {results.onlinePresence && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Online Presence</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-muted rounded">
                                      <div className="text-xs text-muted-foreground">Google Results</div>
                                      <div className="text-sm font-bold">{results.onlinePresence.googleResults}</div>
                                    </div>
                                    <div className="p-2 bg-muted rounded">
                                      <div className="text-xs text-muted-foreground">Online Score</div>
                                      <div className="text-sm font-bold text-purple-600">{results.scoring.onlinePresenceScore}/100</div>
                                    </div>
                                  </div>
                                  {results.onlinePresence.reviews?.length > 0 && (
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Reviews on: </span>
                                      {results.onlinePresence.reviews.map((r: any, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-xs mr-1">
                                          {r.platform}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Recent News */}
                              {results.market?.recentNews && results.market.recentNews.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Recent News & Mentions</div>
                                  <div className="space-y-1 max-h-24 overflow-y-auto">
                                    {results.market.recentNews.slice(0, 3).map((news: any, i: number) => (
                                      <div key={i} className="text-xs p-1 bg-muted/30 rounded">
                                        <div className="font-medium truncate">{news.title}</div>
                                        <div className="text-muted-foreground truncate">{news.snippet}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Insights */}
                              {results.insights && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Key Insights</div>
                                  <div className="text-xs bg-muted/50 p-2 rounded">{results.insights.summary}</div>
                                  {results.insights.estimatedValue && (
                                    <div className="text-xs text-green-600 font-medium">
                                      Estimated Project Value: {results.insights.estimatedValue}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <Badge variant="secondary" className="text-xs">
                                {action.show_message}
                              </Badge>
                            </div>
                          );
                        }
                        
                        // Default rendering for other action types
                        return (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {action.type}: {action.description}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Show pending confirmations inline */}
                  {message.pendingActions && message.pendingActions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.pendingActions.map((action, idx) => (
                        <Alert key={idx} className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertTitle>Action Pending: {action.type}</AlertTitle>
                          <AlertDescription>
                            Click to review and confirm this action.
                          </AlertDescription>
                        </Alert>
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
      
      {/* Show pending confirmations notification */}
      {messages.some(m => m.pendingActions && m.pendingActions.length > 0) && (
        <div className="px-4 py-2 border-t bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Actions pending your confirmation
          </p>
        </div>
      )}

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
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-2 relative">
            <img 
              src={imagePreview} 
              alt="Business card preview" 
              className="max-h-32 rounded border"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0"
              onClick={() => {
                setSelectedImage(null)
                setImagePreview(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
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
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          
          {/* Image upload button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Upload business card image"
          >
            <Image className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading}
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
          {!mobileOptimized && (
            <p className="opacity-50">Press ⌘/ to toggle • Drag edge to resize • 📇 Upload business cards</p>
          )}
        </div>
      </div>
    </div>
    
    {renderConfirmationDialog()}
    </>
  )
}

// Named export
export { ResizableAgenticChatbotComponent as ResizableAgenticChatbot }

// Default export for backward compatibility
export default ResizableAgenticChatbotComponent