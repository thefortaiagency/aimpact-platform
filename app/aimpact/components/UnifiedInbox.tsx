'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Phone, Mail, MessageSquare, PhoneIncoming, PhoneOutgoing, Clock, User, Filter, Calendar, Video, Maximize2, Minimize2, Columns, Square, Ticket, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates'
import { toast } from 'sonner'
import { DraggableGrid } from '@/components/ui/draggable-grid'
import { safeContactDisplay } from '@/lib/safeContactDisplay'

interface UnifiedInboxProps {
  onNavigate?: (tab: string) => void
}

interface Communication {
  id: string
  type: 'call' | 'email' | 'sms'
  direction?: 'incoming' | 'outgoing'
  contact: {
    id?: string
    name: string
    phoneNumber?: string
    email?: string
  } | null
  from?: string
  phone?: string
  organization?: {
    id: string
    name: string
    type: 'business' | 'individual' | null
  } | null
  subject?: string
  preview: string
  timestamp: Date
  status: 'read' | 'unread' | 'missed'
  duration?: string
  isNewContact?: boolean
  isNewOrganization?: boolean
  matchConfidence?: 'high' | 'medium' | 'low' | 'unknown'
}

export default function UnifiedInbox({ onNavigate }: UnifiedInboxProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'call' | 'email' | 'sms'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread'>('all')
  const [selectedItem, setSelectedItem] = useState<Communication | null>(null)
  const [communicationsHeight, setCommunicationsHeight] = useState(() => {
    // Load saved height from localStorage or use default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unified-inbox-height')
      return saved ? parseInt(saved) : 800
    }
    return 800
  })
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)
  const [isFullWidth, setIsFullWidth] = useState(() => {
    // Load saved width preference from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unified-inbox-full-width')
      return saved === 'true'
    }
    return false
  })

  const [communications, setCommunications] = useState<Communication[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCommunications = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/aimpact/unified-inbox')
      if (response.ok) {
        const data = await response.json()
        setCommunications(data.communications || [])
      }
    } catch (error) {
      console.error('Error fetching unified communications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createTicketFromCommunication = useCallback(async (communication: Communication) => {
    try {
      setIsCreatingTicket(true)
      const response = await fetch('/api/aimpact/tickets/from-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communicationId: communication.id,
          priority: 'medium',
          category: communication.type === 'email' ? 'Email Support' : 
                    communication.type === 'phone' ? 'Phone Support' : 'SMS Support'
        })
      })
      
      if (response.ok) {
        const ticket = await response.json()
        toast('Ticket created successfully', {
          description: `Ticket #${ticket.ticketNumber} has been created`
        })
        // Optionally navigate to tickets page
        onNavigate?.('tickets')
      } else {
        throw new Error('Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast('Failed to create ticket', {
        description: 'Please try again'
      })
    } finally {
      setIsCreatingTicket(false)
    }
  }, [onNavigate])

  // Track component visibility and mounting
  const [isVisible, setIsVisible] = useState(true)
  const [isMounted, setIsMounted] = useState(true)

  // Use real-time updates only when component is visible and mounted
  useRealtimeUpdates({
    enabled: isVisible && isMounted, // Only connect when visible and mounted
    connectionId: 'unified-inbox', // Unique ID for this component
    onUpdate: (data) => {
      // Refresh communications when we receive an update
      if (data.type === 'new_communication' || data.type === 'communication_update') {
        fetchCommunications()
        
        // Show notification for new emails
        if (data.communicationType === 'email' && data.direction === 'inbound') {
          toast.success('New email received!', {
            description: data.subject || 'Check your inbox'
          })
        }
      }
    },
    onConnect: () => {
      console.log('Connected to real-time updates')
    },
    onDisconnect: () => {
      console.log('Disconnected from real-time updates')
    }
  })

  // Handle visibility change and component unmounting
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      setIsMounted(false) // Disconnect SSE when component unmounts
    }
  }, [])

  useEffect(() => {
    fetchCommunications()

    // Still keep polling as backup, but less frequently
    const interval = setInterval(fetchCommunications, 120000) // 2 minutes
    return () => clearInterval(interval)
  }, [fetchCommunications])

  const filteredCommunications = useMemo(() => {
    return communications.filter(item => {
      // Filter by type
      if (filterType !== 'all' && item.type !== filterType) return false
      
      // Filter by status
      if (filterStatus === 'unread' && item.status === 'read') return false
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const display = safeContactDisplay(item.contact, item.from || item.phone)
        const matchesContact = display.displayName.toLowerCase().includes(query) ||
          display.primaryHandle.toLowerCase().includes(query) ||
          display.secondaryHandle?.toLowerCase().includes(query)
        const matchesContent = item.preview.toLowerCase().includes(query) ||
          item.subject?.toLowerCase().includes(query)
        
        if (!matchesContact && !matchesContent) return false
      }
      
      return true
    })
  }, [communications, filterType, filterStatus, searchQuery])

  const getIcon = (item: Communication) => {
    switch (item.type) {
      case 'call':
        if (item.status === 'missed') return <PhoneIncoming className="h-5 w-5 text-red-500" />
        return item.direction === 'incoming' 
          ? <PhoneIncoming className="h-5 w-5 text-green-500" />
          : <PhoneOutgoing className="h-5 w-5 text-blue-500" />
      case 'email':
        return <Mail className="h-5 w-5 text-muted-foreground" />
      case 'sms':
        return <MessageSquare className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (item: Communication) => {
    if (item.status === 'unread') {
      return <Badge variant="default" className="text-xs">New</Badge>
    }
    if (item.status === 'missed') {
      return <Badge variant="destructive" className="text-xs">Missed</Badge>
    }
    return null
  }

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayItems = communications.filter(item => 
      item.timestamp >= today
    )
    
    return {
      total: communications.length,
      unread: communications.filter(item => item.status === 'unread').length,
      today: todayItems.length,
      calls: communications.filter(item => item.type === 'call').length,
      emails: communications.filter(item => item.type === 'email').length,
      sms: communications.filter(item => item.type === 'sms').length
    }
  }, [communications])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <DraggableGrid
        storageKey="unified-inbox-stats"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4"
        enabled={true}
      >
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="text-xl lg:text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="text-xl lg:text-2xl font-bold">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="text-xl lg:text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="text-xl lg:text-2xl font-bold">{stats.calls}</div>
            <p className="text-xs text-muted-foreground">Calls</p>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="text-xl lg:text-2xl font-bold">{stats.emails}</div>
            <p className="text-xs text-muted-foreground">Emails</p>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="text-xl lg:text-2xl font-bold">{stats.sms}</div>
            <p className="text-xs text-muted-foreground">SMS</p>
          </CardContent>
        </Card>
      </DraggableGrid>

      {/* Main Content */}
      <div className={`grid grid-cols-1 ${isFullWidth ? '' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-4 lg:gap-6`}>
        {/* Communication List */}
        <div className={isFullWidth ? 'col-span-1' : 'lg:col-span-2 xl:col-span-3'}>
          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg lg:text-xl">All Communications</CardTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title={isFullWidth ? "Show sidebar" : "Hide sidebar"}
                    onClick={() => {
                      setIsFullWidth(!isFullWidth)
                      localStorage.setItem('unified-inbox-full-width', (!isFullWidth).toString())
                    }}
                  >
                    {isFullWidth ? <Columns className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Adjust height"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setCommunicationsHeight(400)
                        localStorage.setItem('unified-inbox-height', '400')
                      }}>
                        Compact (400px)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setCommunicationsHeight(600)
                        localStorage.setItem('unified-inbox-height', '600')
                      }}>
                        Medium (600px)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setCommunicationsHeight(800)
                        localStorage.setItem('unified-inbox-height', '800')
                      }}>
                        Large (800px)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setCommunicationsHeight(1000)
                        localStorage.setItem('unified-inbox-height', '1000')
                      }}>
                        Extra Large (1000px)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const maxHeight = window.innerHeight - 400
                        setCommunicationsHeight(maxHeight)
                        localStorage.setItem('unified-inbox-height', maxHeight.toString())
                      }}>
                        Full Height
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                    <SelectTrigger className="w-28 sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="call">Calls</SelectItem>
                      <SelectItem value="email">Emails</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                    <SelectTrigger className="w-28 sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea style={{ height: `${communicationsHeight}px` }} className="transition-all duration-300">
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground">Loading communications...</div>
                    </div>
                  ) : filteredCommunications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No communications found
                    </div>
                  ) : (
                    filteredCommunications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 lg:p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                        selectedItem?.id === item.id ? 'bg-accent' : ''
                      } ${item.status === 'unread' ? 'border-primary/50' : ''}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className={`flex items-start gap-3 ${isFullWidth ? 'lg:gap-4' : ''}`}>
                        <div className="mt-1">{getIcon(item)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{safeContactDisplay(item.contact, item.from || item.phone).displayName}</p>
                                {item.isNewContact && (
                                  <Badge variant="secondary" className="text-xs">New</Badge>
                                )}
                                {getStatusBadge(item)}
                              </div>
                              {item.organization && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.organization.name}
                                  {item.isNewOrganization && (
                                    <span className="text-primary ml-1">(New)</span>
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isFullWidth && (
                                <div className="flex gap-1 mr-2">
                                  {item.type === 'call' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onNavigate?.('phone')
                                      }}
                                    >
                                      <Phone className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {item.type === 'email' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onNavigate?.('email')
                                      }}
                                    >
                                      <Mail className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {item.type === 'sms' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onNavigate?.('phone')
                                      }}
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      createTicketFromCommunication(item)
                                    }}
                                    disabled={isCreatingTicket}
                                    title="Create ticket from this communication"
                                  >
                                    <Ticket className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 hidden sm:block" />
                                {(() => {
                                  try {
                                    const date = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)
                                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  } catch (e) {
                                    return 'Invalid time'
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                          {item.subject && (
                            <p className="text-sm font-medium mt-1">{item.subject}</p>
                          )}
                          <p className={`text-sm text-muted-foreground mt-1 ${isFullWidth ? 'line-clamp-3' : 'line-clamp-2'}`}>
                            {item.preview}
                          </p>
                          {item.duration && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Duration: {item.duration}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Details */}
        {!isFullWidth && (
        <div className="space-y-4">
          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg lg:text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => onNavigate?.('phone')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Make a Call
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => onNavigate?.('email')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Compose Email
              </Button>
              {selectedItem && (
                <Button 
                  className="w-full justify-start" 
                  variant="default"
                  onClick={() => createTicketFromCommunication(selectedItem)}
                  disabled={isCreatingTicket}
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Create Ticket from Selected
                </Button>
              )}
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => onNavigate?.('messaging')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => onNavigate?.('phone')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send SMS
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => onNavigate?.('video')}
              >
                <Video className="h-4 w-4 mr-2" />
                Start Meeting
              </Button>
            </CardContent>
          </Card>

          {selectedItem && (
            <Card className="bg-card/30 backdrop-blur-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg lg:text-xl">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {(() => {
                          const display = safeContactDisplay(selectedItem.contact, selectedItem.from || selectedItem.phone)
                          return display.initials
                        })()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">
                        {(() => {
                          const display = safeContactDisplay(selectedItem.contact, selectedItem.from || selectedItem.phone)
                          return display.displayName
                        })()}
                        {selectedItem.isNewContact && (
                          <Badge variant="secondary" className="ml-2 text-xs">New Contact</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const display = safeContactDisplay(selectedItem.contact, selectedItem.from || selectedItem.phone)
                          return display.primaryHandle
                        })()}
                      </p>
                      {selectedItem.organization && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {selectedItem.organization.name}
                          {selectedItem.organization.type === 'business' && (
                            <Badge variant="outline" className="ml-2 text-xs">Business</Badge>
                          )}
                          {selectedItem.isNewOrganization && (
                            <Badge variant="secondary" className="ml-2 text-xs">New Org</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="capitalize">{selectedItem.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span>{selectedItem.timestamp.toLocaleString()}</span>
                    </div>
                    {selectedItem.duration && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{selectedItem.duration}</span>
                      </div>
                    )}
                    {selectedItem.matchConfidence && selectedItem.matchConfidence !== 'unknown' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Match Confidence:</span>
                        <Badge variant={
                          selectedItem.matchConfidence === 'high' ? 'default' :
                          selectedItem.matchConfidence === 'medium' ? 'secondary' : 'outline'
                        } className="text-xs">
                          {selectedItem.matchConfidence}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 space-y-2">
                    {selectedItem.type === 'call' && (
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => {
                          onNavigate?.('phone')
                          // TODO: Pass phone number to phone interface
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Back
                      </Button>
                    )}
                    {selectedItem.type === 'email' && (
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => {
                          onNavigate?.('email')
                          // TODO: Pass email context to email interface
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                    )}
                    {selectedItem.type === 'sms' && (
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => {
                          onNavigate?.('phone')
                          // TODO: Pass SMS context to phone interface
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Reply SMS
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        )}
      </div>
    </div>
  )
}