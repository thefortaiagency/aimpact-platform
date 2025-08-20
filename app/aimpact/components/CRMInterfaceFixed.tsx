'use client'

import { useState, useEffect } from 'react'
import { 
  Users, Search, Plus, Mail, Phone, MessageSquare, MoreVertical,
  UserPlus, Trash2, Edit, Building2, Calendar, Star, X
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import FloatingPhone from './FloatingPhone'
import FloatingSMSRedesigned from './FloatingSMSRedesigned'
import FloatingEmail from './FloatingEmail'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  position?: string
  organization_id?: string
  organization_name?: string
  is_favorite?: boolean
  last_contacted?: string
  created_at: string
  updated_at?: string
  notes?: string
}

interface Organization {
  id: string
  name: string
  domain?: string
  industry?: string
  size?: string
  phone?: string
  address?: string
  description?: string
  created_at: string
}

interface SMSConversation {
  phone_number: string
  contact_name?: string
  last_message?: string
  last_message_time?: string
  unread_count: number
}

export default function CRMInterfaceFixed() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [smsConversations, setSmsConversations] = useState<SMSConversation[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all')
  const [isLoading, setIsLoading] = useState(false)
  
  // Dialog states
  const [showNewContactDialog, setShowNewContactDialog] = useState(false)
  const [showEditContactDialog, setShowEditContactDialog] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null)
  
  // Floating window states
  const [showFloatingPhone, setShowFloatingPhone] = useState(false)
  const [showFloatingSMS, setShowFloatingSMS] = useState(false)
  const [showFloatingEmail, setShowFloatingEmail] = useState(false)
  const [floatingPhoneData, setFloatingPhoneData] = useState<{phoneNumber?: string, contactName?: string}>({})
  const [floatingSMSData, setFloatingSMSData] = useState<{phoneNumber?: string, contactName?: string}>({})
  const [floatingEmailData, setFloatingEmailData] = useState<{email?: string, contactName?: string}>({})

  // Form state
  const [contactForm, setContactForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    organization_id: '',
    notes: ''
  })

  useEffect(() => {
    fetchContacts()
    fetchOrganizations()
    fetchSMSConversations()
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchContacts()
      fetchSMSConversations()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      const data = await response.json()
      
      if (data.success && data.contacts) {
        setContacts(data.contacts)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast.error('Failed to load contacts')
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/aimpact/organizations')
      const data = await response.json()
      
      if (data.organizations) {
        setOrganizations(data.organizations)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
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

  const handleCreateContact = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success('Contact created successfully')
        setShowNewContactDialog(false)
        setContactForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          position: '',
          organization_id: '',
          notes: ''
        })
        fetchContacts()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create contact')
      }
    } catch (error) {
      console.error('Error creating contact:', error)
      toast.error('Failed to create contact')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateContact = async () => {
    if (!contactToEdit) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/contacts/${contactToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })
      
      if (response.ok) {
        toast.success('Contact updated successfully')
        setShowEditContactDialog(false)
        setContactToEdit(null)
        fetchContacts()
      } else {
        toast.error('Failed to update contact')
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
        setShowDeleteAlert(false)
        setContactToDelete(null)
        fetchContacts()
      } else {
        toast.error('Failed to delete contact')
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.error('Failed to delete contact')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFavorite = async (contact: Contact) => {
    try {
      const response = await fetch(`/api/contacts/${contact.id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !contact.is_favorite })
      })
      
      if (response.ok) {
        fetchContacts()
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const getContactName = (contact: Contact): string => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
    }
    return contact.email || 'Unknown Contact'
  }

  const getInitials = (contact: Contact): string => {
    const name = getContactName(contact)
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
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

  const filteredContacts = contacts.filter(contact => {
    // Filter by tab
    if (activeTab === 'favorites' && !contact.is_favorite) return false
    
    // Filter by search
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    const name = getContactName(contact).toLowerCase()
    const email = contact.email?.toLowerCase() || ''
    const phone = contact.phone || ''
    const org = contact.organization_name?.toLowerCase() || ''
    
    return name.includes(query) || email.includes(query) || phone.includes(query) || org.includes(query)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contacts</CardTitle>
              <CardDescription>Manage your contacts and communications</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={() => setShowNewContactDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            All Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="h-4 w-4 mr-2" />
            Favorites ({contacts.filter(c => c.is_favorite).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>SMS Activity</TableHead>
                      <TableHead>Last Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No contacts found matching your search' : 'No contacts yet. Add your first contact to get started.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((contact) => {
                        const smsInfo = getSMSInfo(contact.phone)
                        return (
                          <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(contact)
                                }}
                              >
                                <Star className={`h-4 w-4 ${contact.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{getInitials(contact)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{getContactName(contact)}</p>
                                  {contact.position && (
                                    <p className="text-sm text-muted-foreground">{contact.position}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{contact.email}</span>
                                {contact.email && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setFloatingEmailData({
                                        email: contact.email,
                                        contactName: getContactName(contact)
                                      })
                                      setShowFloatingEmail(true)
                                    }}
                                  >
                                    <Mail className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{contact.phone ? formatPhoneNumber(contact.phone) : '-'}</span>
                                {contact.phone && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFloatingPhoneData({
                                          phoneNumber: contact.phone,
                                          contactName: getContactName(contact)
                                        })
                                        setShowFloatingPhone(true)
                                      }}
                                    >
                                      <Phone className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFloatingSMSData({
                                          phoneNumber: contact.phone,
                                          contactName: getContactName(contact)
                                        })
                                        setShowFloatingSMS(true)
                                      }}
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {contact.organization_name || organizations.find(o => o.id === contact.organization_id)?.name || '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {smsInfo ? (
                                <div className="text-sm">
                                  {smsInfo.unread_count > 0 && (
                                    <Badge variant="default" className="mr-2">{smsInfo.unread_count} new</Badge>
                                  )}
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {smsInfo.last_message}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No SMS</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {contact.last_contacted ? new Date(contact.last_contacted).toLocaleDateString() : 'Never'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setContactToEdit(contact)
                                      setContactForm({
                                        first_name: contact.first_name,
                                        last_name: contact.last_name,
                                        email: contact.email,
                                        phone: contact.phone || '',
                                        position: contact.position || '',
                                        organization_id: contact.organization_id || '',
                                        notes: contact.notes || ''
                                      })
                                      setShowEditContactDialog(true)
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setContactToDelete(contact)
                                      setShowDeleteAlert(true)
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Contact Dialog */}
      <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>Create a new contact in your CRM</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={contactForm.first_name}
                  onChange={(e) => setContactForm({...contactForm, first_name: e.target.value})}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={contactForm.last_name}
                  onChange={(e) => setContactForm({...contactForm, last_name: e.target.value})}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={contactForm.phone}
                onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={contactForm.position}
                onChange={(e) => setContactForm({...contactForm, position: e.target.value})}
                placeholder="CEO"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={contactForm.notes}
                onChange={(e) => setContactForm({...contactForm, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContactDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateContact} disabled={isLoading || !contactForm.first_name}>
              {isLoading ? 'Creating...' : 'Create Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Label htmlFor="edit_first_name">First Name *</Label>
                <Input
                  id="edit_first_name"
                  value={contactForm.first_name}
                  onChange={(e) => setContactForm({...contactForm, first_name: e.target.value})}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input
                  id="edit_last_name"
                  value={contactForm.last_name}
                  onChange={(e) => setContactForm({...contactForm, last_name: e.target.value})}
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
            <Button onClick={handleUpdateContact} disabled={isLoading || !contactForm.first_name}>
              {isLoading ? 'Updating...' : 'Update Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {contactToDelete ? getContactName(contactToDelete) : 'this contact'} from your CRM.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Windows */}
      {showFloatingPhone && (
        <FloatingPhone
          isOpen={showFloatingPhone}
          onClose={() => setShowFloatingPhone(false)}
          initialPhoneNumber={floatingPhoneData.phoneNumber}
          contactName={floatingPhoneData.contactName}
        />
      )}
      
      {showFloatingSMS && (
        <FloatingSMSRedesigned
          isOpen={showFloatingSMS}
          onClose={() => setShowFloatingSMS(false)}
          initialPhoneNumber={floatingSMSData.phoneNumber}
          contactName={floatingSMSData.contactName}
        />
      )}
      
      {showFloatingEmail && (
        <FloatingEmail
          isOpen={showFloatingEmail}
          onClose={() => setShowFloatingEmail(false)}
          initialEmail={floatingEmailData.email}
          contactName={floatingEmailData.contactName}
        />
      )}
    </div>
  )
}