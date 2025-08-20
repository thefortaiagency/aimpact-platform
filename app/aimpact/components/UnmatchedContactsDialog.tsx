'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Mail, Phone, Calendar, MessageSquare, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface UnmatchedContact {
  id: string
  name: string
  email: string
  phone?: string
  domain: string
  isPersonalEmail: boolean
  communicationCount: number
  lastCommunication?: string
  suggestedOrganizations: Array<{ id: string; name: string }>
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignment?: () => void
}

export function UnmatchedContactsDialog({ open, onOpenChange, onAssignment }: Props) {
  const [contacts, setContacts] = useState<UnmatchedContact[]>([])
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Record<string, string>>({})
  const [newOrgName, setNewOrgName] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      fetchUnmatchedContacts()
      fetchOrganizations()
    }
  }, [open])

  const fetchUnmatchedContacts = async () => {
    try {
      const response = await fetch('/api/aimpact/contacts/unmatched')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Failed to fetch unmatched contacts:', error)
      toast.error('Failed to load unmatched contacts')
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/aimpact/organizations?limit=100')
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.organizations || [])
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    }
  }

  const assignToOrganization = async (contactId: string, organizationId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/aimpact/contacts/${contactId}/assign-organization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      })

      if (response.ok) {
        toast.success('Contact assigned to organization')
        setContacts(contacts.filter(c => c && c.id !== contactId))
        onAssignment?.()
      } else {
        toast.error('Failed to assign contact')
      }
    } catch (error) {
      console.error('Failed to assign contact:', error)
      toast.error('Failed to assign contact')
    } finally {
      setLoading(false)
    }
  }

  const createAndAssign = async (contactId: string, orgName: string) => {
    try {
      setLoading(true)
      const contact = contacts.find(c => c.id === contactId)
      const response = await fetch('/api/aimpact/organizations/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: orgName,
          domain: contact?.isPersonalEmail ? undefined : contact?.domain,
          contactId 
        })
      })

      if (response.ok) {
        toast.success('Organization created and contact assigned')
        setContacts(contacts.filter(c => c && c.id !== contactId))
        setNewOrgName({ ...newOrgName, [contactId]: '' })
        onAssignment?.()
      } else {
        toast.error('Failed to create organization')
      }
    } catch (error) {
      console.error('Failed to create organization:', error)
      toast.error('Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Unmatched Contacts</DialogTitle>
          <DialogDescription>
            Assign contacts with personal email addresses or no organization to the correct company.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              All contacts are properly matched to organizations!
            </div>
          ) : (
            (contacts || []).map((contact) => {
              if (!contact) return null;
              return (
              <div key={contact?.id || Math.random()} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{contact?.name || 'Unknown Contact'}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact?.email || ''}
                      </span>
                      {contact?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact?.phone || ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {contact?.isPersonalEmail && (
                        <Badge variant="secondary">Personal Email</Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {contact?.communicationCount || 0} communications
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Last: {formatDate(contact?.lastCommunication)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Assign to existing organization</Label>
                    <Select
                      value={selectedOrg[contact?.id] || ''}
                      onValueChange={(value) => setSelectedOrg({ ...selectedOrg, [contact?.id]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contact?.suggestedOrganizations?.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Suggested (same phone)
                            </div>
                            {(contact?.suggestedOrganizations || []).map((org) => (
                              <SelectItem key={`suggested-${org.id}`} value={org.id}>
                                <span className="flex items-center gap-2">
                                  <Building2 className="h-3 w-3" />
                                  {org?.name || 'Unknown'} ⭐
                                </span>
                              </SelectItem>
                            ))}
                            <div className="my-1 border-t" />
                          </>
                        )}
                        {organizations.map((org) => (
                          <SelectItem key={org?.id} value={org?.id}>
                            <span className="flex items-center gap-2">
                              <Building2 className="h-3 w-3" />
                              {org?.name || 'Unknown'}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    disabled={!selectedOrg[contact?.id] || loading}
                    onClick={() => assignToOrganization(contact?.id, selectedOrg[contact?.id])}
                  >
                    Assign
                  </Button>
                </div>

                <div className="flex items-end gap-2 pt-2 border-t">
                  <div className="flex-1">
                    <Label className="text-xs">Or create new organization</Label>
                    <Input
                      placeholder="New organization name..."
                      value={newOrgName[contact?.id] || ''}
                      onChange={(e) => setNewOrgName({ ...newOrgName, [contact?.id]: e.target.value })}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!newOrgName[contact?.id] || loading}
                    onClick={() => createAndAssign(contact?.id, newOrgName[contact?.id])}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create & Assign
                  </Button>
                </div>
              </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}