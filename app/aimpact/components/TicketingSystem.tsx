'use client'

import { useState, useEffect } from 'react'
import { 
  Ticket, Clock, AlertCircle, CheckCircle2, XCircle, User, Calendar, 
  MessageSquare, Paperclip, Tag, Filter, Plus, Search, TrendingUp, 
  TrendingDown, BarChart, Zap, Brain, Star, ChevronRight, Hash,
  AlertTriangle, Info, ChevronDown, Timer, Activity, Sparkles
} from 'lucide-react'
import { DraggableGrid } from '@/components/ui/draggable-grid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'

interface TicketData {
  id: string
  number: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  customer: {
    name: string
    email: string
    company?: string
  }
  assignee?: {
    name: string
    avatar?: string
  }
  createdAt: Date
  updatedAt: Date
  lastResponse: Date
  sla: {
    responseTime: number // in minutes
    resolutionTime: number // in hours
  }
  tags: string[]
  messages: {
    id: string
    author: string
    content: string
    timestamp: Date
    internal?: boolean
  }[]
  attachments?: string[]
  aiInsights?: {
    sentiment: 'positive' | 'neutral' | 'negative'
    suggestedActions: string[]
    category: string
  }
}

export default function TicketingSystem() {
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null)
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [replyContent, setReplyContent] = useState('')
  const [internalNote, setInternalNote] = useState(false)

  const [tickets, setTickets] = useState<TicketData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    resolvedToday: 0,
    avgResponseTime: '0m',
    slaCompliance: 100
  })

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/aimpact/tickets')
        if (response.ok) {
          const data = await response.json()
          // Convert date strings to Date objects and map fields
          const ticketsWithDates = (data.tickets || []).map((ticket: any) => ({
            ...ticket,
            number: ticket.number || 'N/A',
            createdAt: new Date(ticket.createdAt),
            updatedAt: new Date(ticket.updatedAt),
            lastResponse: ticket.lastResponse ? new Date(ticket.lastResponse) : new Date(ticket.createdAt),
            messages: (ticket.messages || []).map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp || msg.createdAt || Date.now())
            })),
            // Ensure SLA object exists
            sla: ticket.sla || {
              responseTime: ticket.slaResponseTime || 30,
              resolutionTime: ticket.slaResolutionTime || 24
            },
            // Ensure customer object exists
            customer: ticket.customer || { name: 'Unknown', email: '', company: '' },
            // Ensure other arrays exist
            tags: ticket.tags || [],
            attachments: ticket.attachments || []
          }))
          setTickets(ticketsWithDates)
          setStats(data.stats || {
            totalTickets: 0,
            openTickets: 0,
            resolvedToday: 0,
            avgResponseTime: '0m',
            slaCompliance: 100
          })
        }
      } catch (error) {
        console.error('Error fetching tickets:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTickets()
  }, [])

  // Remove mock data - tickets will come from real database

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    avgResponseTime: stats.avgResponseTime,
    avgResolutionTime: '0h',
    satisfaction: 0
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'waiting': return <Timer className="h-4 w-4" />
      case 'resolved': return <CheckCircle2 className="h-4 w-4" />
      case 'closed': return <XCircle className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-500'
      case 'in_progress': return 'text-yellow-500'
      case 'waiting': return 'text-orange-500'
      case 'resolved': return 'text-green-500'
      case 'closed': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  const handleCreateTicket = () => {
    // Create new ticket logic
    setIsNewTicketOpen(false)
  }

  const handleReplyToTicket = () => {
    if (!selectedTicket || !replyContent) return
    
    const newMessage = {
      id: Date.now().toString(),
      author: 'Support Agent',
      content: replyContent,
      timestamp: new Date(),
      internal: internalNote
    }
    
    // Update ticket with new message
    setReplyContent('')
    setInternalNote(false)
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery === '' || 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.number.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            Support Tickets
          </h2>
          <p className="text-muted-foreground">Manage customer support requests with AI-powered insights</p>
        </div>
        <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
              <DialogDescription>
                Open a new support ticket for customer assistance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer-email">Customer Email</Label>
                  <Input id="customer-email" type="email" placeholder="customer@example.com" />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
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
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Brief description of the issue" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical Support</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="general">General Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Detailed description of the issue..."
                  className="min-h-[150px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewTicketOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket}>
                Create Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <DraggableGrid
        storageKey="ticketing-stats"
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-4"
        enabled={true}
      >
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{ticketStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tickets</p>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{ticketStats.open}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{ticketStats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{ticketStats.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{ticketStats.avgResponseTime}</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
              <Zap className="h-4 w-4 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{ticketStats.avgResolutionTime}</p>
                <p className="text-xs text-muted-foreground">Avg Resolution</p>
              </div>
              <Timer className="h-4 w-4 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{ticketStats.satisfaction}/5</p>
                <p className="text-xs text-muted-foreground">Satisfaction</p>
              </div>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </DraggableGrid>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="col-span-2">
          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tickets</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64 bg-background/20 backdrop-blur-md"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  <AnimatePresence>
                    {filteredTickets.map((ticket, index) => (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all ${
                          selectedTicket?.id === ticket.id ? 'border-primary bg-accent' : ''
                        }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-muted-foreground">
                                {ticket.number}
                              </span>
                              <Badge variant={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <span className={`flex items-center gap-1 text-sm ${getStatusColor(ticket.status)}`}>
                                {getStatusIcon(ticket.status)}
                                {ticket.status.replace('_', ' ')}
                              </span>
                            </div>
                            <h4 className="font-medium mb-1">{ticket.subject}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {ticket.customer?.name || ticket.contactId || 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {ticket.createdAt.toLocaleDateString()}
                              </span>
                              {ticket.assignee && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {typeof ticket.assignee === 'string' ? ticket.assignee : ticket.assignee.name}
                                </span>
                              )}
                            </div>
                            {ticket.aiInsights && (
                              <div className="flex items-center gap-2 mt-2">
                                <Brain className="h-3 w-3 text-purple-500" />
                                <span className="text-xs text-purple-500">
                                  AI: {ticket.aiInsights.category} • {ticket.aiInsights.sentiment} sentiment
                                </span>
                              </div>
                            )}
                          </div>
                          {ticket.messages.length > 1 && (
                            <Badge variant="secondary" className="ml-2">
                              {ticket.messages.length}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details */}
        <div>
          {selectedTicket ? (
            <Card className="bg-card/30 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{selectedTicket.number}</CardTitle>
                      <Badge variant={getPriorityColor(selectedTicket.priority)}>
                        {selectedTicket.priority}
                      </Badge>
                    </div>
                    <p className="font-medium">{selectedTicket.subject}</p>
                  </div>
                  <Select 
                    value={selectedTicket.status} 
                    onValueChange={(value) => {
                      // Update ticket status
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="messages" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="insights">AI Insights</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="messages" className="space-y-4">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {(selectedTicket.messages || []).map((message) => (
                          <div key={message.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {(message.author || 'U').split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{message.author || 'Unknown'}</span>
                              <span className="text-xs text-muted-foreground">
                                {message.timestamp ? new Date(message.timestamp).toLocaleString() : 'Unknown time'}
                              </span>
                              {message.internal && (
                                <Badge variant="outline" className="text-xs">Internal</Badge>
                              )}
                            </div>
                            <p className="text-sm pl-8">{message.content}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="internal-note" className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="internal-note"
                            checked={internalNote}
                            onChange={(e) => setInternalNote(e.target.checked)}
                            className="rounded"
                          />
                          Internal Note
                        </Label>
                      </div>
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-between">
                        <Button variant="outline" size="sm">
                          <Paperclip className="h-4 w-4 mr-2" />
                          Attach
                        </Button>
                        <Button onClick={handleReplyToTicket}>
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="details" className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">Customer</Label>
                        <p className="font-medium">{selectedTicket.customer?.name || 'Unknown Customer'}</p>
                        <p className="text-sm text-muted-foreground">{selectedTicket.customer?.email || 'No email'}</p>
                        {selectedTicket.customer?.company && (
                          <p className="text-sm text-muted-foreground">{selectedTicket.customer.company}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">Assignee</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedTicket.assignee?.name || "Unassigned"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sarah">Sarah Chen</SelectItem>
                            <SelectItem value="alex">Alex Johnson</SelectItem>
                            <SelectItem value="mike">Mike Davis</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">Category</Label>
                        <p>{selectedTicket.category}</p>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(selectedTicket.tags || []).map((tag) => (
                            <Badge key={tag} variant="secondary">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">SLA</Label>
                        <div className="space-y-2 mt-2">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Response Time</span>
                              <span>{selectedTicket.sla.responseTime} min</span>
                            </div>
                            <Progress value={75} className="h-2 mt-1" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Resolution Time</span>
                              <span>{selectedTicket.sla.resolutionTime} hrs</span>
                            </div>
                            <Progress value={40} className="h-2 mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="insights" className="space-y-4">
                    {selectedTicket.aiInsights && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-purple-500" />
                            <span className="font-medium text-purple-700 dark:text-purple-300">
                              AI Analysis
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Category</Label>
                              <p className="text-sm">{selectedTicket.aiInsights?.category || 'Uncategorized'}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Sentiment</Label>
                              <Badge variant={
                                selectedTicket.aiInsights?.sentiment === 'positive' ? 'default' :
                                selectedTicket.aiInsights?.sentiment === 'negative' ? 'destructive' :
                                'secondary'
                              }>
                                {selectedTicket.aiInsights?.sentiment || 'neutral'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4" />
                            Suggested Actions
                          </Label>
                          <div className="space-y-2">
                            {(selectedTicket.aiInsights?.suggestedActions || []).map((action, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <p className="text-sm">{action}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Brain className="h-4 w-4 mr-2" />
                            Generate Response
                          </Button>
                          <Button size="sm" variant="outline">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Get More Insights
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/30 backdrop-blur-md h-full flex items-center justify-center">
              <CardContent>
                <p className="text-muted-foreground">Select a ticket to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}