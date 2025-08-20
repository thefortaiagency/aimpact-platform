'use client'

import { useState, useRef, useEffect } from 'react'
import 'stream-chat-react/dist/css/v2/index.css'
import '@/styles/aether-messaging.css'
import { 
  MessageSquare, Send, Search, Users, Settings, Phone, Video,
  Plus, Hash, Lock, Globe, X, MoreVertical, Pin, Star,
  Smile, Paperclip, Mic, Bell, BellOff, UserPlus,
  CheckCircle2, Clock, ArrowLeft, User,
  ChevronDown, Archive, Trash2, Info, Copy, Edit2,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { StreamChat, Channel as StreamChannel, ChannelSort, ChannelFilters } from 'stream-chat'
// import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { ensureDefaultChannels, createDirectMessage } from '@/lib/stream-chat-helpers'

interface StreamMessagingProps {
  client?: StreamChat | null
}

export default function StreamMessaging({ client: providedClient }: StreamMessagingProps) {
  // const { data: session, status } = useSession()
  const session = { user: { email: 'user@example.com' } } // Mock for build
  const status = 'authenticated'
  const [client, setClient] = useState<StreamChat | null>(providedClient || null)
  const [selectedChannel, setSelectedChannel] = useState<StreamChannel | null>(null)
  const [channels, setChannels] = useState<StreamChannel[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showNewChannelDialog, setShowNewChannelDialog] = useState(false)
  const [showChannelInfo, setShowChannelInfo] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'direct' | 'teams'>('all')
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [channelListKey, setChannelListKey] = useState(0)
  const [rerenderKey, setRerenderKey] = useState(0)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [userNameCache, setUserNameCache] = useState<Record<string, string>>({})
  const [pinnedChannels, setPinnedChannels] = useState<Set<string>>(new Set())
  const [initializing, setInitializing] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize Stream client if not provided
  useEffect(() => {
    if (providedClient) {
      setClient(providedClient)
      setInitializing(false)
      return
    }

    if (status === 'loading') return

    const initClient = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
        if (!apiKey) {
          console.error('Stream.io API key not configured')
          setInitializing(false)
          return
        }

        // Get user info from session or URL params
        const urlParams = new URLSearchParams(window.location.search)
        const urlName = urlParams.get('name')
        
        let userId: string
        let userName: string
        let userImage: string
        
        if (session?.user) {
          // Use sanitized email as the consistent user ID for Stream.io
          // Stream.io only allows a-z, 0-9, @, _, and - in user IDs
          const sanitizeForStreamId = (str: string) => {
            return str.replace(/[^a-zA-Z0-9@_-]/g, '_')
          }
          
          userId = session.user.email 
            ? sanitizeForStreamId(session.user.email)
            : session.user.id || 'user'
          
          // First try profile.name, then user.name, then extract from email
          const profileName = (session.user as any).profile?.name
          userName = profileName || session.user.name || 
            (session.user.email ? session.user.email.split('@')[0] : urlName || 'Guest')
          
          userImage = (session.user as any).profile?.image || session.user.image || 
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
        } else if (urlName) {
          // Guest users use consistent format
          userId = `guest-${urlName.replace(/[^a-zA-Z0-9@_-]/g, '_')}`
          userName = urlName
          userImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
        } else {
          // Allow guest access
          userId = `guest-${Date.now()}`
          userName = 'Guest User'
          userImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
        }
        
        console.log('👤 User Info:', { 
          userId, 
          userName, 
          userImage,
          profileName: (session?.user as any)?.profile?.name,
          sessionName: session?.user?.name,
          email: session?.user?.email
        })

        // Get token from API - using GET method like in working aether implementation
        console.log('🎫 Fetching token...')
        const tokenResponse = await fetch(`/api/stream-token?userId=${userId}&service=chat`)
        console.log('🎫 Token response status:', tokenResponse.status)

        if (!tokenResponse.ok) {
          throw new Error('Failed to get authentication token')
        }

        const { token } = await tokenResponse.json()

        // Create Stream client
        console.log('🔧 Creating StreamChat instance...')
        const streamClient = StreamChat.getInstance(apiKey)
        console.log('✅ StreamChat instance created')
        
        // Connect user with enhanced profile - ensure name is not email
        const userProfile = {
          id: userId,
          name: userName, // This should be the actual name, not email
          image: userImage,
          email: session?.user?.email,
          handle: (session?.user as any)?.profile?.handle || userName,
          displayName: userName, // Explicitly set display name
          firstName: (session?.user as any)?.profile?.firstName,
          lastName: (session?.user as any)?.profile?.lastName
        }
        
        console.log('🔌 Connecting user with profile:', userProfile)
        await streamClient.connectUser(userProfile, token)
        console.log('✅ Connected to Stream Chat successfully')
        
        // Ensure the current user exists in Stream (important for later operations)
        try {
          await streamClient.upsertUser(userProfile)
          console.log('✅ Current user upserted successfully')
        } catch (upsertError) {
          console.warn('⚠️ Could not upsert current user, but continuing:', upsertError)
        }

        setClient(streamClient)
        
        // Ensure default channels (don't fail if this doesn't work)
        console.log('📂 Creating default channels...')
        try {
          await ensureDefaultChannels(streamClient, userId)
          console.log('✅ Default channels ensured')
        } catch (channelError) {
          console.warn('⚠️ Could not create default channels, but continuing:', channelError)
        }
      } catch (err) {
        console.error('Failed to initialize Stream client:', err)
      } finally {
        setInitializing(false)
      }
    }

    initClient()

    return () => {
      if (client && !providedClient) {
        client.disconnectUser()
      }
    }
  }, [status, session, providedClient])

  // Fetch channels from Stream
  useEffect(() => {
    if (!client || !client.userID) return

    const loadChannels = async () => {
      try {
        setLoading(true)
        
        // Define filters based on activeFilter
        let filters: ChannelFilters = {
          members: { $in: [client.userID!] }
        }

        // Apply type filter based on activeFilter
        if (activeFilter === 'direct') {
          filters.type = 'messaging'
        } else if (activeFilter === 'teams') {
          filters.type = 'team'
        } else if (activeFilter === 'all') {
          filters.type = { $in: ['messaging', 'team'] }
        }

        const sort: ChannelSort = { last_message_at: -1 }
        const channelList = await client.queryChannels(filters, sort, {
          watch: true,
          state: true,
          presence: true,
        })

        // Remove duplicates and filter out video call channels
        let uniqueChannels = channelList.filter((channel, index, self) => {
          const isUnique = index === self.findIndex((ch) => ch.id === channel.id)
          const isNotVideoCall = !channel.id?.includes('videocall-')
          return isUnique && isNotVideoCall
        })
        
        // Track pinned channels
        const pinned = new Set<string>()
        uniqueChannels.forEach(channel => {
          if (channel.data?.pinned) {
            pinned.add(channel.id)
          }
        })
        setPinnedChannels(pinned)
        
        // Sort channels: pinned first, then by last message
        uniqueChannels.sort((a, b) => {
          const aPinned = a.data?.pinned || false
          const bPinned = b.data?.pinned || false
          
          if (aPinned && !bPinned) return -1
          if (!aPinned && bPinned) return 1
          
          const aTime = a.state.last_message_at ? new Date(a.state.last_message_at).getTime() : 0
          const bTime = b.state.last_message_at ? new Date(b.state.last_message_at).getTime() : 0
          return bTime - aTime
        })

        // Filter unread if needed
        if (activeFilter === 'unread') {
          const unreadChannels = uniqueChannels.filter(ch => 
            (ch.countUnread() || 0) > 0
          )
          setChannels(unreadChannels)
        } else {
          setChannels(uniqueChannels)
        }

        // Set first channel as active if none selected
        if (!selectedChannel && uniqueChannels.length > 0) {
          setSelectedChannel(uniqueChannels[0])
          await uniqueChannels[0].watch()
        }
      } catch (error) {
        console.error('Error loading channels:', error)
        toast.error('Failed to load conversations')
      } finally {
        setLoading(false)
      }
    }

    loadChannels()
  }, [client, activeFilter])

  // Listen for new messages and update UI
  useEffect(() => {
    if (!selectedChannel) return

    const handleNewMessage = () => {
      // Force re-render to show new message
      setChannels(prev => [...prev])
      
      // Scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }

    const handleTypingStart = (event: any) => {
      if (event.user?.id !== client?.userID) {
        setIsTyping(true)
      }
    }

    const handleTypingStop = () => {
      setIsTyping(false)
    }

    selectedChannel.on('message.new', handleNewMessage)
    selectedChannel.on('typing.start', handleTypingStart)
    selectedChannel.on('typing.stop', handleTypingStop)
    
    return () => {
      selectedChannel.off('message.new', handleNewMessage)
      selectedChannel.off('typing.start', handleTypingStart)
      selectedChannel.off('typing.stop', handleTypingStop)
    }
  }, [selectedChannel, client?.userID])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return

    try {
      await selectedChannel.sendMessage({
        text: newMessage.trim()
      })
      setNewMessage('')
      
      if (inputRef.current) {
        inputRef.current.focus()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Send typing events
  useEffect(() => {
    if (!selectedChannel || !newMessage) return

    const sendTypingEvent = async () => {
      try {
        await selectedChannel.keystroke()
      } catch (error) {
        console.error('Error sending typing event:', error)
      }
    }

    sendTypingEvent()

    // Stop typing after 3 seconds of inactivity
    const stopTypingTimer = setTimeout(() => {
      selectedChannel.stopTyping()
    }, 3000)

    return () => clearTimeout(stopTypingTimer)
  }, [newMessage, selectedChannel])

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const getChannelName = (channel: StreamChannel): string => {
    if (channel.type === 'messaging' && channel.state.members) {
      const otherMembers = Object.values(channel.state.members).filter(
        member => member.user?.id !== client?.userID
      )
      if (otherMembers.length > 0) {
        return otherMembers.map(m => m.user?.name || 'Unknown').join(', ')
      }
    }
    return channel.data?.name || 'Unnamed Channel'
  }

  const getChannelImage = (channel: StreamChannel): string | undefined => {
    if (channel.type === 'messaging' && channel.state.members) {
      const otherMembers = Object.values(channel.state.members).filter(
        member => member.user?.id !== client?.userID
      )
      if (otherMembers.length === 1) {
        return otherMembers[0].user?.image
      }
    }
    return channel.data?.image
  }

  const renderMessageWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Initializing AImpact Nexus Messaging...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Messaging Not Available</h3>
            <p className="text-muted-foreground">Unable to connect to messaging service.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar */}
      <div className={`${selectedChannel ? 'hidden lg:block' : 'block'} w-full lg:w-96 flex-shrink-0`}>
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Messages
              </CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowNewChannelDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-4">
              {(['all', 'unread', 'direct', 'teams'] as const).map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={activeFilter === filter ? 'default' : 'outline'}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-4">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading conversations...</p>
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No conversations found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewChannelDialog(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start a Conversation
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {channels.map((channel) => {
                    const isActive = selectedChannel?.id === channel.id
                    const unreadCount = channel.countUnread() || 0
                    const lastMessage = channel.state.messages?.[channel.state.messages.length - 1]
                    const channelName = getChannelName(channel)
                    const channelImage = getChannelImage(channel)
                    
                    return (
                      <motion.div
                        key={`${channel.id}-${rerenderKey}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ x: 4 }}
                      >
                        <Button
                          variant={isActive ? 'secondary' : 'ghost'}
                          className="w-full justify-start gap-3 h-auto py-3"
                          onClick={async () => {
                            try {
                              await channel.watch()
                              setSelectedChannel(channel)
                            } catch (error) {
                              console.error('Error selecting channel:', error)
                              toast.error('Failed to open conversation')
                            }
                          }}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={channelImage} />
                            <AvatarFallback>
                              {channelName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-sm truncate">{channelName}</p>
                              {channel.data?.pinned && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
                            </div>
                            {lastMessage ? (
                              <p className="text-xs text-muted-foreground truncate">
                                {lastMessage.user?.id === client.userID ? 'You: ' : ''}
                                {lastMessage.text}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">No messages yet</p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {lastMessage && (
                              <span className="text-xs text-muted-foreground">
                                {formatTime(new Date(lastMessage.created_at || ''))}
                              </span>
                            )}
                            {unreadCount > 0 && (
                              <Badge className="h-5 px-1.5 text-xs">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                        </Button>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      {selectedChannel ? (
        <Card className="flex-1 flex flex-col h-full">
          {/* Chat Header */}
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSelectedChannel(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getChannelImage(selectedChannel)} />
                  <AvatarFallback>
                    {getChannelName(selectedChannel).split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {getChannelName(selectedChannel)}
                    {selectedChannel.data?.pinned && <Pin className="h-4 w-4 text-primary" />}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedChannel.type === 'messaging' ? 'Direct Message' : 'Team Channel'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowChannelInfo(true)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {selectedChannel.state.messages?.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                selectedChannel.state.messages?.map((message, index) => {
                  const isOwnMessage = message.user?.id === client.userID
                  const showAvatar = index === 0 || 
                    selectedChannel.state.messages?.[index - 1]?.user?.id !== message.user?.id
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isOwnMessage ? 'justify-end' : ''}`}
                    >
                      {!isOwnMessage && showAvatar && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.user?.image} />
                          <AvatarFallback>
                            {message.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwnMessage && !showAvatar && <div className="w-8" />}
                      
                      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        {showAvatar && !isOwnMessage && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{message.user?.name || 'Unknown'}</span>
                            <span>{formatTime(new Date(message.created_at || ''))}</span>
                          </div>
                        )}
                        
                        <div className={`rounded-lg px-4 py-2 ${
                          isOwnMessage 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm">{renderMessageWithLinks(message.text || '')}</p>
                        </div>
                        
                        {isOwnMessage && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTime(new Date(message.created_at || ''))}</span>
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
              
              {isTyping && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                  </div>
                  Someone is typing...
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          {/* Message Input */}
          <CardContent className="border-t pt-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message ${getChannelName(selectedChannel)}...`}
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
            <p className="text-muted-foreground">
              Choose a channel or direct message to start chatting
            </p>
          </div>
        </div>
      )}

      {/* New Conversation Dialog */}
      <Dialog open={showNewChannelDialog} onOpenChange={setShowNewChannelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a New Conversation</DialogTitle>
            <DialogDescription>
              Search for a user to start a direct message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Users</Label>
              <Input
                placeholder="Enter email or name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && searchInput.trim()) {
                    setIsSearchingUsers(true)
                    try {
                      // Search for users
                      const response = await client?.queryUsers({
                        $or: [
                          { id: { $autocomplete: searchInput } },
                          { name: { $autocomplete: searchInput } },
                          { email: { $autocomplete: searchInput } }
                        ]
                      })
                      setSearchResults(response?.users || [])
                    } catch (error) {
                      console.error('Error searching users:', error)
                      toast.error('Failed to search users')
                    } finally {
                      setIsSearchingUsers(false)
                    }
                  }
                }}
              />
            </div>
            
            {isSearchingUsers && (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Searching...</p>
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <Label>Search Results</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      className="w-full p-2 hover:bg-accent rounded-md text-left flex items-center gap-3"
                      onClick={async () => {
                        try {
                          // Create or get direct message channel
                          const channel = client?.channel('messaging', {
                            members: [client.userID!, user.id]
                          })
                          await channel?.watch()
                          setSelectedChannel(channel || null)
                          setShowNewChannelDialog(false)
                          setSearchInput('')
                          setSearchResults([])
                          toast.success(`Started conversation with ${user.name || user.id}`)
                          
                          // Refresh channel list
                          await loadChannels()
                        } catch (error) {
                          console.error('Error creating conversation:', error)
                          toast.error('Failed to start conversation')
                        }
                      }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image} />
                        <AvatarFallback>
                          {(user.name || user.id).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{user.name || user.id}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </ScrollArea>
              </div>
            )}
            
            {searchInput && searchResults.length === 0 && !isSearchingUsers && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found. Press Enter to search.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewChannelDialog(false)
              setSearchInput('')
              setSearchResults([])
            }}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel Info Modal */}
      <Dialog open={showChannelInfo} onOpenChange={setShowChannelInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Channel Information</DialogTitle>
          </DialogHeader>
          {selectedChannel && (
            <div className="space-y-4">
              <div className="text-center">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarImage src={getChannelImage(selectedChannel)} />
                  <AvatarFallback>
                    {getChannelName(selectedChannel).split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <h4 className="text-lg font-semibold">{getChannelName(selectedChannel)}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedChannel.type === 'messaging' ? 'Direct Message' : 'Team Channel'} • {Object.keys(selectedChannel.state.members).length} members
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={async () => {
                    try {
                      const wasPinned = selectedChannel.data?.pinned || false
                      await selectedChannel.update({
                        ...selectedChannel.data,
                        pinned: !wasPinned
                      })
                      toast.success(wasPinned ? 'Channel unpinned' : 'Channel pinned')
                      setShowChannelInfo(false)
                    } catch (error) {
                      toast.error('Failed to update pin status')
                    }
                  }}
                >
                  <Pin className="h-4 w-4" />
                  {selectedChannel.data?.pinned ? 'Unpin' : 'Pin'} Channel
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-destructive"
                  onClick={async () => {
                    if (confirm('Are you sure you want to leave this channel?')) {
                      try {
                        if (selectedChannel.type === 'messaging') {
                          await selectedChannel.delete()
                        } else {
                          await selectedChannel.removeMembers([client.userID || ''])
                        }
                        toast.success('Left channel')
                        setShowChannelInfo(false)
                        setSelectedChannel(null)
                        setChannelListKey(prev => prev + 1)
                      } catch (error) {
                        toast.error('Failed to leave channel')
                      }
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Leave Channel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}