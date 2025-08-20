'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Mail, Send, Archive, Trash2, Star, Reply, Forward,
  Paperclip, Search, Filter, MoreVertical, Clock,
  CheckCircle, AlertCircle, Info, Calendar, Tag,
  FolderOpen, Inbox, Users, FileText, Link as LinkIcon,
  Download, Eye, EyeOff, Bell, BellOff, Flag,
  Zap, Brain, Sparkles, ChevronDown, RefreshCw,
  User, Building2, Phone, Globe, MapPin, X, AlertTriangle,
  Ticket, UserPlus
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
  const [showConfigAlert, setShowConfigAlert] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
  })
  const [showCreateTicketDialog, setShowCreateTicketDialog] = useState(false)
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false)
  const [ticketData, setTicketData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general',
    clientId: ''
  })
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  })
  const [clients, setClients] = useState<Array<{id: string, name: string, email: string, company?: string}>>([])
  const [matchedClient, setMatchedClient] = useState<any>(null)

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true)
      setFetchError(null)
      const params = new URLSearchParams()
      params.append('folder', selectedFolder)
      if (searchQuery) params.append('search', searchQuery)
      
      const data = await retryWithBackoff(async () => {
        const response = await fetch(`/api/aimpact/emails?${params}`)
        return handleAPIResponse<{ emails: EmailMessage[] }>(response)
      }, {
        maxRetries: 2,
        shouldRetry: (error) => {
          // Don't retry auth errors
          if (error instanceof APIError && (error.status === 401 || error.status === 403)) {
            return false
          }
          return true
        }
      })
      
      if (data.emails) {
        setEmails(data.emails)
        setFetchError(null)
        console.log(`Loaded ${data.emails.length} emails`)
      } else {
        setEmails([])
        console.log('No emails returned from API')
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      showErrorToast(error, 'Failed to fetch emails', {
        component: 'EmailInterface',
        action: 'fetchEmails',
        folder: selectedFolder,
        searchQuery: searchQuery
      })
      setFetchError('Unable to load emails. Please try again.')
      setEmails([])
    } finally {
      setLoading(false)
    }
  }, [selectedFolder, searchQuery])

  // Use real-time updates with stable configuration
  const { isConnected } = useRealtimeUpdates({
    enabled: true, // Let the SSE manager handle connection lifecycle
    connectionId: 'email-interface', // Stable ID for this component
    onUpdate: useCallback((data: any) => {
      // Refresh emails when we receive an update
      if (data.type === 'new_communication' || data.type === 'communication_update') {
        if (data.communicationType === 'email') {
          console.log('Email update received:', data)
          fetchEmails()
          
          // Show notification for new inbound emails
          if (data.direction === 'inbound') {
            toast.success('New email received!', {
              description: data.subject || 'Check your inbox'
            })
          }
        }
      }
    }, [fetchEmails]),
    onConnect: useCallback(() => {
      console.log('Connected to real-time email updates')
    }, []),
    onDisconnect: useCallback(() => {
      console.log('Disconnected from real-time email updates')
    }, [])
  })

  // Email folders with dynamic counts - memoized to prevent re-renders
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

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails]) // Only re-fetch when folder or search changes

  const handleSendEmail = async () => {
    try {
      setSendStatus({ type: null, message: '' })
      console.log('Sending email via Power Automate...', composeData)
      
      await retryWithBackoff(async () => {
        const response = await fetch('/api/aimpact/power-automate/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: composeData.to.split(',').map(email => email.trim()),
            cc: composeData.cc ? composeData.cc.split(',').map(email => email.trim()) : [],
            bcc: composeData.bcc ? composeData.bcc.split(',').map(email => email.trim()) : [],
            subject: composeData.subject,
            body: composeData.body,
            attachments: []
          })
        })
        return handleAPIResponse(response)
      })
      
      setSendStatus({ type: 'success', message: 'Email sent successfully via Power Automate!' })
      setTimeout(() => {
        setIsComposing(false)
        setComposeData({ to: '', cc: '', bcc: '', subject: '', body: '' })
        setSendStatus({ type: null, message: '' })
      }, 2000)
      
      // Refresh emails after sending
      await fetchEmails()
    } catch (error) {
      console.error('Failed to send email:', error)
      showErrorToast(error, 'Failed to send email', {
        component: 'EmailInterface',
        action: 'sendEmail',
        to: composeData.to,
        subject: composeData.subject
      })
      setSendStatus({ type: 'error', message: 'Unable to send email. Please try again.' })
    }
  }

  const syncWithPowerAutomate = useCallback(async (showVisualFeedback = true) => {
    try {
      setLoading(true)
      if (showVisualFeedback) {
        setSyncError(null)
      }
      console.log('Checking for new emails from Power Automate...')
      
      // For Power Automate, emails are pushed to us via webhook
      // This function just refreshes the display
      await fetchEmails()
      
      setLastSyncTime(new Date())
      if (showVisualFeedback) {
        setSyncError(null)
      }
      console.log('Email list refreshed')
    } catch (error) {
      console.error('Failed to refresh emails:', error)
      const errorMessage = 'Failed to refresh email list'
      if (showVisualFeedback) {
        setSyncError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [fetchEmails])
  
  // Keep the old function name for compatibility
  const syncWithGmail = syncWithPowerAutomate

  // Auto-sync emails every 5 minutes as backup to real-time updates
  useEffect(() => {
    // Set up interval for automatic refresh as backup to real-time updates
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing emails (backup)...')
        fetchEmails()
      }
    }, 5 * 60 * 1000) // 5 minutes
    
    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [fetchEmails])

  const filteredEmails = useMemo(() => 
    emails.filter(email => email.folder === selectedFolder),
    [emails, selectedFolder]
  )
  const isDemoMode = false

  // Fetch clients from CRM
  const fetchClients = async () => {
    try {
      const data = await retryWithBackoff(async () => {
        const response = await fetch('/api/aimpact/crm/contacts')
        return handleAPIResponse<{ contacts: any[] }>(response)
      })
      setClients(data.contacts || [])
    } catch (error) {
      console.error('Failed to fetch clients:', error)
      // Don't show toast for non-critical background fetch
    }
  }

  // Load clients on component mount
  useEffect(() => {
    fetchClients()
  }, [])

  // Check if email matches a client
  const checkClientMatch = (email: EmailMessage) => {
    if (!email || !email.from || !email.from.email) {
      setMatchedClient(null)
      return null
    }
    const matched = clients.find(client => 
      client.email && client.email.toLowerCase() === email.from.email.toLowerCase()
    )
    setMatchedClient(matched || null)
    return matched
  }

  // Create a new client
  const handleCreateClient = async () => {
    try {
      const newClient = await retryWithBackoff(async () => {
        const response = await fetch('/api/aimpact/crm/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: newClientData.name.split(' ')[0] || '',
            lastName: newClientData.name.split(' ').slice(1).join(' ') || '',
            email: newClientData.email,
            phone: newClientData.phone,
            organization: newClientData.company
          })
        })
        return handleAPIResponse(response)
      })
      
      setClients([...clients, newClient])
      setMatchedClient(newClient)
      setShowCreateClientDialog(false)
      setNewClientData({ name: '', email: '', phone: '', company: '' })
      toast.success('Client created successfully')
    } catch (error) {
      console.error('Failed to create client:', error)
      showErrorToast(error, 'Failed to create client', {
        component: 'EmailInterface',
        action: 'createClient',
        clientEmail: newClientData.email
      })
    }
  }

  // Create ticket from email
  const handleCreateTicketFromEmail = async () => {
    if (!selectedEmail) return

    try {
      await retryWithBackoff(async () => {
        const response = await fetch('/api/aimpact/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: ticketData.subject || selectedEmail.subject,
            description: ticketData.description || selectedEmail.body,
            priority: ticketData.priority,
            category: ticketData.category,
            customerEmail: selectedEmail.from.email,
            customerName: selectedEmail.from.name,
            customerId: matchedClient?.id || ticketData.clientId,
            source: 'email',
            emailId: selectedEmail.id
          })
        })
        return handleAPIResponse(response)
      })
      
      setShowCreateTicketDialog(false)
      setTicketData({ subject: '', description: '', priority: 'medium', category: 'general', clientId: '' })
      toast.success('Ticket created successfully')
    } catch (error) {
      console.error('Failed to create ticket:', error)
      showErrorToast(error, 'Failed to create ticket', {
        component: 'EmailInterface',
        action: 'createTicket',
        emailId: selectedEmail?.id,
        subject: ticketData.subject
      })
    }
  }

  // Open create ticket dialog with email data
  const openCreateTicketDialog = (email: EmailMessage | null) => {
    if (!email) return
    
    setSelectedEmail(email)
    checkClientMatch(email)
    setTicketData({
      subject: email.subject || 'No Subject',
      description: email.body || '',
      priority: 'medium',
      category: 'general',
      clientId: ''
    })
    setShowCreateTicketDialog(true)
  }

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <Card className={`bg-card/30 backdrop-blur-md ${syncError ? 'border-red-500/50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-full ${syncError ? 'bg-red-500/20' : 'bg-primary/20'}`}>
              <Zap className={`h-5 w-5 ${syncError ? 'text-red-500' : 'text-primary'}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Power Automate Email Status</h3>
              <div className="text-sm text-muted-foreground">
                {syncError ? (
                  <span className="text-red-500">{syncError}</span>
                ) : (
                  <>
                    <span className="flex items-center gap-2">
                      <span>Connected to: Power Automate Email Service</span>
                      <span className="flex items-center gap-1 text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs">Live</span>
                      </span>
                    </span>
                    {lastSyncTime && ` • Last refresh: ${(() => {
                      try {
                        return lastSyncTime.toLocaleTimeString()
                      } catch (e) {
                        return 'Invalid time'
                      }
                    })()}`}
                  </>
                )}
              </div>
            </div>
          </div>
          {syncError && (
            <Alert className="mt-3 border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {syncError}. Please check your authentication and try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <DraggableGrid
        storageKey="email-layout"
        className="grid grid-cols-1 lg:grid-cols-[256px_400px_1fr] h-auto lg:h-[calc(100vh-16rem)] gap-4 lg:gap-6"
        enabled={true}
      >
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              className="w-full gap-2" 
              onClick={() => setIsComposing(true)}
              size="default"
            >
              <Mail className="h-4 w-4" />
              Compose
            </Button>
            <Button 
              variant={syncError ? "destructive" : "outline"}
              className="w-full gap-2"
              onClick={() => syncWithGmail(true)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Syncing...' : syncError ? 'Retry Sync' : 'Sync with Gmail'}
            </Button>
          </div>

          {/* Email Stats */}
          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Email Statistics</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Emails</span>
                <span className="font-semibold">{emails.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Unread</span>
                <Badge variant="secondary">
                  {emails.filter(e => !e.isRead).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Starred</span>
                <span className="font-semibold">{emails.filter(e => e.isStarred).length}</span>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Real-time updates active</span>
                </div>
                <div>Auto-sync every 5 minutes</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 backdrop-blur-md">
            <CardContent className="p-3 lg:p-4">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:space-y-1">
                {folders.map((folder) => {
                  const Icon = folder.icon
                  return (
                    <Button
                      key={folder.id}
                      variant={selectedFolder === folder.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-2 lg:gap-3 text-sm lg:text-base"
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left truncate">{folder.name}</span>
                      <div className="flex items-center gap-2">
                        {folder.count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {folder.count}
                          </span>
                        )}
                        {folder.unread > 0 && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            {folder.unread}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email List */}
        <Card className="bg-card/30 backdrop-blur-md h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{folders.find(f => f.id === selectedFolder)?.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchEmails()}
                  disabled={loading}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {fetchError && (
                <Alert className="m-4 border-red-500/50 bg-red-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
              )}
              <ScrollArea className="h-[calc(100vh-20rem)]">
                {loading ? (
                  <div className="p-8 text-center">Loading...</div>
                ) : fetchError ? (
                  <div className="p-8 text-center">
                    <Button onClick={() => fetchEmails()} variant="outline">
                      Try Again
                    </Button>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No emails in this folder
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      className={`
                        border-b cursor-pointer transition-colors p-4
                        ${!email.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
                        ${selectedEmail?.id === email.id ? 'bg-accent' : 'hover:bg-muted/50'}
                      `}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {email.from?.name ? email.from.name.split(' ').map(n => n[0]).join('') : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`font-medium text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                              {email.from?.name || 'Unknown Sender'}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {email.timestamp ? new Date(email.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : ''}
                            </span>
                          </div>
                          <p className={`text-sm truncate mb-1 ${!email.isRead ? 'font-semibold' : ''}`}>
                            {email.subject || 'No Subject'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {email.preview || ''}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEmails(emails.map(e => 
                              e.id === email.id ? { ...e, isStarred: !e.isStarred } : e
                            ))
                          }}
                        >
                          <Star className={`h-4 w-4 ${email.isStarred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
        </Card>

        {/* Email Content */}
        {selectedEmail ? (
          <Card className="bg-card/30 backdrop-blur-md h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{selectedEmail.subject || 'No Subject'}</h3>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {selectedEmail.from && selectedEmail.from.name ? 
                            selectedEmail.from.name.split(' ').map(n => n[0]).join('') : 
                            '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedEmail.from?.name || 'Unknown Sender'}</p>
                        <p className="text-sm text-muted-foreground">{selectedEmail.from?.email || 'No email address'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openCreateTicketDialog(selectedEmail)}
                      className="gap-2"
                    >
                      <Ticket className="h-4 w-4" />
                      Create Ticket
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (selectedEmail && selectedEmail.from) {
                          setComposeData({
                            to: selectedEmail.from.email || '',
                            cc: '',
                            bcc: '',
                            subject: `Re: ${selectedEmail.subject || ''}`,
                            body: `\n\n---\nOn ${selectedEmail.timestamp ? new Date(selectedEmail.timestamp).toLocaleString() : 'Unknown date'}, ${selectedEmail.from.name || 'Unknown'} wrote:\n${selectedEmail.body || ''}`
                          })
                          setIsComposing(true)
                        }
                      }}
                      title="Reply"
                    >
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (selectedEmail && selectedEmail.from) {
                          setComposeData({
                            to: '',
                            cc: '',
                            bcc: '',
                            subject: `Fwd: ${selectedEmail.subject || ''}`,
                            body: `\n\n--- Forwarded message ---\nFrom: ${selectedEmail.from.name || 'Unknown'} <${selectedEmail.from.email || ''}>\nDate: ${selectedEmail.timestamp ? new Date(selectedEmail.timestamp).toLocaleString() : 'Unknown date'}\nSubject: ${selectedEmail.subject || ''}\n\n${selectedEmail.body || ''}`
                          })
                          setIsComposing(true)
                        }
                      }}
                      title="Forward"
                    >
                      <Forward className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={async () => {
                        const updatedEmail = { ...selectedEmail, folder: 'archive' as const }
                        setEmails(emails.map(e => e.id === selectedEmail.id ? updatedEmail : e))
                        setSelectedEmail(null)
                        toast.success('Email archived')
                      }}
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={async () => {
                        const updatedEmail = { ...selectedEmail, folder: 'trash' as const }
                        setEmails(emails.map(e => e.id === selectedEmail.id ? updatedEmail : e))
                        setSelectedEmail(null)
                        toast.success('Email moved to trash')
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-6">
                {/* Client Match Info */}
                {(() => {
                  const client = checkClientMatch(selectedEmail)
                  if (client) {
                    return (
                      <Alert className="mb-4 border-green-200 dark:border-green-800">
                        <User className="h-4 w-4" />
                        <AlertDescription>
                          <span className="font-medium">Matched Client:</span> {client.name}
                          {client.company && ` • ${client.company}`}
                        </AlertDescription>
                      </Alert>
                    )
                  }
                  return null
                })()}
                
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {selectedEmail.body || 'No content available'}
                </div>
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-3">Attachments</p>
                    {selectedEmail.attachments.map((attachment) => (
                      <div 
                        key={attachment.id}
                        className="flex items-center justify-between p-2 bg-background rounded border"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{attachment.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/30 backdrop-blur-md h-full flex items-center justify-center">
            <CardContent>
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Select an email to view</p>
              </div>
            </CardContent>
          </Card>
        )}
      </DraggableGrid>

      {/* Compose Dialog */}
      <Dialog open={isComposing} onOpenChange={setIsComposing}>
        <DialogContent className="max-w-[800px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                value={composeData.to}
                onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                placeholder="Recipients"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                placeholder="Subject"
              />
            </div>
            <div>
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                placeholder="Compose your email..."
                className="min-h-[200px]"
              />
            </div>
          </div>
          {sendStatus.type && (
            <Alert className={`${sendStatus.type === 'error' ? 'border-red-500/50 bg-red-500/10' : 'border-green-500/50 bg-green-500/10'}`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {sendStatus.message}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsComposing(false)
              setSendStatus({ type: null, message: '' })
            }}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateTicketDialog} onOpenChange={setShowCreateTicketDialog}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Create a support ticket from this email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label htmlFor="ticket-description">Description</Label>
              <Textarea
                id="ticket-description"
                value={ticketData.description}
                onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                placeholder="Ticket description"
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticket-priority">Priority</Label>
                <Select 
                  value={ticketData.priority} 
                  onValueChange={(value) => setTicketData({ ...ticketData, priority: value })}
                >
                  <SelectTrigger>
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
              <div>
                <Label htmlFor="ticket-category">Category</Label>
                <Select 
                  value={ticketData.category} 
                  onValueChange={(value) => setTicketData({ ...ticketData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="technical">Technical Support</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Client Match Section */}
            <div className="space-y-3">
              <Label>Client Information</Label>
              {matchedClient ? (
                <Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{matchedClient.name}</p>
                      <p className="text-sm text-muted-foreground">{matchedClient.email}</p>
                      {matchedClient.company && (
                        <p className="text-sm text-muted-foreground">{matchedClient.company}</p>
                      )}
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </Card>
              ) : (
                <Alert className="border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    No matching client found for {selectedEmail?.from.email}
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        setNewClientData({
                          name: selectedEmail?.from.name || '',
                          email: selectedEmail?.from.email || '',
                          phone: '',
                          company: selectedEmail?.from.organization || ''
                        })
                        setShowCreateClientDialog(true)
                      }}
                    >
                      Create New Client
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTicketDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicketFromEmail}>
              <Ticket className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog open={showCreateClientDialog} onOpenChange={setShowCreateClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client to your CRM
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Name</Label>
              <Input
                id="client-name"
                value={newClientData.name}
                onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={newClientData.email}
                onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="client-phone">Phone (Optional)</Label>
              <Input
                id="client-phone"
                value={newClientData.phone}
                onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="client-company">Company (Optional)</Label>
              <Input
                id="client-company"
                value={newClientData.company}
                onChange={(e) => setNewClientData({ ...newClientData, company: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateClientDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateClient}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}