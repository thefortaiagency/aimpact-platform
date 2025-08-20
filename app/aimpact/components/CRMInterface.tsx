'use client'

import { useState, useEffect } from 'react'
import { 
  Users, Building2, Search, Filter, Plus, ChevronRight, Calendar,
  Mail, Phone, Globe, MapPin, DollarSign, TrendingUp, Target,
  FileText, Clock, AlertCircle, CheckCircle2, Star, MoreVertical,
  Activity, Briefcase, Award, Tag, UserPlus, Settings2,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  Zap, Brain, Sparkles, Database, GitBranch, Link2, MessageSquare,
  Heart, Smile, Frown, Meh, ThumbsUp, ThumbsDown, TrendingDown,
  MessageCircle, Timer, Shield, Crown, Zap as Lightning, RefreshCw,
  Edit, Trash2
} from 'lucide-react'
import { DraggableGrid } from '@/components/ui/draggable-grid'
import ClientDetailModal from './ClientDetailModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { motion } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
// import { validateContactsResponse } from '@/lib/api-validation' // Not needed anymore
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import FloatingPhone from './FloatingPhone'
import FloatingSMSRedesigned from './FloatingSMSRedesigned'
import FloatingEmail from './FloatingEmail'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position?: string
  organizationId: string
  isPrimary?: boolean
  lastContacted?: Date
  leadScore?: number
  lifecycle?: 'lead' | 'marketing-qualified' | 'sales-qualified' | 'opportunity' | 'customer' | 'evangelist'
  tags?: string[]
  // Satisfaction & Sentiment
  satisfactionScore?: number // 0-100
  sentimentScore?: number // -100 to 100
  communicationFrequency?: number // messages per week
  responseTime?: number // average in hours
  preferredChannel?: 'email' | 'phone' | 'sms' | 'video'
  lastSentiment?: 'positive' | 'neutral' | 'negative'
}

interface Organization {
  id: string
  name: string
  domain?: string
  industry?: string
  size?: string
  revenue?: string
  website?: string
  phone?: string
  address?: string
  description?: string
  accountValue?: number
  healthScore?: number
  renewalDate?: Date
  createdAt: Date
  tags?: string[]
  // Satisfaction & Communication Metrics
  overallSatisfaction?: number // 0-100
  communicationHealth?: number // 0-100
  avgResponseTime?: number // hours
  totalInteractions?: number
  sentimentTrend?: 'improving' | 'stable' | 'declining'
  riskLevel?: 'low' | 'medium' | 'high'
  lastReviewDate?: Date
  // Financial
  lifetimeValue?: number
  avgOrderValue?: number
  paymentStatus?: 'current' | 'overdue' | 'at-risk'
}

interface Deal {
  id: string
  name: string
  organizationId: string
  contactId?: string
  value: number
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
  probability: number
  expectedCloseDate: Date
  owner: string
  createdAt: Date
}

interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note'
  subject: string
  description?: string
  organizationId?: string
  contactId?: string
  dealId?: string
  createdAt: Date
  dueDate?: Date
  completed?: boolean
}

interface SMSConversation {
  phone_number: string
  contact_name?: string
  last_message?: string
  last_message_time?: string
  unread_count: number
}

