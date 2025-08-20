'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Mail, Send, Archive, Trash2, Star, Reply, Forward,
  Paperclip, Search, Filter, MoreVertical, Clock,
  CheckCircle, AlertCircle, Info, Calendar, Tag,
  FolderOpen, Inbox, Users, FileText, Link as LinkIcon,
  Download, Eye, EyeOff, Bell, BellOff, Flag,
  Zap, Brain, Sparkles, ChevronDown, RefreshCw,
  User, Building2, Phone, Globe, MapPin, X, AlertTriangle,
  Ticket, UserPlus, Loader2
} from 'lucide-react'
import { DraggableGrid } from '@/components/ui/draggable-grid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AsyncErrorBoundary } from '@/components/error-boundary'
import { handleAPIResponse, showErrorToast, retryWithBackoff } from '@/lib/error-handling'
import { EmailComposeModal } from './EmailComposeModal'

interface EmailMessage {
  id: string
  from: {
    name: string
    email: string
    avatar?: string
    organization?: string
  }
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  preview: string
  body: string
  htmlBody?: string
  timestamp: Date
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash'
  isRead: boolean
  isStarred: boolean
  isFlagged: boolean
  hasAttachments: boolean
  attachments?: {
    id: string
    name: string
    size: number
    type: string
  }[]
  labels?: string[]
  priority?: 'high' | 'normal' | 'low'
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export default function EmailInterface() {
  return (
    <AsyncErrorBoundary>
      <EmailInterfaceContent />
    </AsyncErrorBoundary>
  )
}

function EmailInterfaceContent() {
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showConfigAlert, setShowConfigAlert] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [hasMoreEmails, setHasMoreEmails] = useState(true)
  const [currentPageToken, setCurrentPageToken] = useState<string | null>(null)
  const [composeDefaults, setComposeDefaults] = useState({
    to: '',
    subject: '',
    body: ''
  })
  const [showTicketDialog, setShowTicketDialog] = useState(false)
  const [selectedEmailForTicket, setSelectedEmailForTicket] = useState<EmailMessage | null>(null)
  const [ticketData, setTicketData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'Email Support',
    assignedTo: ''
  })
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)
  
  // Use ref to track loading state without causing re-renders
  const loadingRef = useRef(false)

  // Fetch emails function - stable reference with pagination
  const fetchEmails = useCallback(async (reset = true) => {
    if (loadingRef.current) return // Prevent multiple simultaneous fetches
    
    try {
      loadingRef.current = true
      if (reset) {
        setLoading(true)
        setEmails([]) // Clear emails when resetting
        setCurrentPageToken(null)
      } else {
        setLoadingMore(true)
      }
      setFetchError(null)
      
      const params = new URLSearchParams()
      params.append('folder', selectedFolder)
      params.append('limit', reset ? '10' : '20') // Start with 10, then load 20 more
      if (searchQuery) params.append('search', searchQuery)
      if (!reset && currentPageToken) params.append('pageToken', currentPageToken)
      
      const response = await fetch(`/api/aimpact/emails?${params}`)
      console.log('[EmailInterface] Fetching emails with params:', params.toString())
      
      if (!response.ok) {
        console.error('[EmailInterface] Response not OK:', response.status, response.statusText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('[EmailInterface] Received data:', data)
      
      if (data.emails) {
        if (reset) {
          setEmails(data.emails)
        } else {
          setEmails(prev => [...prev, ...data.emails])
        }
        setCurrentPageToken(data.nextPageToken || null)
        setHasMoreEmails(!!data.nextPageToken)
        console.log(`[EmailInterface] Loaded ${data.emails.length} emails (total: ${reset ? data.emails.length : emails.length + data.emails.length})`)
      } else {
        if (reset) setEmails([])
        setHasMoreEmails(false)
        console.log('[EmailInterface] No emails in response')
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      setFetchError('Unable to load emails. Please try again.')
      if (reset) setEmails([])
    } finally {
      loadingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedFolder, searchQuery, currentPageToken, emails.length])

  // Load more emails function
  const loadMoreEmails = useCallback(() => {
    if (!hasMoreEmails || loadingMore) return
    fetchEmails(false)
  }, [fetchEmails, hasMoreEmails, loadingMore])

  // Initial fetch and when folder/search changes
  useEffect(() => {
    fetchEmails(true) // Always reset when folder/search changes
  }, [selectedFolder, searchQuery]) // Don't include fetchEmails to avoid loops

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEmails(true) // Reset on auto-refresh
      }
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [fetchEmails])

  // Real-time updates
  useRealtimeUpdates({
    enabled: true,
    connectionId: 'email-interface',
    onUpdate: (data) => {
      if (data.type === 'new_communication' || data.type === 'communication_update') {
        if (data.communicationType === 'email') {
          fetchEmails(true)
          if (data.direction === 'inbound') {
            toast.success('New email received!', {
              description: data.subject || 'Check your inbox'
            })
          }
        }
      }
    }
  })

  // Email folders with counts
  const folders = useMemo(() => {
    const getFolderCounts = (folder: string) => {
      const folderEmails = emails.filter(email => email.folder === folder)
      return {
        count: folderEmails.length,
        unread: folderEmails.filter(email => !email.isRead).length
      }
    }

    return [
      { id: 'inbox', name: 'Inbox', icon: Inbox, ...getFolderCounts('inbox') },
      { id: 'sent', name: 'Sent', icon: Send, ...getFolderCounts('sent') },
      { id: 'drafts', name: 'Drafts', icon: FileText, ...getFolderCounts('drafts') },
      { id: 'archive', name: 'Archive', icon: Archive, ...getFolderCounts('archive') },
      { id: 'trash', name: 'Trash', icon: Trash2, ...getFolderCounts('trash') }
    ]
  }, [emails])

  // Filtered emails
  const filteredEmails = useMemo(() => 
    emails.filter(email => email.folder === selectedFolder),
    [emails, selectedFolder]
  )

  const handleEmailSent = () => {
    // Refresh emails after sending
    fetchEmails(true)
  }

  const handleReply = (email: EmailMessage) => {
    setComposeDefaults({
      to: email.from.email,
      subject: `Re: ${email.subject}`,
      body: `\n\n---\nOn ${new Date(email.timestamp).toLocaleString()}, ${email.from.name} wrote:\n${email.body}`
    })
    setIsComposing(true)
  }

  const handleNewCompose = () => {
    console.log('[EmailInterface] handleNewCompose called')
    setComposeDefaults({
      to: '',
      subject: '',
      body: ''
    })
    setIsComposing(true)
    console.log('[EmailInterface] isComposing set to true')
  }

  const handleCreateTicket = (email: EmailMessage) => {
    setSelectedEmailForTicket(email)
    setTicketData({
      subject: email.subject,
      description: `From: ${email.from.name} (${email.from.email})\n\n${email.body}`,
      priority: email.priority === 'high' ? 'high' : 'medium',
      category: 'Email Support',
      assignedTo: ''
    })
    setShowTicketDialog(true)
  }

  const submitTicket = async () => {
    if (!selectedEmailForTicket) return
    
    try {
      setIsCreatingTicket(true)
      
      // First, try to find or create a client
      const clientResponse = await fetch('/api/aimpact/clients/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedEmailForTicket.from.email,
          name: selectedEmailForTicket.from.name,
          organization: selectedEmailForTicket.from.organization
        })
      })
      
      const clientData = await handleAPIResponse(clientResponse)
      
      // Create the ticket without assignedTo for now (would need user UUIDs)
      const ticketPayload: any = {
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        contactId: clientData.contactId,
        organizationId: clientData.organizationId,
        sourceEmail: {
          messageId: selectedEmailForTicket.id,
          from: selectedEmailForTicket.from.email,
          subject: selectedEmailForTicket.subject
        }
      }
      
      // Note: assignedTo requires a user UUID, not a name
      // For now, we'll leave tickets unassigned
      
      const ticketResponse = await fetch('/api/aimpact/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayload)
      })
      
      const ticket = await handleAPIResponse(ticketResponse)
      
      toast.success('Ticket created successfully', {
        description: `Ticket #${ticket.ticketNumber} has been created`
      })
      
      setShowTicketDialog(false)
      setSelectedEmailForTicket(null)
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast.error('Failed to create ticket', {
        description: 'Please try again'
      })
    } finally {
      setIsCreatingTicket(false)
    }
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="col-span-1">
        <Card className="bg-card/30 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Folders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.id ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedFolder(folder.id)}
              >
                <folder.icon className="h-4 w-4 mr-2" />
                {folder.name}
                {folder.unread > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {folder.unread}
                  </Badge>
                )}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md mt-4">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full" 
              onClick={handleNewCompose}
            >
              <Send className="h-4 w-4 mr-2" />
              Compose
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => fetchEmails(true)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Email List and Detail View */}
      <div className="col-span-3">
        {selectedEmail ? (
          // Email Detail View
          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedEmail(null)}
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                  <CardTitle>{selectedEmail.subject}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReply(selectedEmail)}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreateTicket(selectedEmail)}
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{selectedEmail.from.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedEmail.from.email}</p>
                    {selectedEmail.from.organization && (
                      <p className="text-sm text-muted-foreground">{selectedEmail.from.organization}</p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedEmail.timestamp).toLocaleString()}
                  </div>
                </div>
                
                <Separator />
                
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody || selectedEmail.body.replace(/\n/g, '<br/>') }} />
                </div>
                
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium mb-2">Attachments</p>
                      <div className="space-y-1">
                        {selectedEmail.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-2 text-sm">
                            <Paperclip className="h-4 w-4" />
                            <span>{attachment.name}</span>
                            <span className="text-muted-foreground">
                              ({(attachment.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          // Email List
          <Card className="bg-card/30 backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)}
              </CardTitle>
              {fetchError && (
                <Alert className="mb-0">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {loading && filteredEmails.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading emails...</div>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No emails in this folder
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      className={`p-4 border rounded-lg hover:bg-accent transition-colors ${
                        selectedEmail?.id === email.id ? 'bg-accent' : ''
                      } ${!email.isRead ? 'border-primary/50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => setSelectedEmail(email)}>
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${!email.isRead ? 'font-bold' : ''}`}>
                              {email.from.name}
                            </p>
                            {email.isStarred && <Star className="h-4 w-4 text-yellow-500" />}
                            {email.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">High</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium mt-1">{email.subject}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {email.preview}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReply(email)
                              }}
                            >
                              <Reply className="h-3 w-3 mr-1" />
                              Reply
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCreateTicket(email)
                              }}
                            >
                              <Ticket className="h-3 w-3 mr-1" />
                              Create Ticket
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(email.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasMoreEmails && filteredEmails.length > 0 && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        onClick={loadMoreEmails}
                        disabled={loadingMore}
                        className="w-full"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading more...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Load More Emails
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Email Compose Modal */}
      <EmailComposeModal
        isOpen={isComposing}
        onClose={() => setIsComposing(false)}
        onEmailSent={handleEmailSent}
        defaultTo={composeDefaults.to}
        defaultSubject={composeDefaults.subject}
        defaultBody={composeDefaults.body}
      />

      {/* Create Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Create a ticket from this email and assign it to a technician
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticket-subject">Subject</Label>
                <Input
                  id="ticket-subject"
                  value={ticketData.subject}
                  onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                  placeholder="Ticket subject"
                />
              </div>
              <div>
                <Label htmlFor="ticket-priority">Priority</Label>
                <Select 
                  value={ticketData.priority} 
                  onValueChange={(value) => setTicketData({ ...ticketData, priority: value })}
                >
                  <SelectTrigger id="ticket-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticket-category">Category</Label>
                <Select 
                  value={ticketData.category} 
                  onValueChange={(value) => setTicketData({ ...ticketData, category: value })}
                >
                  <SelectTrigger id="ticket-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email Support">Email Support</SelectItem>
                    <SelectItem value="Technical Support">Technical Support</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Feature Request">Feature Request</SelectItem>
                    <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ticket-assignee">Assign To</Label>
                <Select 
                  value="unassigned" 
                  disabled
                >
                  <SelectTrigger id="ticket-assignee" disabled>
                    <SelectValue placeholder="Assignment coming soon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Assignment feature coming soon</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Tech assignment requires user setup
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="ticket-description">Description</Label>
              <Textarea
                id="ticket-description"
                value={ticketData.description}
                onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                placeholder="Ticket description..."
                className="min-h-[150px]"
              />
            </div>
            
            {selectedEmailForTicket && (
              <div className="p-4 bg-secondary/20 rounded-lg">
                <p className="text-sm font-medium mb-1">Original Email</p>
                <p className="text-sm text-muted-foreground">
                  From: {selectedEmailForTicket.from.name} ({selectedEmailForTicket.from.email})
                </p>
                <p className="text-sm text-muted-foreground">
                  Subject: {selectedEmailForTicket.subject}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitTicket} disabled={isCreatingTicket}>
              {isCreatingTicket ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Ticket className="h-4 w-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}