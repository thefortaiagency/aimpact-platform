'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, MessageSquare, Clock, 
  PhoneIncoming, PhoneOutgoing, PhoneMissed, User, Calendar,
  Search, Filter, Download, Play, Pause, MoreVertical,
  Headphones, Users, Activity, TrendingUp, AlertCircle,
  CheckCircle, XCircle, Timer, Mail, ChevronRight,
  Settings, Voicemail, PhoneForwarded, X, Send, Hash,
  ChevronDown, Star, MessageCircle, FileText, Paperclip
} from 'lucide-react'
import { DraggableGrid } from '@/components/ui/draggable-grid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
// import DialpadModalSimple from './DialpadModalSimple'
// import DialpadModal from './DialpadModal'
// import { useTelnyxCall } from '@/hooks/use-telnyx-call'
// import { usePhone } from '@/contexts/PhoneContext'
import { safeContactDisplay } from '@/lib/safeContactDisplay'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Contact {
  id: string
  name: string
  number: string
  email?: string
  avatar?: string
  company?: string
  isFavorite?: boolean
  lastContact?: Date
}

interface CommunicationRecord {
  id: string
  type: 'call' | 'sms' | 'voicemail'
  direction: 'incoming' | 'outgoing' | 'missed' | 'internal'
  contact: {
    name?: string
    number: string
    avatar?: string
    company?: string
  }
  duration?: string
  message?: string
  timestamp: Date
  status: 'completed' | 'missed' | 'failed' | 'active' | 'on-hold' | 'delivered' | 'read' | 'sending'
  agent?: string
  department?: string
  recording?: boolean
  sentiment?: 'positive' | 'neutral' | 'negative'
  tags?: string[]
}

interface SMSConversation {
  contactId: string
  contact: Contact
  messages: CommunicationRecord[]
  lastMessage?: CommunicationRecord
  unreadCount: number
}

interface PhoneInterfaceProps {
  autoOpenDialpad?: boolean
  phoneNumber?: string
}