export default function CRMInterface() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [smsConversations, setSmsConversations] = useState<SMSConversation[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeView, setActiveView] = useState<'organizations' | 'contacts' | 'deals' | 'activities'>('organizations')
  const [showNewOrgDialog, setShowNewOrgDialog] = useState(false)
  const [showNewContactDialog, setShowNewContactDialog] = useState(false)
  const [showNewDealDialog, setShowNewDealDialog] = useState(false)
  const [showClientDetailModal, setShowClientDetailModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Floating window states
  const [showFloatingPhone, setShowFloatingPhone] = useState(false)
  const [showFloatingSMS, setShowFloatingSMS] = useState(false)
  const [showFloatingEmail, setShowFloatingEmail] = useState(false)
  const [floatingPhoneData, setFloatingPhoneData] = useState<{phoneNumber?: string, contactName?: string}>({})
  const [floatingSMSData, setFloatingSMSData] = useState<{phoneNumber?: string, contactName?: string}>({})
  const [floatingEmailData, setFloatingEmailData] = useState<{email?: string, contactName?: string}>({})
  
  // Contact edit/delete states
  const [showEditContactDialog, setShowEditContactDialog] = useState(false)
  const [showDeleteContactAlert, setShowDeleteContactAlert] = useState(false)
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)
  
  // Communication history states
  const [showCommunicationHistory, setShowCommunicationHistory] = useState(false)
  const [selectedContactForHistory, setSelectedContactForHistory] = useState<Contact | null>(null)
  const [communicationHistory, setCommunicationHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    organizationId: '',
    notes: ''
  })

  // Form states
  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    domain: '',
    industry: '',
    size: '',
    website: '',
    phone: '',
    email: '',
    description: '',
  })

  const [newContactForm, setNewContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    organizationId: '',
    isPrimary: false,
  })

  const [newDealForm, setNewDealForm] = useState({
    name: '',
    organizationId: '',
    contactId: '',
    value: 0,
    stage: 'prospecting' as Deal['stage'],
    probability: 10,
    expectedCloseDate: '',
    description: '',
  })

  // Pipeline stages for visual representation
  const pipelineStages = [
    { name: 'Prospecting', value: 0, color: 'bg-gray-500' },
    { name: 'Qualification', value: 0, color: 'bg-blue-500' },
    { name: 'Proposal', value: 0, color: 'bg-yellow-500' },
    { name: 'Negotiation', value: 0, color: 'bg-purple-500' },
    { name: 'Closed Won', value: 0, color: 'bg-green-500' },
  ]

  // Calculate satisfaction and communication metrics
  const metrics = {
    // Satisfaction Metrics
    avgSatisfaction: organizations.length > 0 
      ? organizations.reduce((sum, org) => sum + (org.overallSatisfaction || 0), 0) / organizations.length 
      : 0,
    happyClients: organizations.filter(org => (org.overallSatisfaction || 0) >= 80).length,
    atRiskClients: organizations.filter(org => org.riskLevel === 'high' || (org.overallSatisfaction || 0) < 60).length,
    
    // Communication Metrics
    avgResponseTime: organizations.length > 0
      ? organizations.reduce((sum, org) => sum + (org.avgResponseTime || 0), 0) / organizations.length
      : 0,
    communicationHealth: organizations.length > 0
      ? organizations.reduce((sum, org) => sum + (org.communicationHealth || 0), 0) / organizations.length
      : 0,
    positivesentiment: (contacts || []).filter(c => c?.lastSentiment === 'positive').length,
    
    // Financial Metrics
    totalRevenue: deals.filter(d => d.stage === 'closed-won').reduce((sum, d) => sum + d.value, 0),
    lifetimeValue: organizations.reduce((sum, org) => sum + (org.lifetimeValue || 0), 0),
    avgOrderValue: organizations.length > 0
      ? organizations.reduce((sum, org) => sum + (org.avgOrderValue || 0), 0) / organizations.length
      : 0,
  }

  useEffect(() => {
    fetchOrganizations()
    fetchContacts()
    fetchDeals()
    fetchActivities()
    fetchSMSConversations()
  }, [])

  // Set up auto-refresh every 3 seconds when on contacts view for SMS
  useEffect(() => {
    if (activeView === 'contacts') {
      const interval = setInterval(() => {
        fetchContacts()
        fetchSMSConversations()
      }, 3000) // Faster refresh for better responsiveness
      return () => clearInterval(interval)
    }
  }, [activeView])

  // Also refresh when window gains focus (user comes back to app)
  useEffect(() => {
    const handleFocus = () => {
      if (activeView === 'contacts') {
        fetchContacts()
        fetchSMSConversations()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [activeView])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/aimpact/organizations?includeMetrics=true')
      const data = await response.json()
      if (data.organizations) {
        setOrganizations(data.organizations)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      const data = await response.json()
      
      if (data.success && data.contacts) {
        // Transform the data to match the Contact interface
        const transformedContacts = data.contacts.map((contact: any) => ({
          id: contact.id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          position: contact.position,
          organizationId: contact.organization_id,
          isPrimary: contact.is_primary,
          lastContacted: contact.last_contacted ? new Date(contact.last_contacted) : undefined,
          leadScore: contact.lead_score || 0,
          lifecycle: contact.lifecycle || 'lead',
          tags: contact.tags || [],
          satisfactionScore: contact.satisfaction_score || 0,
          sentimentScore: contact.sentiment_score || 0,
          communicationFrequency: contact.communication_frequency || 0,
          responseTime: contact.response_time || 0,
          preferredChannel: contact.preferred_channel || 'email',
          lastSentiment: contact.last_sentiment || 'neutral'
        }))
        setContacts(transformedContacts)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      setContacts([])
    }
  }

  const fetchDeals = async () => {
    try {
      const response = await fetch('/api/aimpact/deals?includePipeline=true')
      const data = await response.json()
      if (data.deals) {
        setDeals(data.deals)
        // Update pipeline stages with actual data
        if (data.pipeline && data.pipeline.stages) {
          pipelineStages.forEach(stage => {
            const pipelineStage = data.pipeline.stages.find((s: any) => 
              s.name.toLowerCase().replace('-', ' ') === stage.name.toLowerCase()
            )
            if (pipelineStage) {
              stage.value = pipelineStage.value / 1000 // Convert to thousands
            }
          })
        }
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
    }
  }

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/aimpact/activities?includeRelated=true')
      const data = await response.json()
      if (data.activities) {
        setActivities(data.activities)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const fetchSMSConversations = async () => {
    try {
      const response = await fetch('/api/sms/conversations')
      const data = await response.json()
      
      if (data.success && data.conversations) {
        setSmsConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error fetching SMS conversations:', error)
    }
  }

  const getLifecycleBadge = (lifecycle?: string) => {
    const variants: Record<string, any> = {
      'lead': { color: 'bg-gray-500', icon: UserPlus },
      'marketing-qualified': { color: 'bg-blue-500', icon: Target },
      'sales-qualified': { color: 'bg-yellow-500', icon: Briefcase },
      'opportunity': { color: 'bg-purple-500', icon: TrendingUp },
      'customer': { color: 'bg-green-500', icon: CheckCircle2 },
      'evangelist': { color: 'bg-pink-500', icon: Star },
    }
    
    const config = variants[lifecycle || 'lead']
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        <Icon className="h-3 w-3" />
        {lifecycle || 'lead'}
      </Badge>
    )
  }

  const getStageBadge = (stage: string) => {
    const colors: Record<string, string> = {
      'prospecting': 'bg-gray-500',
      'qualification': 'bg-blue-500',
      'proposal': 'bg-yellow-500',
      'negotiation': 'bg-purple-500',
      'closed-won': 'bg-green-500',
      'closed-lost': 'bg-red-500',
    }
    
    return (
      <Badge className={`${colors[stage]} text-white`}>
        {stage.replace('-', ' ')}
      </Badge>
    )
  }

  const getSMSInfo = (phone?: string): SMSConversation | undefined => {
    if (!phone) return undefined
    // Clean phone for comparison
    const cleanPhone = phone.replace(/\D/g, '')
    return smsConversations.find(conv => {
      const convPhone = conv.phone_number.replace(/\D/g, '')
      return convPhone === cleanPhone || convPhone === `1${cleanPhone}` || `1${convPhone}` === cleanPhone
    })
  }

  const handleEditContact = (contact: Contact) => {
    setContactToEdit(contact)
    setContactForm({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
      organizationId: contact.organizationId || '',
      notes: (contact as any).notes || ''
    })
    setShowEditContactDialog(true)
  }

  const handleUpdateContact = async () => {
    if (!contactToEdit) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/contacts/${contactToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: contactForm.firstName,
          last_name: contactForm.lastName,
          email: contactForm.email,
          phone: contactForm.phone,
          position: contactForm.position,
          organization_id: contactForm.organizationId || null,
          notes: contactForm.notes
        })
      })
      
      if (response.ok) {
        toast.success('Contact updated successfully')
        setShowEditContactDialog(false)
        setContactToEdit(null)
        fetchContacts()
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Failed to update contact')
      }
    } catch (error) {
      console.error('Error updating contact:', error)
      toast.error('Failed to update contact')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteContact = async () => {
    if (!contactToDelete) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Contact deleted successfully')
        setShowDeleteContactAlert(false)
        setContactToDelete(null)
        fetchContacts()
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Failed to delete contact')
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.error('Failed to delete contact')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCommunicationHistory = async (contact: Contact) => {
    setLoadingHistory(true)
    try {
      // Fetch all communications for this contact
      const params = new URLSearchParams()
      if (contact.email) params.append('email', contact.email)
      if (contact.phone) params.append('phone', contact.phone)
      params.append('contact_id', contact.id)
      
      const response = await fetch(`/api/communications/history?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        // Sort by date, most recent first
        const sortedHistory = data.communications.sort((a: any, b: any) => 
          new Date(b.communicated_at || b.created_at).getTime() - 
          new Date(a.communicated_at || a.created_at).getTime()
        )
        setCommunicationHistory(sortedHistory)
      } else {
        setCommunicationHistory([])
      }
    } catch (error) {
      console.error('Error fetching communication history:', error)
      setCommunicationHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const openCommunicationHistory = async (contact: Contact) => {
    setSelectedContactForHistory(contact)
    setShowCommunicationHistory(true)
    await fetchCommunicationHistory(contact)
  }

  const getContactActivity = (contact: Contact) => {
    const smsInfo = getSMSInfo(contact.phone)
    const hasEmail = contact.email && !contact.email.includes('@sms.local')
    const hasPhone = contact.phone
    // SMS activity exists if we have an SMS conversation (even with 0 unread)
    const hasSMS = smsInfo !== undefined
    
    const activities = []
    if (hasPhone) activities.push({ type: 'phone', icon: Phone, color: 'text-green-600' })
    if (hasEmail) activities.push({ type: 'email', icon: Mail, color: 'text-blue-600' })
    if (hasSMS) activities.push({ type: 'sms', icon: MessageSquare, color: 'text-purple-600', unread: smsInfo.unread_count })
    
    console.log(`Activity for ${contact.firstName} ${contact.lastName}:`, {
      phone: contact.phone,
      hasPhone,
      hasEmail,
      hasSMS,
      smsInfo,
      activities: activities.length
    })
    
    return activities
  }

  const handleCreateOrganization = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/aimpact/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrgForm),
      })
      
      if (response.ok) {
        const newOrg = await response.json()
        setOrganizations([newOrg, ...organizations])
        setShowNewOrgDialog(false)
        setNewOrgForm({
          name: '',
          domain: '',
          industry: '',
          size: '',
          website: '',
          phone: '',
          email: '',
          description: '',
        })
      }
    } catch (error) {
      console.error('Error creating organization:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateContact = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/aimpact/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContactForm),
      })
      
      if (response.ok) {
        const newContact = await response.json()
        setContacts([newContact, ...contacts])
        setShowNewContactDialog(false)
        setNewContactForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          position: '',
          organizationId: '',
          isPrimary: false,
        })
      }
    } catch (error) {
      console.error('Error creating contact:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDeal = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/aimpact/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDealForm),
      })
      
      if (response.ok) {
        const newDeal = await response.json()
        setDeals([newDeal, ...deals])
        setShowNewDealDialog(false)
        setNewDealForm({
          name: '',
          organizationId: '',
          contactId: '',
          value: 0,
          stage: 'prospecting',
          probability: 10,
          expectedCloseDate: '',
          description: '',
        })
      }
    } catch (error) {
      console.error('Error creating deal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 relative z-10">
      {/* Header with Satisfaction & Communication Metrics */}
      <div className="space-y-4">
        {/* Primary Satisfaction Metrics */}
        <DraggableGrid
          storageKey="crm-satisfaction-metrics"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-4"
          enabled={true}
        >
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Client Satisfaction</p>
                  <p className="text-lg lg:text-2xl font-bold text-green-600">{metrics.avgSatisfaction.toFixed(0)}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Smile className="h-3 w-3 text-green-500" />
                    <p className="text-xs text-muted-foreground">Average score</p>
                  </div>
                </div>
                <Heart className="h-6 w-6 lg:h-8 lg:w-8 text-green-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Happy Clients</p>
                  <p className="text-lg lg:text-2xl font-bold text-blue-600">{metrics.happyClients}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ThumbsUp className="h-3 w-3 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Score ≥80%</p>
                  </div>
                </div>
                <Crown className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">At Risk</p>
                  <p className="text-lg lg:text-2xl font-bold text-red-600">{metrics.atRiskClients}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <p className="text-xs text-muted-foreground">Need attention</p>
                  </div>
                </div>
                <Shield className="h-6 w-6 lg:h-8 lg:w-8 text-red-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Response Time</p>
                  <p className="text-lg lg:text-2xl font-bold text-purple-600">{metrics.avgResponseTime.toFixed(1)}h</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Timer className="h-3 w-3 text-purple-500" />
                    <p className="text-xs text-muted-foreground">Average</p>
                  </div>
                </div>
                <MessageCircle className="h-6 w-6 lg:h-8 lg:w-8 text-purple-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Communication Health</p>
                  <p className="text-lg lg:text-2xl font-bold text-amber-600">{metrics.communicationHealth.toFixed(0)}%</p>
                  <Progress value={metrics.communicationHealth} className="h-1 mt-2" />
                </div>
                <Activity className="h-6 w-6 lg:h-8 lg:w-8 text-amber-500/30" />
              </div>
            </CardContent>
          </Card>
        </DraggableGrid>

        {/* Financial Metrics Row */}
        <DraggableGrid
          storageKey="crm-financial-metrics"
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-4"
          enabled={true}
        >
          <Card className="bg-card/30 backdrop-blur-md">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Lifetime Value</p>
                  <p className="text-lg lg:text-2xl font-bold">${(metrics.lifetimeValue / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground mt-1">All clients</p>
                </div>
                <DollarSign className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 backdrop-blur-md">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Revenue YTD</p>
                  <p className="text-lg lg:text-2xl font-bold">${(metrics.totalRevenue / 1000).toFixed(0)}k</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <p className="text-xs text-green-500">+12%</p>
                  </div>
                </div>
                <BarChart3 className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 backdrop-blur-md">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-lg lg:text-2xl font-bold">${(metrics.avgOrderValue / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
                </div>
                <PieChart className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
        </DraggableGrid>
      </div>

      {/* AI Sentiment & Satisfaction Insights */}
      <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">AI Sentiment Analysis</p>
                <p className="text-sm text-muted-foreground">
                  {organizations.length > 0 ? 
                    `Analyzing ${(contacts || []).filter(c => c?.lastSentiment === 'positive').length} positive sentiments across ${organizations.length} clients` : 
                    'AI will analyze client sentiment from emails, calls, and messages'
                  }
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              {/* Sentiment Indicators */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Smile className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">{metrics.positivesentiment}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Meh className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">{(contacts || []).filter(c => c?.lastSentiment === 'neutral').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Frown className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">{(contacts || []).filter(c => c?.lastSentiment === 'negative').length}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">View Insights</span>
                <span className="sm:hidden">Insights</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Navigation Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="relative z-50">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4 relative z-50">
          <TabsList className="w-full lg:w-auto overflow-x-auto relative z-50">
            <TabsTrigger value="organizations" className="whitespace-nowrap">
              <Building2 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Organizations</span>
              <span className="sm:hidden">Orgs</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="whitespace-nowrap">
              <Users className="h-4 w-4 mr-1 sm:mr-2" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="deals" className="whitespace-nowrap">
              <Briefcase className="h-4 w-4 mr-1 sm:mr-2" />
              Deals
            </TabsTrigger>
            <TabsTrigger value="activities" className="whitespace-nowrap">
              <Activity className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Activities</span>
              <span className="sm:hidden">Activity</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setIsLoading(true)
                fetchOrganizations()
                fetchContacts()
                fetchSMSConversations()
                setTimeout(() => setIsLoading(false), 1000)
              }}
              disabled={isLoading}
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-[300px] z-20">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search CRM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full relative z-20"
              />
            </div>
            <Button variant="outline" size="icon" className="hidden sm:flex">
              <Filter className="h-4 w-4" />
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                if (activeView === 'organizations') setShowNewOrgDialog(true)
                else if (activeView === 'contacts') setShowNewContactDialog(true)
                else if (activeView === 'deals') setShowNewDealDialog(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add New</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Organizations View */}
        <TabsContent value="organizations" className="space-y-6">
          {/* Pipeline View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {pipelineStages.map((stage, i) => (
                  <div key={stage.name} className="flex-1 min-w-[100px]">
                    <div className="text-center mb-2">
                      <p className="text-xs sm:text-sm font-medium">{stage.name}</p>
                      <p className="text-lg sm:text-2xl font-bold">${stage.value}k</p>
                    </div>
                    <div className={`h-2 ${stage.color} rounded-full`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Organizations Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Organizations</CardTitle>
              <CardDescription>Manage your accounts and track engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Satisfaction</TableHead>
                      <TableHead>Communication</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No organizations yet. Add your first organization to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (organizations || []).map((org) => {
                        if (!org) return null;
                        return (
                          <TableRow key={org.id} className="cursor-pointer" onClick={() => {
                            setSelectedOrg(org)
                            setShowClientDetailModal(true)
                          }}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>{org.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{org.name}</p>
                                  {org.industry && (
                                    <p className="text-sm text-muted-foreground">{org.industry}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(org.overallSatisfaction || 0) >= 80 ? (
                                <Smile className="h-4 w-4 text-green-500" />
                              ) : (org.overallSatisfaction || 0) >= 60 ? (
                                <Meh className="h-4 w-4 text-amber-500" />
                              ) : (
                                <Frown className="h-4 w-4 text-red-500" />
                              )}
                              <span className="font-medium">{org.overallSatisfaction || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Timer className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{org.avgResponseTime || 0}h avg</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {org.totalInteractions || 0} interactions
                            </div>
                          </TableCell>
                          <TableCell>
                            {org.sentimentTrend === 'improving' ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Improving
                              </Badge>
                            ) : org.sentimentTrend === 'declining' ? (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Declining
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                                Stable
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">${(org.lifetimeValue || 0) / 1000}k</p>
                              <p className="text-xs text-muted-foreground">
                                ${(org.avgOrderValue || 0) / 1000}k avg
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {org.riskLevel === 'high' ? (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                High Risk
                              </Badge>
                            ) : org.riskLevel === 'medium' ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                Medium
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Low</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Call
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Note: org doesn't have email directly, would need to find primary contact
                                    // For now, disable email for organizations
                                    // TODO: Find primary contact for organization
                                  }}
                                  disabled={true}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Email
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Schedule Meeting
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedOrg(org)
                                  setShowClientDetailModal(true)
                                }}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts View */}
        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Contacts</CardTitle>
                  <CardDescription>Manage relationships and track engagement</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchContacts()
                    fetchSMSConversations()
                    toast.success('Contacts refreshed')
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Lifecycle</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No contacts yet. Add your first contact to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (contacts || []).map((contact) => {
                        if (!contact) return null;
                        return (
                          <TableRow key={contact.id} className="cursor-pointer" onClick={() => setSelectedContact(contact)}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {(contact.firstName?.[0] || 'C').toUpperCase()}{(contact.lastName?.[0] || '').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {contact.firstName || ''} {contact.lastName || ''}
                                    {!contact.firstName && !contact.lastName && (contact.email || 'Unknown Contact')}
                                  </p>
                                  {contact.position && (
                                    <p className="text-sm text-muted-foreground">{contact.position}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <span>{contact.email}</span>
                              {contact.email && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Send Email"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFloatingEmailData({
                                      email: contact.email,
                                      contactName: `${contact.firstName} ${contact.lastName}`
                                    });
                                    setShowFloatingEmail(true);
                                  }}
                                >
                                  <Mail className="h-3 w-3 text-purple-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <span>{contact.phone || '-'}</span>
                              {contact.phone && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Call"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFloatingPhoneData({
                                        phoneNumber: contact.phone,
                                        contactName: `${contact.firstName} ${contact.lastName}`
                                      });
                                      setShowFloatingPhone(true);
                                    }}
                                  >
                                    <Phone className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Send SMS"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFloatingSMSData({
                                        phoneNumber: contact.phone,
                                        contactName: `${contact.firstName} ${contact.lastName}`
                                      });
                                      setShowFloatingSMS(true);
                                    }}
                                  >
                                    <MessageCircle className="h-3 w-3 text-blue-600" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {organizations.find(o => o.id === contact.organizationId)?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCommunicationHistory(contact);
                              }}
                              title="View communication history"
                            >
                              {(() => {
                                const activities = getContactActivity(contact)
                                if (activities.length === 0) {
                                  return <span className="text-sm text-muted-foreground">No activity</span>
                                }
                                
                                return activities.map((activity, idx) => (
                                  <div key={activity.type} className="relative">
                                    <activity.icon className={`h-4 w-4 ${activity.color}`} />
                                    {activity.unread && activity.unread > 0 && (
                                      <Badge 
                                        variant="default" 
                                        className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs bg-red-500"
                                      >
                                        {activity.unread}
                                      </Badge>
                                    )}
                                  </div>
                                ))
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>{getLifecycleBadge(contact.lifecycle)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {contact.lastContacted ? new Date(contact.lastContacted).toLocaleDateString() : 'Never'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFloatingPhoneData({
                                      phoneNumber: contact.phone,
                                      contactName: `${contact.firstName} ${contact.lastName}`
                                    });
                                    setShowFloatingPhone(true);
                                  }}
                                  disabled={!contact.phone}
                                >
                                  <Phone className="h-4 w-4 mr-2" />
                                  Call
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFloatingEmailData({
                                      email: contact.email,
                                      contactName: `${contact.firstName} ${contact.lastName}`
                                    });
                                    setShowFloatingEmail(true);
                                  }}
                                  disabled={!contact.email}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Email
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFloatingSMSData({
                                      phoneNumber: contact.phone,
                                      contactName: `${contact.firstName} ${contact.lastName}`
                                    });
                                    setShowFloatingSMS(true);
                                  }}
                                  disabled={!contact.phone}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  SMS
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditContact(contact);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Contact
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContactToDelete(contact);
                                    setShowDeleteContactAlert(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Contact
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Convert to Opportunity
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals View */}
        <TabsContent value="deals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Deals</CardTitle>
              <CardDescription>Track opportunities through your sales pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal Name</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Expected Close</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No deals yet. Create your first deal to start tracking opportunities.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (deals || []).map((deal) => {
                        if (!deal) return null;
                        return (
                          <TableRow key={deal.id} className="cursor-pointer">
                            <TableCell>
                              <p className="font-medium">{deal.name}</p>
                            </TableCell>
                          <TableCell>
                            {organizations.find(o => o.id === deal.organizationId)?.name || '-'}
                          </TableCell>
                          <TableCell className="font-medium">${(deal.value / 1000).toFixed(0)}k</TableCell>
                          <TableCell>{getStageBadge(deal.stage)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={deal.probability} className="w-[60px] h-2" />
                              <span className="text-sm">{deal.probability}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(deal.expectedCloseDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{deal.owner}</Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  Update Stage
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Add Note
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Schedule Follow-up
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-green-600">
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Mark as Won
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities View */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Track all interactions and tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activities yet. Activities will appear here as you interact with contacts.
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-4 border rounded-lg">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          activity.type === 'call' ? 'bg-blue-100' :
                          activity.type === 'email' ? 'bg-green-100' :
                          activity.type === 'meeting' ? 'bg-purple-100' :
                          'bg-gray-100'
                        }`}>
                          {activity.type === 'call' && <Phone className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'email' && <Mail className="h-4 w-4 text-green-600" />}
                          {activity.type === 'meeting' && <Calendar className="h-4 w-4 text-purple-600" />}
                          {activity.type === 'task' && <CheckCircle2 className="h-4 w-4 text-gray-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{activity.subject}</p>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{new Date(activity.createdAt).toLocaleString()}</span>
                            {activity.completed && (
                              <Badge variant="outline" className="text-xs">Completed</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Organization Dialog */}
      <Dialog open={showNewOrgDialog} onOpenChange={setShowNewOrgDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization account in your CRM
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input 
                  id="org-name" 
                  placeholder="Acme Corporation"
                  value={newOrgForm.name}
                  onChange={(e) => setNewOrgForm({...newOrgForm, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="org-domain">Domain</Label>
                <Input 
                  id="org-domain" 
                  placeholder="acme.com"
                  value={newOrgForm.domain}
                  onChange={(e) => setNewOrgForm({...newOrgForm, domain: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="org-industry">Industry</Label>
                <Select>
                  <SelectTrigger id="org-industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="org-size">Company Size</Label>
                <Select>
                  <SelectTrigger id="org-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-1000">201-1000 employees</SelectItem>
                    <SelectItem value="1000+">1000+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="org-description">Description</Label>
              <Textarea id="org-description" placeholder="Brief description of the organization..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewOrgDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateOrganization} disabled={isLoading || !newOrgForm.name}>
              {isLoading ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Detail Modal */}
      <ClientDetailModal 
        organization={selectedOrg}
        isOpen={showClientDetailModal}
        onClose={() => setShowClientDetailModal(false)}
      />
      
      {/* Floating Phone Window */}
      <FloatingPhone
        isOpen={showFloatingPhone}
        onClose={() => setShowFloatingPhone(false)}
        initialPhoneNumber={floatingPhoneData.phoneNumber}
        contactName={floatingPhoneData.contactName}
      />
      
      {/* Floating SMS Window */}
      <FloatingSMSRedesigned
        isOpen={showFloatingSMS}
        onClose={() => setShowFloatingSMS(false)}
        initialPhoneNumber={floatingSMSData.phoneNumber}
        contactName={floatingSMSData.contactName}
      />
      
      {/* Floating Email Window */}
      <FloatingEmail
        isOpen={showFloatingEmail}
        onClose={() => setShowFloatingEmail(false)}
        initialTo={floatingEmailData.email}
        contactName={floatingEmailData.contactName}
      />
      
      {/* Edit Contact Dialog */}
      <Dialog open={showEditContactDialog} onOpenChange={setShowEditContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input
                  id="edit_first_name"
                  value={contactForm.firstName}
                  onChange={(e) => setContactForm({...contactForm, firstName: e.target.value})}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input
                  id="edit_last_name"
                  value={contactForm.lastName}
                  onChange={(e) => setContactForm({...contactForm, lastName: e.target.value})}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={contactForm.phone}
                onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="edit_position">Position</Label>
              <Input
                id="edit_position"
                value={contactForm.position}
                onChange={(e) => setContactForm({...contactForm, position: e.target.value})}
                placeholder="CEO"
              />
            </div>
            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={contactForm.notes}
                onChange={(e) => setContactForm({...contactForm, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditContactDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContact} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Alert */}
      <AlertDialog open={showDeleteContactAlert} onOpenChange={setShowDeleteContactAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contactToDelete?.firstName} {contactToDelete?.lastName}? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Communication History Dialog */}
      <Dialog open={showCommunicationHistory} onOpenChange={setShowCommunicationHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Communication History - {selectedContactForHistory?.firstName} {selectedContactForHistory?.lastName}
            </DialogTitle>
            <DialogDescription>
              Complete communication timeline including calls, emails, and messages
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading communication history...</div>
              </div>
            ) : communicationHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                <p>No communication history found</p>
                <p className="text-sm">Start communicating to see the timeline here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {communicationHistory.map((comm, idx) => (
                  <div key={`${comm.type}-${comm.id}-${idx}`} className="flex gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {comm.type === 'email' && <Mail className="h-5 w-5 text-blue-600" />}
                      {comm.type === 'sms' && <MessageSquare className="h-5 w-5 text-purple-600" />}
                      {comm.type === 'call' && <Phone className="h-5 w-5 text-green-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">
                          {comm.type} {comm.direction ? `(${comm.direction})` : ''}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(comm.communicated_at || comm.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      
                      {comm.type === 'email' && (
                        <div>
                          <p className="font-medium text-sm mb-1">{comm.subject || 'No Subject'}</p>
                          <p className="text-sm text-muted-foreground">
                            {comm.direction === 'inbound' ? 'From:' : 'To:'} {comm.from_address || comm.to_address}
                          </p>
                          {comm.content && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm max-h-32 overflow-y-auto">
                              {comm.content.length > 200 ? `${comm.content.substring(0, 200)}...` : comm.content}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {comm.type === 'sms' && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {comm.direction === 'inbound' ? 'From:' : 'To:'} {comm.phone_number}
                          </p>
                          {comm.content && (
                            <div className="mt-1 p-2 bg-muted rounded text-sm">
                              {comm.content}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {comm.type === 'call' && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {comm.direction === 'inbound' ? 'Incoming call from:' : 'Outgoing call to:'} {comm.phone_number}
                          </p>
                          {comm.duration && (
                            <p className="text-sm text-muted-foreground">Duration: {comm.duration}s</p>
                          )}
                          {comm.content && (
                            <div className="mt-1 p-2 bg-muted rounded text-sm">
                              Notes: {comm.content}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommunicationHistory(false)}>
              Close
            </Button>
            <Button onClick={() => fetchCommunicationHistory(selectedContactForHistory!)}>
              Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}