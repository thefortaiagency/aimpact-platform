'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  MessageSquare, Send, Search, Users, Settings, Phone, Video,
  Plus, Hash, Lock, Globe, X, MoreVertical, Pin, Star,
  Smile, Paperclip, Mic, Bell, BellOff, UserPlus, Crown,
  Shield, CheckCircle2, Clock, Edit3, ArrowLeft, User,
  ChevronDown, Archive, Trash2, Info, Heart, Headphones, HelpCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Channel {
  id: string
  name: string
  type: 'channel' | 'direct' | 'group'
  description?: string
  memberCount: number
  unreadCount: number
  lastMessage?: {
    content: string
    sender: string
    timestamp: Date
  }
  image?: string
  pinned?: boolean
  members?: User[]
}

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'online' | 'away' | 'busy' | 'offline'
  role: 'admin' | 'member' | 'guest'
  department?: string
}

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  senderAvatar?: string
  timestamp: Date
  type: 'text' | 'image' | 'file' | 'system'
  status?: 'sending' | 'sent' | 'delivered' | 'read'
  edited?: boolean
  reactions?: {
    emoji: string
    users: string[]
  }[]
}

// Custom Support Logo Component - displays "A" in a circle
const SupportLogo = ({ className = "h-4 w-4" }: { className?: string }) => {
  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold`}>
      <span className="text-[0.6em]">A</span>
    </div>
  )
}

export default function CompanyMessaging() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChannelDialog, setShowNewChannelDialog] = useState(false)
  const [showChannelInfo, setShowChannelInfo] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'channels' | 'direct'>('all')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mock data - replace with real API calls
  const [channels] = useState<Channel[]>([
    {
      id: '1',
      name: 'general',
      type: 'channel',
      description: 'Company-wide announcements and general discussion',
      memberCount: 42,
      unreadCount: 0,
      pinned: true,
      lastMessage: {
        content: 'Welcome to the Impact messaging platform!',
        sender: 'System',
        timestamp: new Date(Date.now() - 30 * 60 * 1000)
      }
    },
    {
      id: '2',
      name: 'support',
      type: 'channel',
      description: 'Customer support and assistance',
      memberCount: 15,
      unreadCount: 5,
      lastMessage: {
        content: 'New ticket from Acme Corp resolved successfully 🎉',
        sender: 'Sarah Johnson',
        timestamp: new Date(Date.now() - 8 * 60 * 1000)
      }
    },
    {
      id: '3',
      name: 'development',
      type: 'channel',
      description: 'Development team coordination',
      memberCount: 12,
      unreadCount: 3,
      lastMessage: {
        content: 'The new API endpoints are ready for testing',
        sender: 'John Doe',
        timestamp: new Date(Date.now() - 10 * 60 * 1000)
      }
    },
    {
      id: '4',
      name: 'marketing',
      type: 'channel',
      description: 'Marketing team discussions',
      memberCount: 8,
      unreadCount: 0,
      lastMessage: {
        content: 'Campaign results look great! 📈',
        sender: 'Jane Smith',
        timestamp: new Date(Date.now() - 45 * 60 * 1000)
      }
    },
    {
      id: 'dm1',
      name: 'John Doe',
      type: 'direct',
      memberCount: 2,
      unreadCount: 1,
      image: '/placeholder-user.jpg',
      lastMessage: {
        content: 'Can we discuss the project timeline?',
        sender: 'John Doe',
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      members: [
        { id: '1', name: 'John Doe', email: 'john@company.com', status: 'online', role: 'member' }
      ]
    },
    {
      id: 'dm2',
      name: 'Sarah Wilson',
      type: 'direct',
      memberCount: 2,
      unreadCount: 0,
      image: '/placeholder-user.jpg',
      lastMessage: {
        content: 'Thanks for the quick response!',
        sender: 'You',
        timestamp: new Date(Date.now() - 60 * 60 * 1000)
      },
      members: [
        { id: '2', name: 'Sarah Wilson', email: 'sarah@company.com', status: 'away', role: 'admin' }
      ]
    },
    {
      id: 'group1',
      name: 'Project Alpha Team',
      type: 'group',
      memberCount: 5,
      unreadCount: 2,
      lastMessage: {
        content: 'Meeting scheduled for tomorrow at 2 PM',
        sender: 'Mike Johnson',
        timestamp: new Date(Date.now() - 20 * 60 * 1000)
      }
    }
  ])

  const [currentUser] = useState<User>({
    id: 'current',
    name: 'Current User',
    email: 'user@company.com',
    status: 'online',
    role: 'admin',
    department: 'Management'
  })

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChannel) return

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      timestamp: new Date(),
      type: 'text',
      status: 'sending'
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')
    
    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'delivered' as const }
            : msg
        )
      )
    }, 1000)

    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

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

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'busy': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getChannelIcon = (channel: Channel) => {
    if (channel.type === 'channel') {
      // Use different icons based on channel purpose
      if (channel.name.includes('support') || channel.name.includes('help')) {
        return <Headphones className="h-4 w-4 text-blue-500" />
      } else if (channel.name.includes('general') || channel.name.includes('team')) {
        return <Users className="h-4 w-4 text-green-500" />
      } else if (channel.name.startsWith('private-')) {
        return <Lock className="h-4 w-4 text-amber-500" />
      } else {
        // Use the custom A logo for public channels
        return <SupportLogo className="h-4 w-4" />
      }
    }
    return null
  }

  const filteredChannels = channels.filter(channel => {
    if (searchQuery && !channel.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    switch (activeFilter) {
      case 'unread':
        return channel.unreadCount > 0
      case 'channels':
        return channel.type === 'channel'
      case 'direct':
        return channel.type === 'direct' || channel.type === 'group'
      default:
        return true
    }
  })

  const getMessageStatus = (status?: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />
      case 'sent':
        return <CheckCircle2 className="h-3 w-3 text-gray-400" />
      case 'delivered':
        return <CheckCircle2 className="h-3 w-3 text-blue-400" />
      case 'read':
        return <CheckCircle2 className="h-3 w-3 text-blue-500" />
      default:
        return null
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Sidebar */}
      <div className="w-80 bg-card/50 backdrop-blur-md rounded-lg border border-white/10">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowNewChannelDialog(true)}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-white/10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'unread', 'channels', 'direct'] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={activeFilter === filter ? 'default' : 'ghost'}
                onClick={() => setActiveFilter(filter)}
                className="capitalize"
              >
                {filter}
              </Button>
            ))}
          </div>

          {/* Channel List */}
          <ScrollArea className="h-[calc(100vh-25rem)]">
            <div className="space-y-1">
              {filteredChannels.map((channel) => {
                const isActive = selectedChannel?.id === channel.id
                const otherUser = channel.type === 'direct' ? channel.members?.[0] : null
                
                return (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: 4 }}
                  >
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-3 h-auto p-3"
                      onClick={() => setSelectedChannel(channel)}
                    >
                      <div className="relative">
                        {channel.type === 'direct' || channel.type === 'group' ? (
                          <>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={channel.image} />
                              <AvatarFallback>
                                {channel.type === 'group' ? (
                                  <Users className="h-5 w-5" />
                                ) : (
                                  channel.name.split(' ').map(n => n[0]).join('')
                                )}
                              </AvatarFallback>
                            </Avatar>
                            {otherUser && (
                              <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(otherUser.status)}`} />
                            )}
                          </>
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            {getChannelIcon(channel)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{channel.name}</p>
                          {channel.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        {channel.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate">
                            {channel.lastMessage.sender === 'You' ? 'You: ' : 
                             channel.lastMessage.sender !== currentUser.name ? `${channel.lastMessage.sender}: ` : ''}
                            {channel.lastMessage.content}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {channel.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(channel.lastMessage.timestamp)}
                          </span>
                        )}
                        {channel.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                            {channel.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedChannel ? (
        <div className="flex-1 bg-card/50 backdrop-blur-md rounded-lg border border-white/10 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedChannel.type === 'direct' || selectedChannel.type === 'group' ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedChannel.image} />
                    <AvatarFallback>
                      {selectedChannel.type === 'group' ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        selectedChannel.name.split(' ').map(n => n[0]).join('')
                      )}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {getChannelIcon(selectedChannel)}
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {selectedChannel.name}
                    {selectedChannel.pinned && <Pin className="h-4 w-4 text-primary" />}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedChannel.type === 'direct' && selectedChannel.members?.[0] ? 
                      (selectedChannel.members[0].status === 'online' ? 'Active now' : 'Away') :
                      `${selectedChannel.memberCount} members`
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedChannel.type === 'direct' && (
                  <>
                    <Button variant="ghost" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowChannelInfo(true)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwnMessage = message.senderId === currentUser.id
                  const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isOwnMessage ? 'justify-end' : ''}`}
                    >
                      {!isOwnMessage && showAvatar && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.senderAvatar} />
                          <AvatarFallback>
                            {message.senderName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwnMessage && !showAvatar && <div className="w-8" />}
                      
                      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        {showAvatar && !isOwnMessage && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{message.senderName}</span>
                            <span>{formatTime(message.timestamp)}</span>
                          </div>
                        )}
                        
                        <div className={`rounded-lg px-4 py-2 ${
                          isOwnMessage 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        
                        {isOwnMessage && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTime(message.timestamp)}</span>
                            {getMessageStatus(message.status)}
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
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                  </div>
                  Someone is typing...
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message ${selectedChannel.name}...`}
                  className="pr-20 bg-background/50 border-white/10"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Mic className="h-4 w-4" />
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
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-card/50 backdrop-blur-md rounded-lg border border-white/10 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
            <p className="text-muted-foreground">
              Choose a channel or direct message to start chatting
            </p>
          </div>
        </div>
      )}

      {/* New Channel Dialog */}
      <Dialog open={showNewChannelDialog} onOpenChange={setShowNewChannelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
            <DialogDescription>
              Start a new conversation with your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input id="channel-name" placeholder="e.g. project-alpha" />
            </div>
            <div>
              <Label htmlFor="channel-description">Description (optional)</Label>
              <Textarea id="channel-description" placeholder="What's this channel for?" />
            </div>
            <div>
              <Label htmlFor="channel-type">Privacy</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select privacy level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Public - Anyone can join
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Private - Invite only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChannelDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowNewChannelDialog(false)}>
              Create Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel Info Panel */}
      <AnimatePresence>
        {showChannelInfo && selectedChannel && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-0 h-full w-80 bg-card/95 backdrop-blur-md border-l border-white/10 p-4 overflow-y-auto z-50"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Channel Info</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChannelInfo(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Channel Details */}
              <div className="text-center">
                {selectedChannel.type === 'direct' ? (
                  <Avatar className="h-20 w-20 mx-auto mb-3">
                    <AvatarImage src={selectedChannel.image} />
                    <AvatarFallback>
                      {selectedChannel.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-20 w-20 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                    {getChannelIcon(selectedChannel)}
                  </div>
                )}
                <h4 className="text-lg font-semibold">{selectedChannel.name}</h4>
                {selectedChannel.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedChannel.description}</p>
                )}
              </div>
              
              {/* Actions */}
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Pin className="h-4 w-4" />
                  {selectedChannel.pinned ? 'Unpin' : 'Pin'} Channel
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Bell className="h-4 w-4" />
                  Notification Settings
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Archive className="h-4 w-4" />
                  Archive Channel
                </Button>
                {selectedChannel.type === 'channel' && (
                  <Button variant="outline" className="w-full justify-start gap-2 text-red-500">
                    <Trash2 className="h-4 w-4" />
                    Leave Channel
                  </Button>
                )}
              </div>
              
              {/* Members */}
              <div>
                <h5 className="text-sm font-medium mb-3">
                  Members ({selectedChannel.memberCount})
                </h5>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded hover:bg-accent">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>CU</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Current User</p>
                      <p className="text-xs text-muted-foreground">Admin</p>
                    </div>
                  </div>
                  {selectedChannel.members?.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}