export default function PhoneInterface({ autoOpenDialpad = false, phoneNumber }: PhoneInterfaceProps) {
  const [communications, setCommunications] = useState<CommunicationRecord[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedRecord, setSelectedRecord] = useState<CommunicationRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [activeLines, setActiveLines] = useState<any[]>([])
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const fetchCommunications = useRef<() => Promise<void>>()
  
  // Phone context removed - using direct implementation
  // const { openPhone } = usePhone()
  
  // WebRTC call state - temporarily disabled
  // const { callState, isInitialized, initialize } = useTelnyxCall()
  const callState = null
  const [activeTab, setActiveTab] = useState<'all' | 'calls' | 'sms' | 'voicemail'>('all')
  
  // SMS specific states
  const [showSMSCompose, setShowSMSCompose] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<SMSConversation | null>(null)
  const [smsMessage, setSmsMessage] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contactSearchOpen, setContactSearchOpen] = useState(false)
  const [smsRecipient, setSmsRecipient] = useState('')
  
  const [stats, setStats] = useState({
    totalCalls: 0,
    missedCalls: 0,
    totalSMS: 0,
    unreadSMS: 0,
    avgDuration: '0:00',
    activeAgents: 0,
    inQueue: 0,
    sla: 100
  })

  // Mock contacts data
  useEffect(() => {
    const mockContacts: Contact[] = [
      { id: '1', name: 'John Smith', number: '+1234567890', email: 'john@example.com', company: 'ABC Corp', isFavorite: true },
      { id: '2', name: 'Sarah Johnson', number: '+0987654321', email: 'sarah@example.com', company: 'XYZ Ltd', isFavorite: true },
      { id: '3', name: 'Mike Davis', number: '+1122334455', email: 'mike@example.com', company: 'Tech Solutions' },
      { id: '4', name: 'Emma Wilson', number: '+5544332211', email: 'emma@example.com', company: 'Design Studio' },
      { id: '5', name: 'Robert Brown', number: '+9988776655', email: 'robert@example.com', company: 'Marketing Inc' },
    ]
    setContacts(mockContacts)
  }, [])

  useEffect(() => {
    fetchCommunications.current = async () => {
      try {
        setLoading(true)
        // Try Telnyx API first, fallback to existing API
        const response = await fetch('/api/aimpact/telnyx-communications')
        if (response.ok) {
          const data = await response.json()
          // Convert timestamp strings to Date objects
          const communicationsWithDates = (data.communications || []).map((comm: any) => ({
            ...comm,
            timestamp: new Date(comm.timestamp)
          }))
          setCommunications(communicationsWithDates)
          setStats(data.stats || {
            totalCalls: 0,
            missedCalls: 0,
            totalSMS: 0,
            unreadSMS: 0,
            avgDuration: '0:00',
            activeAgents: 0,
            inQueue: 0,
            sla: 100
          })
          setActiveLines([])
        } else {
          // Fallback to existing communications API if Telnyx fails
          const fallbackResponse = await fetch('/api/aimpact/communications?includeStats=true')
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json()
            // Convert timestamp strings to Date objects
            const communicationsWithDates = (data.communications || []).map((comm: any) => ({
              ...comm,
              timestamp: new Date(comm.timestamp)
            }))
            setCommunications(communicationsWithDates)
            setStats(data.stats || {
              totalCalls: 0,
              missedCalls: 0,
              totalSMS: 0,
              unreadSMS: 0,
              avgDuration: '0:00',
              activeAgents: 0,
              inQueue: 0,
              sla: 100
            })
          }
        }
      } catch (error) {
        console.error('Error fetching communications:', error)
        toast({
          title: "Connection Error",
          description: "Unable to fetch communications. Please check your connection.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    fetchCommunications.current()

    const interval = setInterval(() => {
      if (fetchCommunications.current) {
        fetchCommunications.current()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Group SMS into conversations
  const smsConversations = useMemo<SMSConversation[]>(() => {
    const conversationMap = new Map<string, SMSConversation>()
    
    communications
      .filter(comm => comm.type === 'sms')
      .forEach(sms => {
        if (!sms.contact) return;
        const display = safeContactDisplay(sms.contact, sms.from)
        const contactNumber = display.primaryHandle
        const existingContact = contacts.find(c => c.number === contactNumber)
        
        if (!conversationMap.has(contactNumber)) {
          conversationMap.set(contactNumber, {
            contactId: existingContact?.id || contactNumber,
            contact: existingContact || { 
              id: contactNumber, 
              name: display.displayName, 
              number: contactNumber 
            },
            messages: [],
            unreadCount: 0
          })
        }
        
        const conversation = conversationMap.get(contactNumber)!
        conversation.messages.push(sms)
        if (sms.status === 'delivered' && sms.direction === 'incoming') {
          conversation.unreadCount++
        }
      })
    
    return Array.from(conversationMap.values()).map(conv => ({
      ...conv,
      lastMessage: conv.messages[conv.messages.length - 1],
      messages: conv.messages.sort((a, b) => {
        const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
        const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
        return aTime - bTime
      })
    }))
  }, [communications, contacts])

  const filteredCommunications = communications.filter(comm => {
    const display = safeContactDisplay(comm.contact, comm.from)
    const matchesSearch = !searchQuery || 
      display.primaryHandle.includes(searchQuery) ||
      display.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      display.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.message?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = activeTab === 'all' || 
      (activeTab === 'calls' && comm.type === 'call') ||
      (activeTab === 'sms' && comm.type === 'sms') ||
      (activeTab === 'voicemail' && comm.type === 'voicemail')
    
    const matchesStatus = filterStatus === 'all' || comm.status === filterStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  const getIcon = (record: CommunicationRecord) => {
    if (record.type === 'sms') return <MessageSquare className="h-4 w-4" />
    if (record.type === 'voicemail') return <Voicemail className="h-4 w-4" />
    
    switch (record.direction) {
      case 'incoming': return <PhoneIncoming className="h-4 w-4 text-green-500" />
      case 'outgoing': return <PhoneOutgoing className="h-4 w-4 text-blue-500" />
      case 'missed': return <PhoneMissed className="h-4 w-4 text-red-500" />
      case 'internal': return <PhoneForwarded className="h-4 w-4 text-purple-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: { variant: 'default', icon: CheckCircle },
      missed: { variant: 'destructive', icon: XCircle },
      failed: { variant: 'destructive', icon: AlertCircle },
      active: { variant: 'default', icon: Activity, className: 'bg-green-500' },
      'on-hold': { variant: 'secondary', icon: Timer },
      delivered: { variant: 'secondary', icon: CheckCircle },
      read: { variant: 'default', icon: CheckCircle },
      sending: { variant: 'secondary', icon: Clock }
    }
    
    const config = variants[status] || { variant: 'default' }
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className || ''}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {status}
      </Badge>
    )
  }

  const handleSendSMS = async () => {
    // Determine the recipient based on context
    const recipient = smsRecipient || selectedConversation?.contact?.number
    
    if (!smsMessage.trim() || !recipient) {
      toast({
        title: "Missing Information",
        description: "Please enter a recipient and message",
        variant: "destructive"
      })
      return
    }
    
    // Show sending state
    const originalMessage = smsMessage
    const originalRecipient = recipient
    
    try {
      toast({
        title: "Sending SMS...",
        description: "Please wait",
      })
      
      const response = await fetch('/api/aimpact/phone/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: originalRecipient,
          message: originalMessage
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to send SMS')
      }
      
      toast({
        title: "SMS Sent Successfully",
        description: `Message sent to ${selectedContact?.name || selectedConversation?.contact?.name || originalRecipient}`,
      })
      
      setSmsMessage('')
      setShowSMSCompose(false)
      setSmsRecipient('')
      setSelectedContact(null)
      
      // Refresh communications to show the sent message
      if (selectedConversation) {
        setSelectedConversation({
          ...selectedConversation,
          messages: [...selectedConversation.messages, {
            id: data.messageId,
            type: 'sms',
            direction: 'outgoing',
            contact: {
              number: originalRecipient,
              name: selectedContact?.name || safeContactDisplay(selectedConversation.contact, originalRecipient).displayName
            },
            message: originalMessage,
            timestamp: new Date(),
            status: 'delivered'
          }]
        })
      }
      
      // Refresh the communications list
      setTimeout(() => {
        if (fetchCommunications.current) {
          fetchCommunications.current()
        }
      }, 1000)
    } catch (error) {
      console.error('SMS Error:', error)
      toast({
        title: "Failed to send SMS",
        description: error instanceof Error ? error.message : "Please check your phone configuration",
        variant: "destructive"
      })
    }
  }

  const handleCall = (number: string) => {
    // Open phone functionality temporarily disabled
    toast({
      title: "Phone System",
      description: "Phone functionality is being updated. Please try again later.",
    })
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header Stats */}
      <DraggableGrid
        storageKey="phone-stats"
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 lg:gap-4"
        enabled={true}
      >
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Total Calls</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.totalCalls}</p>
              </div>
              <Phone className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Missed</p>
                <p className="text-lg lg:text-2xl font-bold text-red-500">{stats.missedCalls}</p>
              </div>
              <PhoneMissed className="h-6 lg:h-8 w-6 lg:w-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">SMS Sent</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.totalSMS}</p>
              </div>
              <MessageSquare className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Unread SMS</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.unreadSMS}</p>
              </div>
              <MessageCircle className="h-6 lg:h-8 w-6 lg:w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.avgDuration}</p>
              </div>
              <Clock className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Active Agents</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.activeAgents}</p>
              </div>
              <Headphones className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">In Queue</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.inQueue}</p>
              </div>
              <Users className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">SLA</p>
                <div className="flex items-center gap-1 lg:gap-2">
                  <p className="text-lg lg:text-2xl font-bold">{stats.sla}%</p>
                  <TrendingUp className="h-3 lg:h-4 w-3 lg:w-4 text-green-500" />
                </div>
              </div>
              <Activity className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </DraggableGrid>

      {/* Quick Actions Bar */}
      <Card className="bg-card/30 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleCall('')} className="gap-2">
              <Hash className="h-4 w-4" />
              Dialpad
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault()
                setShowSMSCompose(true)
              }} 
              variant="outline" 
              className="gap-2"
              type="button"
            >
              <MessageSquare className="h-4 w-4" />
              New SMS
            </Button>
            
            {/* Contact Dropdown */}
            <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search contacts..." />
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem className="font-medium text-sm opacity-60">
                      Favorites
                    </CommandItem>
                    {(contacts || []).filter(c => c?.isFavorite).map((contact) => {
                      if (!contact) return null;
                      return (
                      <CommandItem
                        key={contact.id}
                        onSelect={() => {
                          setSelectedContact(contact)
                          setContactSearchOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{(contact.name || 'U').split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.number}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCall(contact.number)
                              }}
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedContact(contact)
                                setSmsRecipient(contact.number)
                                setShowSMSCompose(true)
                                setContactSearchOpen(false)
                              }}
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CommandItem>
                      );
                    })}
                    <Separator className="my-2" />
                    <CommandItem className="font-medium text-sm opacity-60">
                      All Contacts
                    </CommandItem>
                    {(contacts || []).filter(c => c && !c.isFavorite).map((contact) => {
                      if (!contact) return null;
                      return (
                      <CommandItem
                        key={contact.id}
                        onSelect={() => {
                          setSelectedContact(contact)
                          setContactSearchOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{(contact.name || 'U').split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.number}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCall(contact.number)
                              }}
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedContact(contact)
                                setSmsRecipient(contact.number)
                                setShowSMSCompose(true)
                                setContactSearchOpen(false)
                              }}
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="flex-1" />
            
            {/* Filters on the right */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Lines */}
      {(callState && ['connecting', 'ringing', 'active', 'held'].includes(callState.state)) && (
        <Card className="bg-card/30 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Call</CardTitle>
              <Badge variant="outline" className={
                callState.state === 'active' ? 'bg-green-500/20 text-green-500' :
                callState.state === 'held' ? 'bg-orange-500/20 text-orange-500' :
                'bg-blue-500/20 text-blue-500'
              }>
                {callState.state}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    callState.state === 'active' ? 'bg-green-500' :
                    callState.state === 'held' ? 'bg-orange-500' :
                    'bg-blue-500'
                  } animate-pulse`} />
                  <div>
                    <p className="text-sm font-medium">
                      {callState.direction === 'outbound' ? callState.to : callState.from}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {callState.direction} • {callState.state}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setIsDialpadOpen(true)}
                  >
                    <Hash className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setIsDialpadOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Communications Interface */}
      <Card className="bg-card/30 backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Communications Center</CardTitle>
              <CardDescription>Unified view of all calls, SMS, and voicemails</CardDescription>
            </div>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, number, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="calls">Calls</TabsTrigger>
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="voicemail">Voicemail</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {activeTab === 'sms' ? (
                // SMS Conversations View
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Conversations List */}
                  <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Conversations</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px]">
                        {smsConversations.map((conversation) => (
                          <div
                            key={conversation.contactId}
                            className={`p-4 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                              selectedConversation?.contactId === conversation.contactId ? 'bg-accent' : ''
                            }`}
                            onClick={() => setSelectedConversation(conversation)}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {(() => {
                                    const display = safeContactDisplay(conversation.contact, conversation.contact?.number)
                                    return display.initials
                                  })()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium truncate">{safeContactDisplay(conversation.contact, conversation.contact?.number).displayName}</p>
                                  {conversation.unreadCount > 0 && (
                                    <Badge variant="default" className="ml-2">
                                      {conversation.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{safeContactDisplay(conversation.contact, conversation.contact?.number).primaryHandle}</p>
                                {conversation.lastMessage && (
                                  <p className="text-sm text-muted-foreground truncate mt-1">
                                    {conversation.lastMessage.direction === 'outgoing' && 'You: '}
                                    {conversation.lastMessage.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Conversation Messages */}
                  <Card className="lg:col-span-2">
                    {selectedConversation ? (
                      <>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {(() => {
                                    const display = safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number)
                                    return display.initials
                                  })()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number).displayName}</p>
                                <p className="text-sm text-muted-foreground">{safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number).primaryHandle}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleCall(safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number).primaryHandle)}>
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[350px] mb-4">
                            <div className="space-y-4">
                              {selectedConversation.messages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div className={`max-w-[70%] ${
                                    message.direction === 'outgoing' 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted'
                                  } rounded-lg px-4 py-2`}>
                                    <p className="text-sm">{message.message}</p>
                                    <p className={`text-xs mt-1 ${
                                      message.direction === 'outgoing' 
                                        ? 'text-primary-foreground/70' 
                                        : 'text-muted-foreground'
                                    }`}>
                                      {(() => {
                                        try {
                                          const date = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
                                          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        } catch (e) {
                                          return 'Invalid time'
                                        }
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Type a message..."
                              value={smsMessage}
                              onChange={(e) => setSmsMessage(e.target.value)}
                              className="min-h-[60px] max-h-[120px] resize-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  if (selectedConversation && smsMessage.trim()) {
                                    const display = safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number)
                                    setSmsRecipient(display.primaryHandle)
                                    handleSendSMS()
                                  }
                                }
                              }}
                            />
                            <Button 
              onClick={(e) => {
                e.preventDefault()
                if (selectedConversation && smsMessage.trim()) {
                  const display = safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number)
                  setSmsRecipient(display.primaryHandle)
                  handleSendSMS()
                }
              }} 
              disabled={!smsMessage.trim() || !selectedConversation}
              type="button"
            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </>
                    ) : (
                      <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground">
                        Select a conversation to view messages
                      </CardContent>
                    )}
                  </Card>
                </div>
              ) : (
                // Regular Table View for Calls/All
                <div className="rounded-lg border overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration/Message</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                              Loading communications...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredCommunications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No communications found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCommunications.map((record) => (
                          <TableRow 
                            key={record.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedRecord(record)
                              setShowDetailPanel(true)
                            }}
                          >
                            <TableCell>{getIcon(record)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {(() => {
                                      const display = safeContactDisplay(record.contact, record.contact?.number)
                                      return display.initials
                                    })()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {safeContactDisplay(record.contact, record.contact?.number).displayName}
                                  </p>
                                  {(() => {
                                    const display = safeContactDisplay(record.contact, record.contact?.number)
                                    return display.displayName !== display.primaryHandle && (
                                      <p className="text-xs text-muted-foreground">{display.primaryHandle}</p>
                                    )
                                  })()}
                                  {(() => {
                                    const display = safeContactDisplay(record.contact, record.contact?.number)
                                    return display.companyName && (
                                      <p className="text-xs text-muted-foreground">{display.companyName}</p>
                                    )
                                  })()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {record.type === 'call' && record.recording && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="h-2 w-2 bg-red-500 rounded-full" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Recording available</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <span className="capitalize text-sm">{record.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {record.duration ? (
                                <span className="font-mono text-sm">{record.duration}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                                  {record.message}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{record.agent}</TableCell>
                            <TableCell className="text-sm">{record.department}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {(() => {
                                try {
                                  const date = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp)
                                  return date.toLocaleString()
                                } catch (e) {
                                  return 'Invalid date'
                                }
                              })()}
                            </TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    const display = safeContactDisplay(record.contact, record.contact?.number)
                                    handleCall(display.primaryHandle)
                                  }}>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Call Back
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    const display = safeContactDisplay(record.contact, record.contact?.number)
                                    setSmsRecipient(display.primaryHandle)
                                    setSelectedContact(contacts.find(c => c.number === display.primaryHandle) || null)
                                    setShowSMSCompose(true)
                                  }}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Send SMS
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {record.recording && (
                                    <DropdownMenuItem>
                                      <Play className="h-4 w-4 mr-2" />
                                      Play Recording
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


      {/* SMS Compose Dialog */}
      <Dialog 
        open={showSMSCompose} 
        onOpenChange={(open) => {
          setShowSMSCompose(open)
          if (!open) {
            // Reset form when closing
            setSmsMessage('')
            setSmsRecipient('')
            setSelectedContact(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New SMS Message</DialogTitle>
            <DialogDescription>
              Send a text message to a contact or phone number
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>To</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter phone number or select contact"
                  value={selectedContact ? `${selectedContact.name} (${selectedContact.number})` : smsRecipient}
                  onChange={(e) => {
                    setSmsRecipient(e.target.value)
                    setSelectedContact(null)
                  }}
                  className="flex-1"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Users className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 sm:w-80 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search contacts..." />
                      <CommandEmpty>No contacts found.</CommandEmpty>
                      <CommandGroup>
                        {(contacts || []).map((contact) => {
                          if (!contact) return null;
                          return (
                          <CommandItem
                            key={contact.id}
                            onSelect={() => {
                              setSelectedContact(contact)
                              setSmsRecipient(contact.number)
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{(contact.name || 'U').split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{contact.name}</p>
                                <p className="text-xs text-muted-foreground">{contact.number}</p>
                              </div>
                            </div>
                          </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="min-h-[100px] resize-none"
                autoFocus={false}
              />
              <p className="text-xs text-muted-foreground text-right">
                {smsMessage.length} / 160 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSMSCompose(false)}>
              Cancel
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSendSMS()
              }} 
              disabled={!smsMessage.trim() || !smsRecipient}
              type="button"
            >
              <Send className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Panel - Slide Out */}
      <AnimatePresence>
        {selectedRecord && showDetailPanel && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 bg-background border-l shadow-lg z-50"
          >
            <div className="flex flex-col h-full">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Communication Details</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowDetailPanel(false)
                      setTimeout(() => setSelectedRecord(null), 300)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {(() => {
                        const display = safeContactDisplay(selectedRecord.contact, selectedRecord.contact?.number)
                        return display.initials
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{safeContactDisplay(selectedRecord.contact, selectedRecord.contact?.number).displayName}</p>
                    {(() => {
                      const display = safeContactDisplay(selectedRecord.contact, selectedRecord.contact?.number)
                      return display.companyName && (
                        <p className="text-sm text-muted-foreground">{display.companyName}</p>
                      )
                    })()}
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Communication Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="capitalize">{selectedRecord.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Direction</span>
                        <span className="capitalize">{selectedRecord.direction}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        {getStatusBadge(selectedRecord.status)}
                      </div>
                      {selectedRecord.duration && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-mono">{selectedRecord.duration}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span>{(() => {
                          try {
                            const date = selectedRecord.timestamp instanceof Date ? selectedRecord.timestamp : new Date(selectedRecord.timestamp)
                            return date.toLocaleString()
                          } catch (e) {
                            return 'Invalid date'
                          }
                        })()}</span>
                      </div>
                    </div>
                  </div>

                  {selectedRecord.message && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        {selectedRecord.type === 'voicemail' ? 'Transcription' : 'Message'}
                      </h4>
                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedRecord.message}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        const display = safeContactDisplay(selectedRecord.contact, selectedRecord.contact?.number)
                        handleCall(display.primaryHandle)
                      }}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call Back
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        const display = safeContactDisplay(selectedRecord.contact, selectedRecord.contact?.number)
                        setSmsRecipient(display.primaryHandle)
                        setSelectedContact(contacts.find(c => c.number === display.primaryHandle) || null)
                        setShowSMSCompose(true)
                      }}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send SMS
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      <Button variant="outline" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        View Contact
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="notes">Add Note</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add a note about this communication..."
                      className="min-h-[100px]"
                    />
                    <Button size="sm" className="w-full">
                      Save Note
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}